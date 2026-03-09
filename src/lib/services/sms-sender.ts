import { sendSMS } from '@/lib/services/octopush'
import { maskPhone } from '@/lib/utils/phone'

interface Booking {
  id: string
  phone: string
  guest_name: string
  booking_date: string
  booking_time: string
  party_size: number
  status: string
  sms_sent_at: string | null
}

interface Restaurant {
  id: string
  name: string
  sms_template: string
  sms_template_jj: string
  sms_template_relance: string
}

interface SendDetail {
  booking_id: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
  reason?: string
}

interface SendResult {
  sent: number
  failed: number
  skipped: number
  details: SendDetail[]
}

interface DBCallbacks {
  createSmsSend: (data: {
    booking_id: string
    octopush_ticket: string | null
    status: string
    attempts: number
    last_attempt_at: string
    error_message: string | null
  }) => Promise<void>
  updateBooking: (
    id: string,
    data: { sms_sent_at?: string; status?: string }
  ) => Promise<void>
}

const STOP_MENTION = 'STOP au 30101'

export function formatTemplate(
  template: string,
  booking: Booking,
  restaurant: Restaurant
): string {
  let message = template
    .replace(/\{restaurant\}/g, restaurant.name)
    .replace(/\{date\}/g, booking.booking_date)
    .replace(/\{heure\}/g, booking.booking_time)
    .replace(/\{couverts\}/g, String(booking.party_size))

  if (!message.includes('STOP')) {
    message += `\n${STOP_MENTION}`
  }

  return message
}

export async function sendSMSToBookings(
  bookings: Booking[],
  restaurant: Restaurant,
  db: DBCallbacks
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, skipped: 0, details: [] }

  for (const booking of bookings) {
    // Idempotency: skip if already sent
    if (booking.sms_sent_at) {
      result.skipped++
      result.details.push({
        booking_id: booking.id,
        status: 'skipped',
        reason: 'Already sent',
      })
      continue
    }

    const message = formatTemplate(
      restaurant.sms_template,
      booking,
      restaurant
    )

    const smsResult = await sendSMS(booking.phone, message)

    const now = new Date().toISOString()

    await db.createSmsSend({
      booking_id: booking.id,
      octopush_ticket: smsResult.ticket || null,
      status: smsResult.success ? 'sent' : 'failed',
      attempts: 1,
      last_attempt_at: now,
      error_message: smsResult.error || null,
    })

    if (smsResult.success) {
      await db.updateBooking(booking.id, { sms_sent_at: now })
      result.sent++
      result.details.push({ booking_id: booking.id, status: 'sent' })
      console.log(
        `SMS sent to ${maskPhone(booking.phone)} for booking ${booking.id}\n→ ${message}`
      )
    } else {
      result.failed++
      result.details.push({
        booking_id: booking.id,
        status: 'failed',
        error: smsResult.error,
      })
      console.error(
        `SMS failed for ${maskPhone(booking.phone)}: ${smsResult.error}`
      )
    }
  }

  return result
}
