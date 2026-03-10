import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[Webhook] Octopush delivery webhook received')

  const supabase = await createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
    console.log('[Webhook] Parsed body:', JSON.stringify(body))
  } catch (error) {
    console.error('[Webhook] Failed to parse JSON:', error)
    return new NextResponse(null, { status: 200 })
  }

  const messageId = body.message_id as string | undefined
  const dlrStatus = body.status as string | undefined

  console.log('[Webhook] messageId:', messageId, 'status:', dlrStatus)

  if (!messageId || !dlrStatus) {
    console.log('[Webhook] Missing required fields - messageId or status')
    return new NextResponse(null, { status: 200 })
  }

  // Find the sms_send record by octopush_ticket
  const { data: smsSend, error: fetchError } = await supabase
    .from('sms_sends')
    .select('id, booking_id, attempts')
    .eq('octopush_ticket', messageId)
    .single()

  if (fetchError || !smsSend) {
    console.log('[Webhook] No sms_send found for ticket:', messageId, 'error:', fetchError)
    return new NextResponse(null, { status: 200 })
  }

  console.log('[Webhook] Found sms_send:', smsSend.id, 'booking:', smsSend.booking_id, 'attempts:', smsSend.attempts)

  if (dlrStatus === 'DELIVERED') {
    console.log('[Webhook] Processing DELIVERED status')

    // Update sms_send status
    const { error: smsError } = await supabase
      .from('sms_sends')
      .update({ delivery_status: 'DELIVERED', status: 'delivered' })
      .eq('id', smsSend.id)

    if (smsError) {
      console.error('[Webhook] Failed to update sms_sends:', smsError)
    } else {
      console.log('[Webhook] Successfully updated sms_send to delivered')
    }

    // Update booking status to sms_delivered (confirmed delivery by carrier)
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'sms_delivered', updated_at: new Date().toISOString() })
      .eq('id', smsSend.booking_id)
      .in('status', ['pending', 'sms_sent'])

    if (bookingError) {
      console.error('[Webhook] Failed to update booking:', bookingError)
    } else {
      console.log('[Webhook] Successfully updated booking to sms_delivered')
    }
  } else if (
    dlrStatus === 'NOT_DELIVERED' &&
    smsSend.attempts < 3
  ) {
    console.log('[Webhook] Processing NOT_DELIVERED status - marking for retry (attempt:', smsSend.attempts, ')')

    // Mark for retry — in a production system this would trigger a retry
    const { error: smsError } = await supabase
      .from('sms_sends')
      .update({
        delivery_status: dlrStatus,
        status: 'failed',
      })
      .eq('id', smsSend.id)

    if (smsError) {
      console.error('[Webhook] Failed to update sms_send for retry:', smsError)
    } else {
      console.log('[Webhook] SMS marked for retry')
    }
  } else if (
    dlrStatus === 'BAD_DESTINATION' ||
    dlrStatus === 'BLACKLISTED_NUMBER' ||
    (dlrStatus === 'NOT_DELIVERED' && smsSend.attempts >= 3)
  ) {
    console.log('[Webhook] Processing permanent failure - status:', dlrStatus, 'attempts:', smsSend.attempts)

    // Permanent failure
    const { error: smsError } = await supabase
      .from('sms_sends')
      .update({
        delivery_status: dlrStatus,
        status: 'failed',
      })
      .eq('id', smsSend.id)

    if (smsError) {
      console.error('[Webhook] Failed to update sms_send for permanent failure:', smsError)
    } else {
      console.log('[Webhook] SMS marked as permanently failed')
    }

    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'send_failed', updated_at: new Date().toISOString() })
      .eq('id', smsSend.booking_id)

    if (bookingError) {
      console.error('[Webhook] Failed to update booking to send_failed:', bookingError)
    } else {
      console.log('[Webhook] Booking marked as send_failed')
    }
  } else {
    console.log('[Webhook] Processing unknown status:', dlrStatus, '- updating delivery_status only')

    // UNKNOWN_DELIVERY or other — log but don't change status
    const { error: smsError } = await supabase
      .from('sms_sends')
      .update({ delivery_status: dlrStatus })
      .eq('id', smsSend.id)

    if (smsError) {
      console.error('[Webhook] Failed to update sms_send delivery_status:', smsError)
    } else {
      console.log('[Webhook] Updated delivery_status to:', dlrStatus)
    }
  }

  console.log('[Webhook] Webhook processing complete')
  return new NextResponse(null, { status: 200 })
}
