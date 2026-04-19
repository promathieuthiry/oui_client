import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  restaurant_id: z.string().min(1),
  service_date: z.string().min(1),
  service: z.enum(['midi', 'soir']),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { restaurant_id, service_date, service } = parsed.data

  const { data, error } = await supabase
    .from('recaps')
    .select('email_status, sent_at, resend_id, booking_count, created_at')
    .eq('restaurant_id', restaurant_id)
    .eq('service_date', service_date)
    .eq('service', service)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[recaps/status] Failed to query recaps:', error.message)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    )
  }

  const row = data?.[0]
  if (!row) {
    return NextResponse.json({
      status: 'not_sent' as const,
      sent_at: null,
      resend_id: null,
      booking_count: null,
    })
  }

  return NextResponse.json({
    status: row.email_status as 'sent' | 'failed',
    sent_at: row.sent_at,
    resend_id: row.resend_id,
    booking_count: row.booking_count,
  })
}
