import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseReply } from '@/lib/services/reply-parser'

export async function POST(request: NextRequest) {
  // Webhook endpoint — no auth session, uses service role
  const supabase = await createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 200 })
  }

  const phone = body.number as string | undefined
  const text = body.text as string | undefined
  const messageId = body.message_id as string | undefined
  const receptionDate = body.reception_date as string | undefined

  if (!phone || !text) {
    return new NextResponse(null, { status: 200 })
  }

  const interpretation = parseReply(text)

  const statusMap: Record<string, string> = {
    oui: 'confirmed',
    non: 'cancelled',
    unknown: 'to_verify',
  }

  const today = new Date().toISOString().split('T')[0]

  // Find all matching bookings (phone match, pending/sms_sent, future date)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('phone', phone)
    .in('status', ['pending', 'sms_sent'])
    .gte('booking_date', today)

  if (!bookings || bookings.length === 0) {
    console.log(`No matching bookings for phone ${phone.slice(0, 6)}***`)
    return new NextResponse(null, { status: 200 })
  }

  // Create reply records and update statuses for all matching bookings
  for (const booking of bookings) {
    await supabase.from('sms_replies').insert({
      booking_id: booking.id,
      raw_text: text,
      interpretation,
      octopush_message_id: messageId || null,
      received_at: receptionDate || new Date().toISOString(),
    })

    await supabase
      .from('bookings')
      .update({
        status: statusMap[interpretation],
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
  }

  // Must return 200 quickly (Octopush requirement)
  return new NextResponse(null, { status: 200 })
}
