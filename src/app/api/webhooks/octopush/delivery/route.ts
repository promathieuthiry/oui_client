import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 200 })
  }

  const messageId = body.message_id as string | undefined
  const dlrStatus = body.status as string | undefined

  if (!messageId || !dlrStatus) {
    return new NextResponse(null, { status: 200 })
  }

  // Find the sms_send record by octopush_ticket
  const { data: smsSend } = await supabase
    .from('sms_sends')
    .select('id, booking_id, attempts')
    .eq('octopush_ticket', messageId)
    .single()

  if (!smsSend) {
    console.log(`No sms_send found for ticket ${messageId}`)
    return new NextResponse(null, { status: 200 })
  }

  if (dlrStatus === 'DELIVERED') {
    // Update sms_send status
    await supabase
      .from('sms_sends')
      .update({ delivery_status: 'DELIVERED', status: 'delivered' })
      .eq('id', smsSend.id)

    // Update booking status to sms_sent
    await supabase
      .from('bookings')
      .update({ status: 'sms_sent', updated_at: new Date().toISOString() })
      .eq('id', smsSend.booking_id)
      .eq('status', 'pending')
  } else if (
    dlrStatus === 'NOT_DELIVERED' &&
    smsSend.attempts < 3
  ) {
    // Mark for retry — in a production system this would trigger a retry
    await supabase
      .from('sms_sends')
      .update({
        delivery_status: dlrStatus,
        status: 'failed',
      })
      .eq('id', smsSend.id)
  } else if (
    dlrStatus === 'BAD_DESTINATION' ||
    dlrStatus === 'BLACKLISTED_NUMBER' ||
    (dlrStatus === 'NOT_DELIVERED' && smsSend.attempts >= 3)
  ) {
    // Permanent failure
    await supabase
      .from('sms_sends')
      .update({
        delivery_status: dlrStatus,
        status: 'failed',
      })
      .eq('id', smsSend.id)

    await supabase
      .from('bookings')
      .update({ status: 'send_failed', updated_at: new Date().toISOString() })
      .eq('id', smsSend.booking_id)
  } else {
    // UNKNOWN_DELIVERY or other — log but don't change status
    await supabase
      .from('sms_sends')
      .update({ delivery_status: dlrStatus })
      .eq('id', smsSend.id)
  }

  return new NextResponse(null, { status: 200 })
}
