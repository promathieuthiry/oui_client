import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, email, sms_template, sms_template_jj, sms_template_relance, sms_send_time, recap_send_time } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (sms_template !== undefined) updates.sms_template = sms_template
  if (sms_template_jj !== undefined) updates.sms_template_jj = sms_template_jj
  if (sms_template_relance !== undefined) updates.sms_template_relance = sms_template_relance
  if (sms_send_time !== undefined) updates.sms_send_time = sms_send_time
  if (recap_send_time !== undefined) updates.recap_send_time = recap_send_time

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du restaurant' },
      { status: 500 }
    )
  }

  return NextResponse.json({ restaurant })
}
