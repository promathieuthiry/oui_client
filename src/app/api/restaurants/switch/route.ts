import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  const serviceClient = await createServiceClient()

  // Verify restaurant exists
  const { data: restaurant, error: restError } = await serviceClient
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

  // Update profile
  const { error } = await serviceClient
    .from('profiles')
    .update({ restaurant_id })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json(
      { error: 'Erreur lors du changement de restaurant' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
