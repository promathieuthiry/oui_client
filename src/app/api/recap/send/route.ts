import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendRecapEmail } from '@/lib/services/recap-email'
import { z } from 'zod'
import { isValidEmail } from '@/lib/utils/email'

const emailArray = z.array(z.string().refine(isValidEmail, 'Email invalide')).optional()

const sendSchema = z.object({
  restaurant_id: z.string().min(1),
  service_date: z.string().min(1),
  service: z.enum(['midi', 'soir']).optional(),
  to: emailArray,
  cc: emailArray,
  bcc: emailArray,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { restaurant_id, service_date, service, to, cc, bcc } = parsed.data

  // Get restaurant
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

  // Get all bookings for this date
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

  const result = await sendRecapEmail(
    restaurant,
    service_date,
    filteredBookings,
    {
      createRecap: async (data) => {
        const { error } = await supabase.from('recaps').insert(data)
        if (error) {
          console.error('Failed to record recap in database:', {
            restaurant_id: data.restaurant_id,
            service_date: data.service_date,
            error: error.message,
            code: error.code,
          })
          // Don't throw - we already sent the email, but log for monitoring
        }
      },
    },
    serviceLabel,
    { to, cc, bcc },
    service ?? null
  )

  return NextResponse.json(result)
}
