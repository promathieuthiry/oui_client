import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMSToBookings } from '@/lib/services/sms-sender'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { restaurant_id, booking_date } = body

  if (!restaurant_id || !booking_date) {
    return NextResponse.json(
      { error: 'restaurant_id et booking_date sont requis' },
      { status: 400 }
    )
  }

  // Get restaurant
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, sms_template')
    .eq('id', restaurant_id)
    .single()

  if (restError || !restaurant) {
    return NextResponse.json(
      { error: 'Restaurant non trouvé' },
      { status: 404 }
    )
  }

  // Get pending bookings for this date
  const { data: bookings, error: bookError } = await supabase
    .from('bookings')
    .select('*')
    .eq('restaurant_id', restaurant_id)
    .eq('booking_date', booking_date)
    .is('sms_sent_at', null)
    .in('status', ['pending'])

  if (bookError) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    )
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [],
    })
  }

  const result = await sendSMSToBookings(bookings, restaurant, {
    createSmsSend: async (data) => {
      await supabase.from('sms_sends').insert(data)
    },
    updateBooking: async (id, data) => {
      await supabase.from('bookings').update(data).eq('id', id)
    },
  })

  return NextResponse.json(result)
}
