import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// This test suite requires a running Supabase instance
// Run with: docker-compose up -d (or npx supabase start)
// Skip if Docker not available

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Skip tests if Supabase not configured
const skipTests = !supabaseKey || supabaseKey === ''

describe.skipIf(skipTests)('Booking Service Trigger', () => {
  let supabase: ReturnType<typeof createClient>
  let testRestaurantId: string

  beforeEach(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)

    // Create a test restaurant for bookings
    const { data: restaurant } = await supabase
      .from('restaurants')
      .insert({
        name: 'Test Restaurant',
        email: 'test@test.com',
        phone: '+33612345678',
      })
      .select('id')
      .single()

    testRestaurantId = restaurant!.id
  })

  it('should assign "midi" for times before 17:00', async () => {
    const testCases = [
      { time: '09:00', expected: 'midi' },
      { time: '12:30', expected: 'midi' },
      { time: '16:59', expected: 'midi' },
    ]

    for (const { time, expected } of testCases) {
      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          restaurant_id: testRestaurantId,
          guest_name: `Test Guest ${time}`,
          phone: '+33612345678',
          booking_date: '2026-03-20',
          booking_time: time,
          party_size: 2,
          status: 'pending',
        })
        .select('id, booking_time, service')
        .single()

      expect(booking?.service).toBe(expected)
      expect(booking?.booking_time).toBe(time)

      // Cleanup
      await supabase.from('bookings').delete().eq('id', booking!.id)
    }
  })

  it('should assign "soir" for times at or after 17:00', async () => {
    const testCases = [
      { time: '17:00', expected: 'soir' },
      { time: '19:30', expected: 'soir' },
      { time: '23:59', expected: 'soir' },
    ]

    for (const { time, expected } of testCases) {
      const { data: booking } = await supabase
        .from('bookings')
        .insert({
          restaurant_id: testRestaurantId,
          guest_name: `Test Guest ${time}`,
          phone: '+33612345678',
          booking_date: '2026-03-20',
          booking_time: time,
          party_size: 2,
          status: 'pending',
        })
        .select('id, booking_time, service')
        .single()

      expect(booking?.service).toBe(expected)
      expect(booking?.booking_time).toBe(time)

      // Cleanup
      await supabase.from('bookings').delete().eq('id', booking!.id)
    }
  })

  it('should update service when time changes across cutoff', async () => {
    // Create booking at 12:00 (midi)
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        restaurant_id: testRestaurantId,
        guest_name: 'Test Guest Update',
        phone: '+33612345678',
        booking_date: '2026-03-20',
        booking_time: '12:00',
        party_size: 2,
        status: 'pending',
      })
      .select('id, service')
      .single()

    expect(booking?.service).toBe('midi')

    // Update to 19:00 (should become soir)
    const { data: updated } = await supabase
      .from('bookings')
      .update({ booking_time: '19:00' })
      .eq('id', booking!.id)
      .select('id, booking_time, service')
      .single()

    expect(updated?.service).toBe('soir')
    expect(updated?.booking_time).toBe('19:00')

    // Update back to 12:00 (should become midi again)
    const { data: reverted } = await supabase
      .from('bookings')
      .update({ booking_time: '12:00' })
      .eq('id', booking!.id)
      .select('id, booking_time, service')
      .single()

    expect(reverted?.service).toBe('midi')
    expect(reverted?.booking_time).toBe('12:00')

    // Cleanup
    await supabase.from('bookings').delete().eq('id', booking!.id)
  })

  it('should handle edge case at exact cutoff (16:59 vs 17:00)', async () => {
    // 16:59 should be midi
    const { data: before } = await supabase
      .from('bookings')
      .insert({
        restaurant_id: testRestaurantId,
        guest_name: 'Test Before Cutoff',
        phone: '+33612345678',
        booking_date: '2026-03-20',
        booking_time: '16:59',
        party_size: 2,
        status: 'pending',
      })
      .select('id, service')
      .single()

    expect(before?.service).toBe('midi')

    // 17:00 should be soir
    const { data: at } = await supabase
      .from('bookings')
      .insert({
        restaurant_id: testRestaurantId,
        guest_name: 'Test At Cutoff',
        phone: '+33612345678',
        booking_date: '2026-03-20',
        booking_time: '17:00',
        party_size: 2,
        status: 'pending',
      })
      .select('id, service')
      .single()

    expect(at?.service).toBe('soir')

    // 17:01 should be soir
    const { data: after } = await supabase
      .from('bookings')
      .insert({
        restaurant_id: testRestaurantId,
        guest_name: 'Test After Cutoff',
        phone: '+33612345678',
        booking_date: '2026-03-20',
        booking_time: '17:01',
        party_size: 2,
        status: 'pending',
      })
      .select('id, service')
      .single()

    expect(after?.service).toBe('soir')

    // Cleanup
    await supabase
      .from('bookings')
      .delete()
      .in('id', [before!.id, at!.id, after!.id])
  })

  it('should handle midnight edge case (00:00)', async () => {
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        restaurant_id: testRestaurantId,
        guest_name: 'Test Midnight',
        phone: '+33612345678',
        booking_date: '2026-03-20',
        booking_time: '00:00',
        party_size: 2,
        status: 'pending',
      })
      .select('id, service')
      .single()

    // 00:00 is before 17:00, so should be midi
    expect(booking?.service).toBe('midi')

    // Cleanup
    await supabase.from('bookings').delete().eq('id', booking!.id)
  })
})
