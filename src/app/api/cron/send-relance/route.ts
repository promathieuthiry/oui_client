import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/services/octopush'
import { formatTemplate } from '@/lib/services/sms-sender'
import { maskPhone } from '@/lib/utils/phone'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const today = new Date().toISOString().split('T')[0]

  // Target today's bookings that got an SMS but never replied, and haven't been relanced yet
  const { data: bookings, error: bookError } = await supabase
    .from('bookings')
    .select('*, restaurants!inner(id, name, sms_template_relance)')
    .eq('booking_date', today)
    .eq('status', 'sms_sent')
    .is('relance_sent_at', null)

  if (bookError) {
    console.error('Cron send-relance error:', bookError)
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
      sms_template_relance: string
    }
    const message = formatTemplate(restaurant.sms_template_relance, booking, restaurant)

    const smsResult = await sendSMS(booking.phone, message)

    if (smsResult.success) {
      await supabase
        .from('bookings')
        .update({ relance_sent_at: new Date().toISOString() })
        .eq('id', booking.id)

      totalSent++
      console.log(`Relance SMS sent to ${maskPhone(booking.phone)} for booking ${booking.id}`)
    } else {
      totalFailed++
      console.error(`Relance SMS failed for ${maskPhone(booking.phone)}: ${smsResult.error}`)
    }
  }

  return NextResponse.json({ total_sent: totalSent, total_failed: totalFailed })
}
