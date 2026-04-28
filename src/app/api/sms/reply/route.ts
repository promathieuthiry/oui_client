import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseReply } from '@/lib/services/reply-parser'
import { toE164 } from '@/lib/utils/phone'

export async function POST(request: NextRequest) {
  // Webhook endpoint — no auth session, uses service role
  const supabase = await createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch (err) {
    console.error('[SMS Reply] JSON parse failed:', err)
    return new NextResponse(null, { status: 200 })
  }

  // Extract fields from nested metadata structure
  const metadata = body.metadata as Record<string, unknown> | undefined
  const phone = metadata?.number as string | undefined
  const text = body.text as string | undefined
  const messageId = metadata?.message_id as string | undefined
  const receptionDate = body.reception_date as string | undefined

  console.log('[SMS Reply] Webhook received:', {
    phone,
    textLength: text?.length,
    messageId,
    timestamp: receptionDate || 'now',
  })

  if (!phone || !text) {
    return new NextResponse(null, { status: 200 })
  }

  // Normalize phone to E.164 to match DB format
  const normalizedPhone = toE164(phone) || phone

  console.log('[SMS Reply] Phone normalized:', {
    original: phone,
    normalized: normalizedPhone,
    format: normalizedPhone.startsWith('+') ? 'E.164' : 'other',
  })

  const interpretation = parseReply(text)

  console.log('[SMS Reply] Text parsed:', {
    interpretation,
    rawText: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
    targetStatus:
      interpretation === 'oui'
        ? 'confirmed'
        : interpretation === 'non'
          ? 'cancelled'
          : 'to_verify',
  })

  const statusMap: Record<string, string> = {
    oui: 'confirmed',
    non: 'cancelled',
    unknown: 'to_verify',
  }

  const today = new Date().toISOString().split('T')[0]

  // Debug: Check if booking exists with ANY status
  const { data: allBookings, error: debugError } = await supabase
    .from('bookings')
    .select('id, status, booking_date, phone')
    .eq('phone', normalizedPhone)
    .gte('booking_date', today)

  console.log('[SMS Reply] Debug - All bookings for phone:', {
    phone: normalizedPhone,
    found: allBookings?.length || 0,
    statuses: allBookings?.map((b) => b.status) || [],
    error: debugError?.message,
  })

  // Find all matching bookings (phone match, pending/sms_sent/sms_delivered/confirmed, future date)
  // Allow confirmed bookings to be cancelled via SMS reply
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('phone', normalizedPhone)
    .in('status', ['pending', 'sms_sent', 'sms_delivered', 'relance_sent', 'confirmed'])
    .gte('booking_date', today)

  console.log('[SMS Reply] Bookings lookup:', {
    phone: normalizedPhone,
    statusFilter: ['pending', 'sms_sent', 'sms_delivered', 'relance_sent', 'confirmed'],
    dateFilter: `>= ${today}`,
    found: bookings?.length || 0,
  })

  if (!bookings || bookings.length === 0) {
    console.log(`No matching bookings for phone ${phone}`)
    return new NextResponse(null, { status: 200 })
  }

  // Create reply records and update statuses for all matching bookings
  for (const booking of bookings) {
    try {
      const { error: insertError } = await supabase.from('sms_replies').insert({
        booking_id: booking.id,
        raw_text: text,
        interpretation,
        octopush_message_id: messageId || null,
        received_at: receptionDate
          ? receptionDate + ' Europe/Paris'
          : new Date().toISOString(),
      })

      if (insertError) throw insertError

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: statusMap[interpretation],
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id)

      if (updateError) throw updateError

      console.log('[SMS Reply] Booking updated:', {
        bookingId: booking.id,
        newStatus: statusMap[interpretation],
        interpretation,
      })
    } catch (err) {
      console.error('[SMS Reply] DB operation failed:', {
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      })
      // Continue processing other bookings
    }
  }

  console.log('[SMS Reply] Webhook processed:', {
    phone: normalizedPhone,
    interpretation,
    bookingsUpdated: bookings?.length || 0,
  })

  // Must return 200 quickly (Octopush requirement)
  return new NextResponse(null, { status: 200 })
}
