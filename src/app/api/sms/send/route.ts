import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendSMSToBookings } from '@/lib/services/sms-sender'

const bodySchema = z.object({
  restaurant_id: z.string().uuid(),
  booking_date: z.string(),
  template_type: z.enum(['jj', 'relance']).optional(), // Backward compatibility
  sms_type: z.enum(['rappel_j1', 'rappel_jj', 'relance']).optional(),
  booking_ids: z.array(z.string().uuid()).optional(),
  custom_message: z.string().max(612).optional(), // ~4 SMS segments (160 chars each)
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

  const { restaurant_id, booking_date, template_type, sms_type, booking_ids, custom_message } = parsed.data

  // Determine SMS type (prefer sms_type, fallback to template_type for backward compatibility)
  let effectiveSmsType: 'rappel_j1' | 'rappel_jj' | 'relance' | undefined
  if (sms_type) {
    effectiveSmsType = sms_type
  } else if (template_type) {
    // Map old template_type to new sms_type
    effectiveSmsType = template_type === 'jj' ? 'rappel_jj' : 'relance'
  }

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

  // Validate that the restaurant has a template configured (unless custom message is provided)
  if (!custom_message) {
    let templateKey: 'sms_template' | 'sms_template_jj' | 'sms_template_relance' = 'sms_template'
    if (effectiveSmsType === 'rappel_jj') {
      templateKey = 'sms_template_jj'
    } else if (effectiveSmsType === 'relance') {
      templateKey = 'sms_template_relance'
    }

    if (!restaurant[templateKey]) {
      return NextResponse.json(
        { error: 'Le modèle SMS sélectionné est vide. Configurez-le dans les paramètres du restaurant.' },
        { status: 400 }
      )
    }
  }

  // Get bookings for this date with query logic based on SMS type
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('restaurant_id', restaurant_id)
    .eq('booking_date', booking_date)

  // Different query logic based on SMS type
  if (effectiveSmsType === 'rappel_j1') {
    // Rappel J-1: get bookings without any SMS sent
    query = query
      .is('sms_sent_at', null)
      .in('status', ['pending'])
  } else if (effectiveSmsType === 'rappel_jj') {
    // Rappel Jour J: get bookings with J-1 sent but not Jour J
    // OR pending bookings for same-day (no J-1 sent)
    query = query
      .is('reminder_sent_at', null)
      .in('status', ['pending', 'sms_sent', 'sms_delivered'])
  } else if (effectiveSmsType === 'relance') {
    // Relance: get bookings with J-1 OR Jour J sent, but not yet relanced
    query = query
      .or('reminder_sent_at.not.is.null,sms_sent_at.not.is.null')
      .is('relance_sent_at', null)
      .in('status', ['sms_sent', 'sms_delivered'])
  } else {
    // Fallback: pending bookings without SMS (for backward compatibility)
    query = query
      .is('sms_sent_at', null)
      .in('status', ['pending'])
  }

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

  const result = await sendSMSToBookings(
    bookings,
    restaurant,
    {
      createSmsSend: async (data) => {
        const { error } = await supabase.from('sms_sends').insert(data)
        if (error) {
          throw new Error(`Failed to create SMS send record: ${error.message}`)
        }
      },
      updateBooking: async (id, data) => {
        const { error } = await supabase.from('bookings').update(data).eq('id', id)
        if (error) {
          throw new Error(`Failed to update booking ${id}: ${error.message}`)
        }
      },
    },
    { smsType: effectiveSmsType, customMessage: custom_message }
  )

  return NextResponse.json(result)
}
