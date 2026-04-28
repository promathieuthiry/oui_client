import { sendSMS } from '@/lib/services/octopush'
import { maskPhone } from '@/lib/utils/phone'
import { formatDateFr } from '@/lib/utils/date'
import type { Service } from '@/lib/constants'

interface Booking {
  id: string
  phone: string
  guest_name: string
  booking_date: string
  booking_time: string
  party_size: number
  status: string
  sms_sent_at: string | null
  reminder_sent_at: string | null
  relance_sent_at: string | null
  service: Service
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
    data: {
      sms_sent_at?: string
      reminder_sent_at?: string
      relance_sent_at?: string
      status?: string
    }
  ) => Promise<void>
}

interface SendOptions {
  smsType?: 'rappel_j1' | 'rappel_jj' | 'relance'
  customMessage?: string
}

export function formatTemplate(
  template: string,
  booking: Pick<Booking, 'booking_date' | 'booking_time' | 'party_size' | 'guest_name'>,
  restaurant: Pick<Restaurant, 'name'>
): string {
  return template
    .replace(/\{restaurant\}/g, restaurant.name)
    .replace(/\{nom\}/g, booking.guest_name)
    .replace(/\{date\}/g, formatDateFr(booking.booking_date))
    .replace(/\{heure\}/g, booking.booking_time.slice(0, 5))
    .replace(/\{couverts\}/g, String(booking.party_size))
    .replace(/\{personnes\}/g, booking.party_size === 1 ? 'personne' : 'personnes')
}

export async function sendSMSToBookings(
  bookings: Booking[],
  restaurant: Restaurant,
  db: DBCallbacks,
  options: SendOptions = {}
): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, skipped: 0, details: [] }
  const { smsType, customMessage } = options

  for (const booking of bookings) {
    // Idempotency checks based on SMS type
    let shouldSkip = false
    let skipReason = ''

    if (smsType === 'rappel_j1' && booking.sms_sent_at) {
      shouldSkip = true
      skipReason = 'Rappel J-1 already sent'
    } else if (smsType === 'rappel_jj' && booking.reminder_sent_at) {
      shouldSkip = true
      skipReason = 'Rappel Jour J already sent'
    } else if (smsType === 'relance' && booking.relance_sent_at) {
      shouldSkip = true
      skipReason = 'Relance already sent'
    } else if (!smsType && (booking.sms_sent_at || booking.reminder_sent_at || booking.relance_sent_at)) {
      // Fallback for backward compatibility - skip if ANY SMS has been sent
      shouldSkip = true
      skipReason = 'Already sent'
    }

    if (shouldSkip) {
      result.skipped++
      result.details.push({
        booking_id: booking.id,
        status: 'skipped',
        reason: skipReason,
      })
      continue
    }

    // Use custom message if provided, otherwise select template based on SMS type
    let selectedTemplate: string
    if (customMessage) {
      selectedTemplate = customMessage
    } else if (smsType === 'rappel_jj') {
      selectedTemplate = restaurant.sms_template_jj
    } else if (smsType === 'relance') {
      selectedTemplate = restaurant.sms_template_relance
    } else {
      selectedTemplate = restaurant.sms_template
    }

    const message = formatTemplate(
      selectedTemplate,
      booking,
      restaurant
    )

    try {
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
        const updateData: {
          sms_sent_at?: string
          reminder_sent_at?: string
          relance_sent_at?: string
          status?: string
        } = {
          status: smsType === 'relance' ? 'relance_sent' : 'sms_sent'
        }

        // Update the correct timestamp field based on SMS type
        if (smsType === 'rappel_j1' || !smsType) {
          updateData.sms_sent_at = now
        } else if (smsType === 'rappel_jj') {
          updateData.reminder_sent_at = now
        } else if (smsType === 'relance') {
          updateData.relance_sent_at = now
        }

        await db.updateBooking(booking.id, updateData)
        result.sent++
        result.details.push({ booking_id: booking.id, status: 'sent' })

        const smsTypeLabel = smsType ? `(${smsType}) ` : ''
        console.log(
          `SMS ${smsTypeLabel}sent to ${maskPhone(booking.phone)} for booking ${booking.id}\n→ ${message}`
        )
      } else {
        await db.updateBooking(booking.id, { status: 'send_failed' })
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
    } catch (error) {
      result.failed++
      result.details.push({
        booking_id: booking.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unexpected error',
      })
      console.error(
        `SMS processing error for booking ${booking.id} (${maskPhone(booking.phone)}):`, error
      )
    }
  }

  return result
}
