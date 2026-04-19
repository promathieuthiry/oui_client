import type { SupabaseClient } from '@supabase/supabase-js'
import type { Service } from '@/lib/constants'

export const DEFAULT_BASELINE_NOSHOW_RATE = 0.2

export interface StatsResponse {
  period: { from: string | null; to: string | null }
  volume: {
    bookings_total: number
    sms_sent_total: number
    covers_total: number
  }
  engagement: {
    reply_rate: number
    avg_reply_delay_minutes: number | null
    replies_after_relance: number
    ambiguous_reply_rate: number
  }
  confirmations: {
    confirmed_count: number
    confirmed_rate: number
    cancelled_count: number
    pending_count: number
    no_response_count: number
    with_status_before_service_rate: number
  }
  covers: {
    confirmed_covers: number
    total_covers: number
    covers_secured_rate: number
  }
  sms_quality: {
    delivery_rate: number
    invalid_numbers: number
    send_failed: number
  }
  relance_efficacy: {
    relance_sent_count: number
    replies_triggered_by_relance: number
    relance_reply_rate: number
  }
  avant_apres: {
    baseline_noshow_rate: number
    actual_noshow_rate: number
    estimated_covers_recovered: number
  }
  by_day_of_week: Array<{
    day: number
    bookings: number
    covers: number
    confirmed: number
  }>
}

interface BookingRow {
  id: string
  status: string
  service: Service
  party_size: number
  sms_sent_at: string | null
  reminder_sent_at: string | null
  relance_sent_at: string | null
  booking_date: string
}

interface SmsSendRow {
  status: string
  delivery_status: string | null
}

interface SmsReplyRow {
  booking_id: string
  received_at: string
  interpretation: string
}

const PAGE_SIZE = 1000

async function fetchAllRows<T>(
  build: (start: number, end: number) => Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const all: T[] = []
  let start = 0
  while (true) {
    const { data, error } = await build(start, start + PAGE_SIZE - 1)
    if (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error)
      throw new Error(`Supabase pagination failed at offset ${start}: ${msg}`)
    }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    start += PAGE_SIZE
  }
  return all
}

function applyDateRange<T>(
  query: T,
  from: string | null,
  to: string | null,
  column = 'booking_date'
): T {
  const q = query as unknown as {
    gte: (c: string, v: string) => T
    lte: (c: string, v: string) => T
  }
  let next = query
  if (from) next = q.gte(column, from)
  if (to) next = (next as unknown as typeof q).lte(column, to)
  return next
}

export interface StatsQueryOptions {
  restaurantId: string
  from: string | null
  to: string | null
  baselineNoshowRate?: number
}

export async function computeStats(
  supabase: SupabaseClient,
  opts: StatsQueryOptions
): Promise<StatsResponse> {
  const { restaurantId, from, to } = opts
  const baselineNoshowRate = opts.baselineNoshowRate ?? DEFAULT_BASELINE_NOSHOW_RATE

  const bookings = await fetchAllRows<BookingRow>((start, end) => {
    let q = supabase
      .from('bookings')
      .select(
        'id, status, service, party_size, sms_sent_at, reminder_sent_at, relance_sent_at, booking_date'
      )
      .eq('restaurant_id', restaurantId)
    q = applyDateRange(q, from, to) as typeof q
    return q.range(start, end) as unknown as Promise<{
      data: BookingRow[] | null
      error: unknown
    }>
  })

  const bookingIds = bookings.map((b) => b.id)

  const smsSends = bookingIds.length
    ? await fetchAllRows<SmsSendRow>((start, end) =>
        supabase
          .from('sms_sends')
          .select('status, delivery_status')
          .in('booking_id', bookingIds)
          .range(start, end) as unknown as Promise<{
          data: SmsSendRow[] | null
          error: unknown
        }>
      )
    : []

  const smsReplies = bookingIds.length
    ? await fetchAllRows<SmsReplyRow>((start, end) =>
        supabase
          .from('sms_replies')
          .select('booking_id, received_at, interpretation')
          .in('booking_id', bookingIds)
          .range(start, end) as unknown as Promise<{
          data: SmsReplyRow[] | null
          error: unknown
        }>
      )
    : []

  return aggregate(bookings, smsSends, smsReplies, { from, to, baselineNoshowRate })
}

interface AggregateOptions {
  from: string | null
  to: string | null
  baselineNoshowRate: number
}

export function aggregate(
  bookings: BookingRow[],
  smsSends: SmsSendRow[],
  smsReplies: SmsReplyRow[],
  opts: AggregateOptions
): StatsResponse {
  const total = bookings.length
  const bookingsById = new Map(bookings.map((b) => [b.id, b]))

  // --- Volume ---
  const smsSentTotal = smsSends.filter((s) => s.status === 'sent' || s.status === 'delivered')
    .length
  const coversTotal = sum(bookings, (b) => b.party_size)

  // --- Status counts ---
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length
  const pendingCount = bookings.filter((b) => b.status === 'pending').length
  const noResponseCount = bookings.filter(
    (b) => b.status === 'sms_sent' || b.status === 'sms_delivered'
  ).length
  const invalidNumberCount = bookings.filter((b) => b.status === 'invalid_number').length
  const sendFailedCount = bookings.filter((b) => b.status === 'send_failed').length

  // "avant service" = toute booking qui n'est pas restée 'pending' intouchée
  const withStatusBeforeServiceCount = bookings.filter(
    (b) => b.status !== 'pending' || b.sms_sent_at !== null
  ).length

  // --- Engagement ---
  const bookingsWithSms = bookings.filter(
    (b) => b.sms_sent_at !== null || b.reminder_sent_at !== null || b.relance_sent_at !== null
  )
  const repliedBookingIds = new Set(smsReplies.map((r) => r.booking_id))
  const repliedCount = bookingsWithSms.filter((b) => repliedBookingIds.has(b.id)).length
  const replyRate = bookingsWithSms.length > 0 ? repliedCount / bookingsWithSms.length : 0

  const avgReplyDelayMinutes = computeAvgReplyDelay(smsReplies, bookingsById)

  const repliesAfterRelance = smsReplies.filter((r) => {
    const b = bookingsById.get(r.booking_id)
    if (!b || !b.relance_sent_at) return false
    return new Date(r.received_at).getTime() > new Date(b.relance_sent_at).getTime()
  }).length

  const ambiguousReplies = smsReplies.filter((r) => r.interpretation === 'unknown').length
  const ambiguousReplyRate = smsReplies.length > 0 ? ambiguousReplies / smsReplies.length : 0

  // --- Covers ---
  const confirmedCovers = sum(
    bookings.filter((b) => b.status === 'confirmed'),
    (b) => b.party_size
  )
  const coversSecuredRate = coversTotal > 0 ? confirmedCovers / coversTotal : 0

  // --- SMS quality ---
  const delivered = smsSends.filter((s) => s.delivery_status === 'DELIVERED').length
  const totalSmsAttempts = smsSends.length
  const deliveryRate = totalSmsAttempts > 0 ? delivered / totalSmsAttempts : 0

  // --- Relance efficacy ---
  const relanceSentCount = bookings.filter((b) => b.relance_sent_at !== null).length
  const relanceReplyRate =
    relanceSentCount > 0 ? repliesAfterRelance / relanceSentCount : 0

  // --- Avant / Après ---
  // No-show = booking où le client ne s'est pas manifesté (pas confirmé, pas annulé).
  // `cancelled` est une annulation explicite, pas un no-show.
  const actualNoshowRate =
    total > 0 ? (noResponseCount + sendFailedCount) / total : 0
  const recoveryDelta = Math.max(0, opts.baselineNoshowRate - actualNoshowRate)
  const estimatedCoversRecovered = Math.round(coversTotal * recoveryDelta)

  // --- By day of week (0=dim, 6=sam) ---
  const byDayMap = new Map<number, { bookings: number; covers: number; confirmed: number }>()
  for (let i = 0; i < 7; i++) {
    byDayMap.set(i, { bookings: 0, covers: 0, confirmed: 0 })
  }
  for (const b of bookings) {
    const dow = dayOfWeek(b.booking_date)
    const entry = byDayMap.get(dow)!
    entry.bookings += 1
    entry.covers += b.party_size
    if (b.status === 'confirmed') entry.confirmed += 1
  }
  const byDayOfWeek = Array.from(byDayMap.entries())
    .map(([day, v]) => ({ day, ...v }))
    .sort((a, b) => a.day - b.day)

  return {
    period: { from: opts.from, to: opts.to },
    volume: {
      bookings_total: total,
      sms_sent_total: smsSentTotal,
      covers_total: coversTotal,
    },
    engagement: {
      reply_rate: replyRate,
      avg_reply_delay_minutes: avgReplyDelayMinutes,
      replies_after_relance: repliesAfterRelance,
      ambiguous_reply_rate: ambiguousReplyRate,
    },
    confirmations: {
      confirmed_count: confirmedCount,
      confirmed_rate: total > 0 ? confirmedCount / total : 0,
      cancelled_count: cancelledCount,
      pending_count: pendingCount,
      no_response_count: noResponseCount,
      with_status_before_service_rate:
        total > 0 ? withStatusBeforeServiceCount / total : 0,
    },
    covers: {
      confirmed_covers: confirmedCovers,
      total_covers: coversTotal,
      covers_secured_rate: coversSecuredRate,
    },
    sms_quality: {
      delivery_rate: deliveryRate,
      invalid_numbers: invalidNumberCount,
      send_failed: sendFailedCount,
    },
    relance_efficacy: {
      relance_sent_count: relanceSentCount,
      replies_triggered_by_relance: repliesAfterRelance,
      relance_reply_rate: relanceReplyRate,
    },
    avant_apres: {
      baseline_noshow_rate: opts.baselineNoshowRate,
      actual_noshow_rate: actualNoshowRate,
      estimated_covers_recovered: estimatedCoversRecovered,
    },
    by_day_of_week: byDayOfWeek,
  }
}

function sum<T>(items: T[], get: (item: T) => number): number {
  let total = 0
  for (const item of items) total += get(item)
  return total
}

function computeAvgReplyDelay(
  replies: SmsReplyRow[],
  bookingsById: Map<string, BookingRow>
): number | null {
  const deltas: number[] = []
  for (const r of replies) {
    const b = bookingsById.get(r.booking_id)
    if (!b) continue
    const sentAt = b.sms_sent_at || b.reminder_sent_at || b.relance_sent_at
    if (!sentAt) continue
    const delta = new Date(r.received_at).getTime() - new Date(sentAt).getTime()
    if (delta > 0) deltas.push(delta)
  }
  if (deltas.length === 0) return null
  const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length
  return Math.round(avgMs / 60000)
}

function dayOfWeek(isoDate: string): number {
  // isoDate: YYYY-MM-DD — treat as local date
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
