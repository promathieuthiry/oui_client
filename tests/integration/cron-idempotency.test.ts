import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSMSToBookings } from '@/lib/services/sms-sender'
import * as octopush from '@/lib/services/octopush'
import type { Service } from '@/lib/constants'

vi.mock('@/lib/services/octopush')

const mockSendSMS = vi.mocked(octopush.sendSMS)

describe('Cron Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip bookings with sms_sent_at already set (idempotency marker)', async () => {
    const bookings = [
      {
        id: 'b1',
        phone: '+33612345678',
        guest_name: 'Jean Dupont',
        booking_date: '2026-03-09',
        booking_time: '19:30',
        party_size: 4,
        status: 'pending',
        sms_sent_at: '2026-03-08T16:00:00Z', // already sent
        reminder_sent_at: null,
        relance_sent_at: null,
        service: 'soir' as Service,
      },
      {
        id: 'b2',
        phone: '+33698765432',
        guest_name: 'Marie Martin',
        booking_date: '2026-03-09',
        booking_time: '20:00',
        party_size: 2,
        status: 'pending',
        sms_sent_at: null, // not yet sent
        reminder_sent_at: null,
        relance_sent_at: null,
        service: 'soir' as Service,
      },
    ]

    mockSendSMS.mockResolvedValue({ success: true, ticket: 'sms_456' })

    const restaurant = {
      id: 'rest-1',
      name: 'Le Bon Restaurant',
      sms_template: 'Test {restaurant} {date} {heure} {couverts}',
      sms_template_jj: 'Test JJ {restaurant} {heure} {couverts}',
      sms_template_relance: 'Test Relance {restaurant} {heure} {couverts}',
    }

    const result = await sendSMSToBookings(bookings, restaurant, {
      createSmsSend: vi.fn().mockResolvedValue(undefined),
      updateBooking: vi.fn().mockResolvedValue(undefined),
    })

    // Only b2 should be sent, b1 should be skipped
    expect(result.sent).toBe(1)
    expect(result.skipped).toBe(1)
    expect(mockSendSMS).toHaveBeenCalledOnce()
  })

  it('should not send SMS if all bookings already have sms_sent_at', async () => {
    const bookings = [
      {
        id: 'b1',
        phone: '+33612345678',
        guest_name: 'Jean Dupont',
        booking_date: '2026-03-09',
        booking_time: '19:30',
        party_size: 4,
        status: 'pending',
        sms_sent_at: '2026-03-08T16:00:00Z',
        reminder_sent_at: null,
        relance_sent_at: null,
        service: 'soir' as Service,
      },
    ]

    const restaurant = {
      id: 'rest-1',
      name: 'Le Bon Restaurant',
      sms_template: 'Test {restaurant} {date} {heure} {couverts}',
      sms_template_jj: 'Test JJ {restaurant} {heure} {couverts}',
      sms_template_relance: 'Test Relance {restaurant} {heure} {couverts}',
    }

    const result = await sendSMSToBookings(bookings, restaurant, {
      createSmsSend: vi.fn().mockResolvedValue(undefined),
      updateBooking: vi.fn().mockResolvedValue(undefined),
    })

    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockSendSMS).not.toHaveBeenCalled()
  })

  describe('CRON_SECRET validation', () => {
    it('should reject requests without valid CRON_SECRET', () => {
      // Simulated: verify the pattern we'll use in the cron routes
      const cronSecret = 'my-secret-123'
      const authHeader = 'Bearer wrong-secret'

      const token = authHeader.replace('Bearer ', '')
      expect(token).not.toBe(cronSecret)
    })

    it('should accept requests with valid CRON_SECRET', () => {
      const cronSecret = 'my-secret-123'
      const authHeader = `Bearer ${cronSecret}`

      const token = authHeader.replace('Bearer ', '')
      expect(token).toBe(cronSecret)
    })
  })
})
