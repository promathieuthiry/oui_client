import { describe, it, expect } from 'vitest'
import { bookingRowSchema } from '@/lib/validators/booking'

describe('bookingRowSchema', () => {
  const validRow = {
    guest_name: 'Jean Dupont',
    phone: '+33612345678',
    booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    booking_time: '19:30',
    party_size: 4,
  }

  it('should accept a valid booking row', () => {
    const result = bookingRowSchema.safeParse(validRow)
    expect(result.success).toBe(true)
  })

  it('should accept party_size as string', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      party_size: '4',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty guest_name', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      guest_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty phone', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      phone: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject past date', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      booking_date: '2020-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid time format', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      booking_time: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('should reject party_size of 0', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      party_size: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should reject negative party_size', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      party_size: -1,
    })
    expect(result.success).toBe(false)
  })

  it('should trim guest_name whitespace', () => {
    const result = bookingRowSchema.safeParse({
      ...validRow,
      guest_name: '  Jean Dupont  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.guest_name).toBe('Jean Dupont')
    }
  })
})
