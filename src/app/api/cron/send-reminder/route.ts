import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSMSToBookings } from '@/lib/services/sms-sender'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const today = new Date().toISOString().split('T')[0]

  // Target today's bookings that haven't received the Jour J reminder yet
  const { data: bookings, error: bookError } = await supabase
    .from('bookings')
    .select('*, restaurants!inner(id, name, sms_template, sms_template_jj, sms_template_relance)')
    .eq('booking_date', today)
    .in('status', ['pending', 'sms_sent', 'sms_delivered'])
    .is('reminder_sent_at', null)

  if (bookError) {
    console.error('Cron send-reminder error:', bookError)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    )
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({
      restaurants_processed: 0,
      total_sent: 0,
      total_failed: 0,
      total_skipped: 0,
    })
  }

  // Group by restaurant
  const byRestaurant = new Map<
    string,
    { restaurant: { id: string; name: string; sms_template: string; sms_template_jj: string; sms_template_relance: string }; bookings: typeof bookings }
  >()

  for (const booking of bookings) {
    const rest = booking.restaurants as unknown as { id: string; name: string; sms_template: string; sms_template_jj: string; sms_template_relance: string }
    if (!byRestaurant.has(rest.id)) {
      byRestaurant.set(rest.id, { restaurant: rest, bookings: [] })
    }
    byRestaurant.get(rest.id)!.bookings.push(booking)
  }

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const [, { restaurant, bookings: restBookings }] of byRestaurant) {
    const result = await sendSMSToBookings(restBookings, restaurant, {
      createSmsSend: async (data) => {
        await supabase.from('sms_sends').insert(data)
      },
      updateBooking: async (id, data) => {
        await supabase.from('bookings').update(data).eq('id', id)
      },
    }, { smsType: 'rappel_jj' })

    totalSent += result.sent
    totalFailed += result.failed
    totalSkipped += result.skipped
  }

  return NextResponse.json({
    restaurants_processed: byRestaurant.size,
    total_sent: totalSent,
    total_failed: totalFailed,
    total_skipped: totalSkipped,
  })
}
