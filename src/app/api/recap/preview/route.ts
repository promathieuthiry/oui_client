import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { render } from '@react-email/render'
import { RecapEmail } from '@/emails/recap-email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { restaurant_id, service_date, service } = body as {
    restaurant_id: string
    service_date: string
    service?: 'midi' | 'soir'
  }

  if (!restaurant_id || !service_date) {
    return NextResponse.json(
      { error: 'restaurant_id et service_date sont requis' },
      { status: 400 }
    )
  }

  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, email')
    .eq('id', restaurant_id)
    .single()

  if (restError || !restaurant) {
    return NextResponse.json(
      { error: 'Restaurant non trouvé' },
      { status: 404 }
    )
  }

  const { data: bookings, error: bookError } = await supabase
    .from('bookings')
    .select('id, guest_name, booking_time, party_size, status, service')
    .eq('restaurant_id', restaurant_id)
    .eq('booking_date', service_date)
    .order('booking_time', { ascending: true })

  if (bookError) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    )
  }

  let filteredBookings = bookings || []
  let serviceLabel: string | undefined
  if (service === 'midi') {
    filteredBookings = filteredBookings.filter((b) => b.service === 'midi')
    serviceLabel = 'Midi'
  } else if (service === 'soir') {
    filteredBookings = filteredBookings.filter((b) => b.service === 'soir')
    serviceLabel = 'Soir'
  }

  const html = await render(
    RecapEmail({
      restaurantName: restaurant.name,
      serviceDate: service_date,
      bookings: filteredBookings,
      serviceLabel,
    })
  )

  return NextResponse.json({
    html,
    bcc: process.env.RECAP_BCC_EMAIL || null,
    restaurantEmail: restaurant.email,
  })
}
