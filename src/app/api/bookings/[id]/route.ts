import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { bookingRowSchema } from '@/lib/validators/booking'

// Validation schema for update operations
const updateSchema = z.object({
  booking_time: bookingRowSchema.shape.booking_time.optional(),
  party_size: bookingRowSchema.shape.party_size.optional(),
  status: z
    .enum(['pending', 'sms_sent', 'sms_delivered', 'confirmed', 'cancelled', 'to_verify', 'send_failed', 'invalid_number'])
    .optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validationResult = updateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // If status changes from invalid_number to pending, clear error_reason
    const updateData: Record<string, unknown> = { ...validationResult.data }
    if (validationResult.data.status === 'pending') {
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', id)
        .single()

      if (currentBooking?.status === 'invalid_number') {
        updateData.error_reason = null
      }
    }

    // Update booking with RLS enforcement (tenant isolation)
    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update booking:', error)
      return NextResponse.json(
        { error: 'Impossible de mettre à jour la réservation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/bookings/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur serveur inattendue' },
      { status: 500 }
    )
  }
}
