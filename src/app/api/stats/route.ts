import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_RESTAURANT_COOKIE } from '@/lib/utils/active-restaurant'
import { computeStats } from '@/lib/services/stats-queries'

export const dynamic = 'force-dynamic'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDateParam(value: string | null): string | null {
  if (!value) return null
  if (!ISO_DATE_RE.test(value)) return null
  return value
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const activeRestaurantId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value ?? null
  if (!activeRestaurantId) {
    return NextResponse.json(
      { error: 'Aucun restaurant actif' },
      { status: 400 }
    )
  }

  const from = parseDateParam(request.nextUrl.searchParams.get('from'))
  const to = parseDateParam(request.nextUrl.searchParams.get('to'))

  if (request.nextUrl.searchParams.get('from') && !from) {
    return NextResponse.json(
      { error: 'Paramètre from invalide (YYYY-MM-DD attendu)' },
      { status: 400 }
    )
  }
  if (request.nextUrl.searchParams.get('to') && !to) {
    return NextResponse.json(
      { error: 'Paramètre to invalide (YYYY-MM-DD attendu)' },
      { status: 400 }
    )
  }
  if (from && to && from > to) {
    return NextResponse.json(
      { error: 'from doit être antérieur ou égal à to' },
      { status: 400 }
    )
  }

  try {
    const stats = await computeStats(supabase, {
      restaurantId: activeRestaurantId,
      from,
      to,
    })
    return NextResponse.json(stats)
  } catch (error) {
    console.error(
      `[api/stats] computeStats failed (restaurant=${activeRestaurantId}, from=${from}, to=${to}):`,
      error instanceof Error ? `${error.message}\n${error.stack}` : error
    )
    return NextResponse.json(
      { error: 'Erreur lors du calcul des statistiques' },
      { status: 500 }
    )
  }
}
