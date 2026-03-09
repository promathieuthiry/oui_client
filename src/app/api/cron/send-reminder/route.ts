import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/services/octopush'
import { maskPhone } from '@/lib/utils/phone'

export const dynamic = 'force-dynamic'

const STOP_MENTION = 'STOP au 30101'

function formatTemplate(
  template: string,
  booking: { booking_time: string; party_size: number; booking_date: string },
  restaurantName: string
): string {
  let message = template
    .replace(/\{restaurant\}/g, restaurantName)
    .replace(/\{date\}/g, booking.booking_date)
    .replace(/\{heure\}/g, booking.booking_time)
    .replace(/\{couverts\}/g, String(booking.party_size))

  if (!message.includes('STOP')) {
    message += `\n${STOP_MENTION}`
  }

  return message
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: bookings, error: bookError } = await supabase
    .from('bookings')
    .select('*, restaurants!inner(id, name, sms_template_jj)')
    .eq('booking_date', today)
    .in('status', ['pending', 'sms_sent'])
    .is('reminder_sent_at', null)

  if (bookError) {
    console.error('Cron send-reminder error:', bookError)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    )
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ total_sent: 0, total_failed: 0 })
  }

  let totalSent = 0
  let totalFailed = 0

  for (const booking of bookings) {
    const restaurant = booking.restaurants as unknown as {
      id: string
      name: string
      sms_template_jj: string
    }
    const message = formatTemplate(restaurant.sms_template_jj, booking, restaurant.name)

    const smsResult = await sendSMS(booking.phone, message)

    if (smsResult.success) {
      await supabase
        .from('bookings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id)

      totalSent++
      console.log(`Reminder SMS sent to ${maskPhone(booking.phone)} for booking ${booking.id}`)
    } else {
      totalFailed++
      console.error(`Reminder SMS failed for ${maskPhone(booking.phone)}: ${smsResult.error}`)
    }
  }

  return NextResponse.json({ total_sent: totalSent, total_failed: totalFailed })
}
