import { describe, it, expect } from 'vitest'
import { aggregate } from '@/lib/services/stats-queries'

type Booking = Parameters<typeof aggregate>[0][number]
type SmsSend = Parameters<typeof aggregate>[1][number]
type SmsReply = Parameters<typeof aggregate>[2][number]

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: overrides.id ?? 'b1',
    status: overrides.status ?? 'pending',
    service: overrides.service ?? 'soir',
    party_size: overrides.party_size ?? 2,
    sms_sent_at: overrides.sms_sent_at ?? null,
    reminder_sent_at: overrides.reminder_sent_at ?? null,
    relance_sent_at: overrides.relance_sent_at ?? null,
    booking_date: overrides.booking_date ?? '2026-04-15',
  }
}

const OPTS = { from: '2026-04-01', to: '2026-04-30', baselineNoshowRate: 0.2 }

describe('aggregate', () => {
  it('returns zeros for empty inputs', () => {
    const s = aggregate([], [], [], OPTS)
    expect(s.volume.bookings_total).toBe(0)
    expect(s.volume.sms_sent_total).toBe(0)
    expect(s.volume.covers_total).toBe(0)
    expect(s.engagement.reply_rate).toBe(0)
    expect(s.engagement.avg_reply_delay_minutes).toBeNull()
    expect(s.confirmations.confirmed_rate).toBe(0)
    expect(s.covers.covers_secured_rate).toBe(0)
    expect(s.sms_quality.delivery_rate).toBe(0)
    expect(s.avant_apres.actual_noshow_rate).toBe(0)
    expect(s.avant_apres.estimated_covers_recovered).toBe(0)
  })

  it('counts bookings and covers correctly', () => {
    const bookings = [
      booking({ id: '1', status: 'confirmed', party_size: 2 }),
      booking({ id: '2', status: 'confirmed', party_size: 4 }),
      booking({ id: '3', status: 'cancelled', party_size: 3 }),
      booking({ id: '4', status: 'pending', party_size: 2 }),
    ]
    const s = aggregate(bookings, [], [], OPTS)
    expect(s.volume.bookings_total).toBe(4)
    expect(s.volume.covers_total).toBe(11)
    expect(s.covers.confirmed_covers).toBe(6)
    expect(s.confirmations.confirmed_count).toBe(2)
    expect(s.confirmations.confirmed_rate).toBe(0.5)
    expect(s.confirmations.cancelled_count).toBe(1)
    expect(s.confirmations.pending_count).toBe(1)
  })

  it('computes reply rate based on bookings with SMS sent', () => {
    const bookings = [
      booking({ id: '1', sms_sent_at: '2026-04-14T18:00:00Z', status: 'confirmed' }),
      booking({ id: '2', sms_sent_at: '2026-04-14T18:00:00Z', status: 'sms_sent' }),
      booking({ id: '3', status: 'pending' }),
    ]
    const replies: SmsReply[] = [
      { booking_id: '1', received_at: '2026-04-14T18:30:00Z', interpretation: 'oui' },
    ]
    const s = aggregate(bookings, [], replies, OPTS)
    expect(s.engagement.reply_rate).toBeCloseTo(0.5, 5)
  })

  it('computes avg reply delay in minutes', () => {
    const bookings = [
      booking({ id: '1', sms_sent_at: '2026-04-14T18:00:00Z' }),
      booking({ id: '2', sms_sent_at: '2026-04-14T18:00:00Z' }),
    ]
    const replies: SmsReply[] = [
      { booking_id: '1', received_at: '2026-04-14T18:30:00Z', interpretation: 'oui' }, // 30 min
      { booking_id: '2', received_at: '2026-04-14T19:00:00Z', interpretation: 'oui' }, // 60 min
    ]
    const s = aggregate(bookings, [], replies, OPTS)
    expect(s.engagement.avg_reply_delay_minutes).toBe(45)
  })

  it('counts replies after relance', () => {
    const bookings = [
      booking({
        id: '1',
        sms_sent_at: '2026-04-14T08:00:00Z',
        relance_sent_at: '2026-04-14T16:00:00Z',
      }),
      booking({
        id: '2',
        sms_sent_at: '2026-04-14T08:00:00Z',
        relance_sent_at: '2026-04-14T16:00:00Z',
      }),
    ]
    const replies: SmsReply[] = [
      { booking_id: '1', received_at: '2026-04-14T16:15:00Z', interpretation: 'oui' }, // after relance
      { booking_id: '2', received_at: '2026-04-14T10:00:00Z', interpretation: 'oui' }, // before relance
    ]
    const s = aggregate(bookings, [], replies, OPTS)
    expect(s.engagement.replies_after_relance).toBe(1)
    expect(s.relance_efficacy.replies_triggered_by_relance).toBe(1)
    expect(s.relance_efficacy.relance_sent_count).toBe(2)
    expect(s.relance_efficacy.relance_reply_rate).toBe(0.5)
  })

  it('computes SMS delivery rate', () => {
    const sends: SmsSend[] = [
      { status: 'sent', delivery_status: 'DELIVERED' },
      { status: 'sent', delivery_status: 'DELIVERED' },
      { status: 'sent', delivery_status: 'NOT_DELIVERED' },
      { status: 'sent', delivery_status: 'BAD_DESTINATION' },
    ]
    const s = aggregate([], sends, [], OPTS)
    expect(s.sms_quality.delivery_rate).toBe(0.5)
    expect(s.volume.sms_sent_total).toBe(4)
  })

  it('estimates covers recovered based on baseline', () => {
    const bookings = [
      booking({ id: '1', status: 'confirmed', party_size: 10 }),
      booking({ id: '2', status: 'confirmed', party_size: 10 }),
      booking({ id: '3', status: 'confirmed', party_size: 10 }),
      booking({ id: '4', status: 'confirmed', party_size: 10 }),
      booking({ id: '5', status: 'sms_sent', party_size: 10 }),
    ]
    // total covers 50, actual noshow rate = 1/5 = 0.2, baseline = 0.2
    // recovery delta = max(0, 0.2 - 0.2) = 0
    let s = aggregate(bookings, [], [], { ...OPTS, baselineNoshowRate: 0.2 })
    expect(s.avant_apres.estimated_covers_recovered).toBe(0)

    // with higher baseline (0.3) → delta 0.1 × 50 = 5
    s = aggregate(bookings, [], [], { ...OPTS, baselineNoshowRate: 0.3 })
    expect(s.avant_apres.estimated_covers_recovered).toBe(5)
  })

  it('excludes cancelled bookings from actual_noshow_rate', () => {
    // cancelled = explicit cancellation, not a no-show
    const bookings = [
      booking({ id: '1', status: 'confirmed', party_size: 2 }),
      booking({ id: '2', status: 'cancelled', party_size: 2 }),
      booking({ id: '3', status: 'cancelled', party_size: 2 }),
    ]
    const s = aggregate(bookings, [], [], OPTS)
    expect(s.avant_apres.actual_noshow_rate).toBe(0)
  })

  it('includes sms_sent, sms_delivered and send_failed in actual_noshow_rate', () => {
    const bookings = [
      booking({ id: '1', status: 'confirmed' }),
      booking({ id: '2', status: 'sms_sent' }),
      booking({ id: '3', status: 'sms_delivered' }),
      booking({ id: '4', status: 'send_failed' }),
    ]
    const s = aggregate(bookings, [], [], OPTS)
    expect(s.avant_apres.actual_noshow_rate).toBe(0.75)
    expect(s.confirmations.no_response_count).toBe(2)
    expect(s.sms_quality.send_failed).toBe(1)
  })

  it('counts invalid_number bookings in sms_quality', () => {
    const bookings = [
      booking({ id: '1', status: 'invalid_number' }),
      booking({ id: '2', status: 'invalid_number' }),
      booking({ id: '3', status: 'confirmed' }),
    ]
    const s = aggregate(bookings, [], [], OPTS)
    expect(s.sms_quality.invalid_numbers).toBe(2)
  })

  it('counts delivered status in sms_sent_total', () => {
    const sends: SmsSend[] = [
      { status: 'sent', delivery_status: null },
      { status: 'delivered', delivery_status: 'DELIVERED' },
      { status: 'pending', delivery_status: null },
    ]
    const s = aggregate([], sends, [], OPTS)
    expect(s.volume.sms_sent_total).toBe(2)
  })

  it('groups by day of week', () => {
    // 2026-04-13 is a Monday (day 1), 2026-04-18 is Saturday (day 6)
    const bookings = [
      booking({ id: '1', booking_date: '2026-04-13', status: 'confirmed', party_size: 2 }),
      booking({ id: '2', booking_date: '2026-04-13', status: 'confirmed', party_size: 3 }),
      booking({ id: '3', booking_date: '2026-04-18', status: 'pending', party_size: 4 }),
    ]
    const s = aggregate(bookings, [], [], OPTS)
    expect(s.by_day_of_week).toHaveLength(7)
    expect(s.by_day_of_week[1]).toEqual({ day: 1, bookings: 2, covers: 5, confirmed: 2 })
    expect(s.by_day_of_week[6]).toEqual({ day: 6, bookings: 1, covers: 4, confirmed: 0 })
    expect(s.by_day_of_week[0]).toEqual({ day: 0, bookings: 0, covers: 0, confirmed: 0 })
  })

  it('with_status_before_service_rate excludes untouched pending', () => {
    const bookings = [
      booking({ id: '1', status: 'confirmed' }),
      booking({ id: '2', status: 'sms_sent', sms_sent_at: '2026-04-14T08:00:00Z' }),
      booking({ id: '3', status: 'pending', sms_sent_at: '2026-04-14T08:00:00Z' }),
      booking({ id: '4', status: 'pending' }),
    ]
    const s = aggregate(bookings, [], [], OPTS)
    expect(s.confirmations.with_status_before_service_rate).toBe(0.75)
  })

  it('counts ambiguous replies', () => {
    const replies: SmsReply[] = [
      { booking_id: '1', received_at: '2026-04-14T18:00:00Z', interpretation: 'oui' },
      { booking_id: '2', received_at: '2026-04-14T18:00:00Z', interpretation: 'unknown' },
      { booking_id: '3', received_at: '2026-04-14T18:00:00Z', interpretation: 'unknown' },
      { booking_id: '4', received_at: '2026-04-14T18:00:00Z', interpretation: 'non' },
    ]
    const s = aggregate([], [], replies, OPTS)
    expect(s.engagement.ambiguous_reply_rate).toBe(0.5)
  })
})
