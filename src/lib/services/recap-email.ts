import { Resend } from 'resend'
import { RecapEmail } from '@/emails/recap-email'

interface Restaurant {
  id: string
  name: string
  email: string
}

interface RecapBooking {
  id: string
  guest_name: string
  booking_time: string
  party_size: number
  status: string
}

interface RecapResult {
  recap_id?: string
  email_status: 'sent' | 'failed'
  booking_count: number
  resend_id?: string
  error?: string
}

interface DBCallbacks {
  createRecap: (data: {
    restaurant_id: string
    service_date: string
    booking_count: number
    email_status: string
    resend_id: string | null
    sent_at: string | null
  }) => Promise<void>
}

export async function sendRecapEmail(
  restaurant: Restaurant,
  serviceDate: string,
  bookings: RecapBooking[],
  db: DBCallbacks,
  serviceLabel?: string
): Promise<RecapResult> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'OuiClient <noreply@ouiclient.com>',
      to: restaurant.email,
      subject: serviceLabel
        ? `Récapitulatif ${serviceLabel} réservations — ${restaurant.name} — ${serviceDate}`
        : `Récapitulatif réservations — ${restaurant.name} — ${serviceDate}`,
      react: RecapEmail({
        restaurantName: restaurant.name,
        serviceDate,
        bookings,
        serviceLabel,
      }),
    })

    if (error) {
      await db.createRecap({
        restaurant_id: restaurant.id,
        service_date: serviceDate,
        booking_count: bookings.length,
        email_status: 'failed',
        resend_id: null,
        sent_at: null,
      })

      return {
        email_status: 'failed',
        booking_count: bookings.length,
        error: error.message,
      }
    }

    const now = new Date().toISOString()

    await db.createRecap({
      restaurant_id: restaurant.id,
      service_date: serviceDate,
      booking_count: bookings.length,
      email_status: 'sent',
      resend_id: data?.id || null,
      sent_at: now,
    })

    return {
      email_status: 'sent',
      booking_count: bookings.length,
      resend_id: data?.id,
    }
  } catch (error) {
    await db.createRecap({
      restaurant_id: restaurant.id,
      service_date: serviceDate,
      booking_count: bookings.length,
      email_status: 'failed',
      resend_id: null,
      sent_at: null,
    })

    return {
      email_status: 'failed',
      booking_count: bookings.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
