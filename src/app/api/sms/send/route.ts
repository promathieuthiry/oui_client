import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendSMSToBookings } from '@/lib/services/sms-sender'

const bodySchema = z.object({
  restaurant_id: z.string().uuid(),
  booking_date: z.string(),
  template_type: z.enum(['jj', 'relance']).optional(),
  booking_ids: z.array(z.string().uuid()).optional(),
  custom_message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides' },
      { status: 400 }
    )
  }

  const { restaurant_id, booking_date, template_type, booking_ids, custom_message } = parsed.data

  // Get restaurant
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, sms_template, sms_template_jj, sms_template_relance')
    .eq('id', restaurant_id)
    .single()

  if (restError || !restaurant) {
    return NextResponse.json(
      { error: 'Restaurant non trouvé' },
      { status: 404 }
    )
  }

  // If custom_message provided, use it; otherwise fall back to template selection
  let messageToSend: string

  if (custom_message) {
    messageToSend = custom_message
  } else {
    const templateKey =
      template_type === 'jj'
        ? 'sms_template_jj'
        : template_type === 'relance'
          ? 'sms_template_relance'
          : 'sms_template'

    messageToSend = restaurant[templateKey]

    if (!messageToSend) {
      return NextResponse.json(
        { error: 'Le modèle SMS sélectionné est vide. Configurez-le dans les paramètres du restaurant.' },
        { status: 400 }
      )
    }
  }

  const selectedRestaurant = {
    ...restaurant,
    sms_template: messageToSend,
  }

  // Get pending bookings for this date
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('restaurant_id', restaurant_id)
    .eq('booking_date', booking_date)
    .is('sms_sent_at', null)
    .in('status', ['pending'])

  if (booking_ids && booking_ids.length > 0) {
    query = query.in('id', booking_ids)
  }

  const { data: bookings, error: bookError } = await query

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

  const result = await sendSMSToBookings(bookings, selectedRestaurant, {
    createSmsSend: async (data) => {
      await supabase.from('sms_sends').insert(data)
    },
    updateBooking: async (id, data) => {
      await supabase.from('bookings').update(data).eq('id', id)
    },
  })

  return NextResponse.json(result)
}
