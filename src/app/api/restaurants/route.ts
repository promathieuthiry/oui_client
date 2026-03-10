import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_RESTAURANT_COOKIE } from '@/lib/utils/active-restaurant'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const activeRestaurantId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value ?? null

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at')

  if (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des restaurants' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    restaurants: restaurants ?? [],
    activeRestaurantId,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { name, email, sms_template, sms_template_jj, sms_template_relance, sms_send_time, recap_send_time } = body

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Le nom et l\'email sont requis' },
      { status: 400 }
    )
  }

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .insert({
      name,
      email,
      sms_template: sms_template ?? '',
      sms_template_jj: sms_template_jj ?? '',
      sms_template_relance: sms_template_relance ?? '',
      sms_send_time: sms_send_time ?? '09:00',
      recap_send_time: recap_send_time ?? '18:00',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la création du restaurant' },
      { status: 500 }
    )
  }

  return NextResponse.json({ restaurant })
}
