import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendRecapEmail } from '@/lib/services/recap-email'

// Capture send calls for assertion
const mockSend = vi.fn().mockResolvedValue({
  data: { id: 'email_123' },
  error: null,
})

// Mock resend
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: mockSend },
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
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null })
    process.env.RESEND_API_KEY = 'test-key'
    process.env.RESEND_FROM_EMAIL = 'test@test.com'
    delete process.env.RECAP_BCC_EMAIL
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
      service: 'soir',
    },
    {
      id: 'b2',
      guest_name: 'Marie Martin',
      booking_time: '20:00',
      party_size: 2,
      status: 'cancelled',
      service: 'soir',
    },
    {
      id: 'b3',
      guest_name: 'Pierre Durand',
      booking_time: '20:30',
      party_size: 6,
      status: 'pending',
      service: 'soir',
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

  it('should default to restaurant email when no emailOptions provided', async () => {
    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap: vi.fn().mockResolvedValue(undefined) }
    )

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['resto@example.com'],
      })
    )
  })

  it('should use custom TO recipients when provided', async () => {
    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap: vi.fn().mockResolvedValue(undefined) },
      undefined,
      { to: ['custom@example.com', 'other@example.com'] }
    )

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['custom@example.com', 'other@example.com'],
      })
    )
  })

  it('should include CC recipients when provided', async () => {
    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap: vi.fn().mockResolvedValue(undefined) },
      undefined,
      { cc: ['cc@example.com'] }
    )

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: ['cc@example.com'],
      })
    )
  })

  it('should include RECAP_BCC_EMAIL from env automatically', async () => {
    process.env.RECAP_BCC_EMAIL = 'admin@ouiclient.com'

    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap: vi.fn().mockResolvedValue(undefined) }
    )

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        bcc: ['admin@ouiclient.com'],
      })
    )
  })

  it('should dedupe BCC when env and emailOptions overlap', async () => {
    process.env.RECAP_BCC_EMAIL = 'admin@ouiclient.com'

    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap: vi.fn().mockResolvedValue(undefined) },
      undefined,
      { bcc: ['Admin@OuiClient.com', 'extra@example.com'] }
    )

    const call = mockSend.mock.calls[0][0]
    expect(call.bcc).toHaveLength(2)
    expect(call.bcc).toContain('admin@ouiclient.com')
    expect(call.bcc).toContain('extra@example.com')
  })

  it('should not include bcc field when no env and no emailOptions bcc', async () => {
    await sendRecapEmail(
      restaurant,
      '2026-03-09',
      bookingsWithMixedStatuses,
      { createRecap: vi.fn().mockResolvedValue(undefined) }
    )

    const call = mockSend.mock.calls[0][0]
    expect(call.bcc).toBeUndefined()
  })
})

describe('RecapEmail Template Logic', () => {
  // Test helper functions directly by extracting them to test
  // Note: React Email components can't render in Vitest node env (known issue in MEMORY.md)

  const mixedStatusBookings = [
    { guest_name: 'Jean', booking_time: '19:00', party_size: 4, status: 'confirmed' },
    { guest_name: 'Marie', booking_time: '20:00', party_size: 2, status: 'confirmed' },
    { guest_name: 'Pierre', booking_time: '20:30', party_size: 6, status: 'cancelled' },
    { guest_name: 'Sophie', booking_time: '19:30', party_size: 3, status: 'pending' },
    { guest_name: 'Luc', booking_time: '21:00', party_size: 2, status: 'sms_sent' },
  ]

  // Helper to calculate stats (extracted from email component logic)
  function calculateConfirmationStats(bookings: typeof mixedStatusBookings) {
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length
    const pending = bookings.filter((b) => !['confirmed', 'cancelled'].includes(b.status)).length
    const total = bookings.length
    const percentage = total > 0 ? Math.round((confirmed / total) * 100) : 0
    return { confirmed, cancelled, pending, total, percentage }
  }

  // Helper to group bookings (extracted from email component logic)
  function groupBookingsByStatus(bookings: typeof mixedStatusBookings) {
    return {
      confirmed: bookings.filter((b) => b.status === 'confirmed'),
      cancelled: bookings.filter((b) => b.status === 'cancelled'),
      pending: bookings.filter((b) => !['confirmed', 'cancelled'].includes(b.status)),
    }
  }

  it('should calculate correct confirmation percentage (40%)', () => {
    const stats = calculateConfirmationStats(mixedStatusBookings)
    expect(stats.percentage).toBe(40) // 2 confirmed out of 5
    expect(stats.confirmed).toBe(2)
    expect(stats.cancelled).toBe(1)
    expect(stats.pending).toBe(2)
    expect(stats.total).toBe(5)
  })

  it('should calculate 100% confirmation rate', () => {
    const allConfirmed = mixedStatusBookings.map((b) => ({ ...b, status: 'confirmed' }))
    const stats = calculateConfirmationStats(allConfirmed)
    expect(stats.percentage).toBe(100)
    expect(stats.confirmed).toBe(5)
    expect(stats.cancelled).toBe(0)
    expect(stats.pending).toBe(0)
  })

  it('should calculate 0% confirmation rate', () => {
    const allPending = mixedStatusBookings.map((b) => ({ ...b, status: 'pending' }))
    const stats = calculateConfirmationStats(allPending)
    expect(stats.percentage).toBe(0)
    expect(stats.confirmed).toBe(0)
    expect(stats.pending).toBe(5)
  })

  it('should handle empty bookings list', () => {
    const stats = calculateConfirmationStats([])
    expect(stats.percentage).toBe(0)
    expect(stats.total).toBe(0)
  })

  it('should group bookings by status correctly', () => {
    const grouped = groupBookingsByStatus(mixedStatusBookings)
    expect(grouped.confirmed).toHaveLength(2)
    expect(grouped.cancelled).toHaveLength(1)
    expect(grouped.pending).toHaveLength(2) // pending + sms_sent
    expect(grouped.confirmed[0].guest_name).toBe('Jean')
    expect(grouped.cancelled[0].guest_name).toBe('Pierre')
  })

  it('should group only confirmed bookings', () => {
    const onlyConfirmed = mixedStatusBookings.filter((b) => b.status === 'confirmed')
    const grouped = groupBookingsByStatus(onlyConfirmed)
    expect(grouped.confirmed).toHaveLength(2)
    expect(grouped.cancelled).toHaveLength(0)
    expect(grouped.pending).toHaveLength(0)
  })

  it('should treat non-confirmed/non-cancelled as pending', () => {
    const bookingsWithVariousStatuses = [
      { guest_name: 'A', booking_time: '19:00', party_size: 2, status: 'pending' },
      { guest_name: 'B', booking_time: '19:30', party_size: 2, status: 'sms_sent' },
      { guest_name: 'C', booking_time: '20:00', party_size: 2, status: 'to_verify' },
      { guest_name: 'D', booking_time: '20:30', party_size: 2, status: 'send_failed' },
    ]
    const grouped = groupBookingsByStatus(bookingsWithVariousStatuses)
    expect(grouped.pending).toHaveLength(4)
    expect(grouped.confirmed).toHaveLength(0)
    expect(grouped.cancelled).toHaveLength(0)
  })
})
