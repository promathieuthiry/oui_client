import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendRecapEmail } from '@/lib/services/recap-email'
import type { Service } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const VALID_SERVICES: Service[] = ['midi', 'soir']

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const service = request.nextUrl.searchParams.get('service') as Service | null

  if (!service || !VALID_SERVICES.includes(service)) {
    return NextResponse.json(
      { error: 'Paramètre service requis: midi ou soir' },
      { status: 400 }
    )
  }

  const serviceLabel = service === 'midi' ? 'Midi' : 'Soir'

  const supabase = await createServiceClient()

  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  console.log(`[send-recap] service=${service}, today=${today}`)

  // Find restaurants with bookings today for this service
  const { data: restaurantIds, error: bookingsError } = await supabase
    .from('bookings')
    .select('restaurant_id')
    .eq('booking_date', today)
    .eq('service', service)

  if (bookingsError) {
    console.error('[send-recap] Failed to query bookings:', bookingsError.message)
    return NextResponse.json(
      { error: 'Database error querying bookings', details: bookingsError.message },
      { status: 500 }
    )
  }

  if (!restaurantIds || restaurantIds.length === 0) {
    console.log('[send-recap] No bookings found for today')
    return NextResponse.json({
      service,
      restaurants_processed: 0,
      recaps_sent: 0,
      recaps_skipped: 0,
    })
  }

  // Get unique restaurant IDs
  const uniqueIds = [...new Set(restaurantIds.map((r) => r.restaurant_id))]
  console.log(`[send-recap] Found ${uniqueIds.length} restaurant(s) with bookings`)

  let recapsSent = 0
  let recapsSkipped = 0

  for (const restaurantId of uniqueIds) {
    // Check if recap already sent today for this service (idempotency)
    const { data: existingRecap } = await supabase
      .from('recaps')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('service_date', today)
      .eq('service', service)
      .eq('email_status', 'sent')
      .single()

    if (existingRecap) {
      console.log(`[send-recap] Recap already sent for restaurant ${restaurantId}, skipping`)
      recapsSkipped++
      continue
    }

    // Get restaurant info
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, email')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      console.error(`[send-recap] Failed to fetch restaurant ${restaurantId}:`, restaurantError?.message)
      continue
    }

    // Get bookings for today filtered by service
    const { data: bookings, error: bookingsDetailError } = await supabase
      .from('bookings')
      .select('id, guest_name, booking_time, party_size, status, service')
      .eq('restaurant_id', restaurantId)
      .eq('booking_date', today)
      .eq('service', service)
      .order('booking_time', { ascending: true })

    if (bookingsDetailError) {
      console.error(`[send-recap] Failed to fetch bookings for restaurant ${restaurantId}:`, bookingsDetailError.message)
      continue
    }

    if (!bookings || bookings.length === 0) continue

    console.log(`[send-recap] Sending recap for ${restaurant.name}: ${bookings.length} booking(s)`)

    const result = await sendRecapEmail(
      restaurant,
      today,
      bookings,
      {
        createRecap: async (data) => {
          const { error: insertError } = await supabase.from('recaps').insert(data)
          if (insertError) {
            console.error(`[send-recap] Failed to insert recap record:`, insertError.message)
          }
        },
      },
      serviceLabel,
      { to: ['promathieuthiry@gmail.com'] },
      service
    )

    if (result.email_status === 'sent') {
      console.log(`[send-recap] Email sent for ${restaurant.name} (resend_id: ${result.resend_id})`)
      recapsSent++
    } else {
      console.error(`[send-recap] Email failed for ${restaurant.name}: ${result.error}`)
    }
  }

  const response = {
    service,
    restaurants_processed: uniqueIds.length,
    recaps_sent: recapsSent,
    recaps_skipped: recapsSkipped,
  }
  console.log('[send-recap] Done:', JSON.stringify(response))

  return NextResponse.json(response)
}
