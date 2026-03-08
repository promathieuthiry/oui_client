import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendRecapEmail } from '@/lib/services/recap-email'

// Mock resend
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: 'email_123' },
          error: null,
        }),
      },
    })),
  }
})

// Mock the email template to avoid React rendering in tests
vi.mock('@/emails/recap-email', () => ({
  RecapEmail: vi.fn().mockReturnValue(null),
}))

describe('sendRecapEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM_EMAIL = 'test@test.com'
  })

  const restaurant = {
    id: 'rest-1',
    name: 'Le Bon Restaurant',
    email: 'resto@example.com',
  }

  const bookingsWithMixedStatuses = [
    {
      id: 'b1',
      guest_name: 'Jean Dupont',
      booking_time: '19:00',
      party_size: 4,
      status: 'confirmed',
    },
    {
      id: 'b2',
      guest_name: 'Marie Martin',
      booking_time: '20:00',
      party_size: 2,
      status: 'cancelled',
    },
    {
      id: 'b3',
      guest_name: 'Pierre Durand',
      booking_time: '20:30',
      party_size: 6,
      status: 'pending',
    },
  ]

  it('should send email with mixed statuses', async () => {
    const result = await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      {
        createRecap: vi.fn().mockResolvedValue(undefined),
      }
    )

    expect(result.email_status).toBe('sent')
    expect(result.booking_count).toBe(3)
  })

  it('should send email with zero replies (all pending)', async () => {
    const allPending = bookingsWithMixedStatuses.map((b) => ({
      ...b,
      status: 'pending',
    }))

    const result = await sendRecapEmail(restaurant, '2026-03-09', allPending, {
      createRecap: vi.fn().mockResolvedValue(undefined),
    })

    expect(result.email_status).toBe('sent')
    expect(result.booking_count).toBe(3)
  })

  it('should create recap record after sending', async () => {
    const createRecap = vi.fn().mockResolvedValue(undefined)

    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap }
    )

    expect(createRecap).toHaveBeenCalledOnce()
    expect(createRecap).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant_id: 'rest-1',
        service_date: '2026-03-09',
        booking_count: 3,
        email_status: 'sent',
      })
    )
  })
})
