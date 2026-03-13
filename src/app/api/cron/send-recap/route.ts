import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendRecapEmail } from '@/lib/services/recap-email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Find restaurants with bookings today
  const { data: restaurantIds } = await supabase
    .from('bookings')
    .select('restaurant_id')
    .eq('booking_date', today)

  if (!restaurantIds || restaurantIds.length === 0) {
    return NextResponse.json({
      restaurants_processed: 0,
      recaps_sent: 0,
      recaps_skipped: 0,
    })
  }

  // Get unique restaurant IDs
  const uniqueIds = [...new Set(restaurantIds.map((r) => r.restaurant_id))]

  let recapsSent = 0
  let recapsSkipped = 0

  for (const restaurantId of uniqueIds) {
    // Check if recap already sent today (idempotency)
    const { data: existingRecap } = await supabase
      .from('recaps')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('service_date', today)
      .eq('email_status', 'sent')
      .single()

    if (existingRecap) {
      recapsSkipped++
      continue
    }

    // Get restaurant info
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, email')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) continue

    // Get bookings for today
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, guest_name, booking_time, party_size, status, service')
      .eq('restaurant_id', restaurantId)
      .eq('booking_date', today)
      .order('booking_time', { ascending: true })

    if (!bookings || bookings.length === 0) continue

    const result = await sendRecapEmail(restaurant, today, bookings, {
      createRecap: async (data) => {
        await supabase.from('recaps').insert(data)
      },
    })

    if (result.email_status === 'sent') {
      recapsSent++
    }
  }

  return NextResponse.json({
    restaurants_processed: uniqueIds.length,
    recaps_sent: recapsSent,
    recaps_skipped: recapsSkipped,
  })
}
