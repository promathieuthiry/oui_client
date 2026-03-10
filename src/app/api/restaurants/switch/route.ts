import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_RESTAURANT_COOKIE } from '@/lib/utils/active-restaurant'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  const { restaurant_id } = body

  if (!restaurant_id) {
    return NextResponse.json(
      { error: 'restaurant_id est requis' },
      { status: 400 }
    )
  }

  // Verify restaurant exists
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurant_id)
    .single()

  if (restError || !restaurant) {
    return NextResponse.json(
      { error: 'Restaurant non trouvé' },
      { status: 404 }
    )
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(ACTIVE_RESTAURANT_COOKIE, restaurant_id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
