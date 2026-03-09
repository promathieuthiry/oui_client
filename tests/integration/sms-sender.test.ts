import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSMSToBookings } from '@/lib/services/sms-sender'
import * as octopush from '@/lib/services/octopush'

vi.mock('@/lib/services/octopush')

const mockSendSMS = vi.mocked(octopush.sendSMS)

describe('sendSMSToBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const makeBooking = (overrides = {}) => ({
    id: 'booking-1',
    phone: '+33612345678',
    guest_name: 'Jean Dupont',
    booking_date: '2026-03-09',
    booking_time: '19:30',
    party_size: 4,
    status: 'pending',
    sms_sent_at: null,
    ...overrides,
  })

  const restaurant = {
    id: 'rest-1',
    name: 'Le Bon Restaurant',
    sms_template:
      'Bonjour, votre réservation au {restaurant} le {date} à {heure} pour {couverts} personne(s) est bien notée. Merci de confirmer en répondant OUI ou NON à ce SMS.',
    sms_template_jj:
      '{restaurant}\n\nPetit rappel pour vous dire que toute l\'équipe du restaurant vous attend aujourd\'hui à {heure} pour {couverts} personnes.\n\nPour préparer au mieux votre accueil, merci de répondre OK ou ANNULER.\n\nBonne journée',
    sms_template_relance:
      '{restaurant}\n\nNous n\'avons pas encore recu votre confirmation pour ce soir {heure} ({couverts} pers.).\nMerci au nom de l\'équipe en salle de répondre OK ou ANNULER rapidement.',
  }

  it('should send SMS to all bookings and return results', async () => {
    mockSendSMS.mockResolvedValue({
      success: true,
      ticket: 'sms_123',
    })

    const bookings = [makeBooking(), makeBooking({ id: 'booking-2', phone: '+33698765432' })]

    const results = await sendSMSToBookings(bookings, restaurant, {
      createSmsSend: vi.fn().mockResolvedValue(undefined),
      updateBooking: vi.fn().mockResolvedValue(undefined),
    })

    expect(results.sent).toBe(2)
    expect(results.failed).toBe(0)
    expect(mockSendSMS).toHaveBeenCalledTimes(2)
  })

  it('should handle failed SMS send', async () => {
    mockSendSMS.mockResolvedValue({
      success: false,
      error: 'Invalid phone number',
    })

    const bookings = [makeBooking()]

    const results = await sendSMSToBookings(bookings, restaurant, {
      createSmsSend: vi.fn().mockResolvedValue(undefined),
      updateBooking: vi.fn().mockResolvedValue(undefined),
    })

    expect(results.sent).toBe(0)
    expect(results.failed).toBe(1)
    expect(results.details[0].status).toBe('failed')
  })

  it('should skip bookings already sent', async () => {
    const bookings = [
      makeBooking({ sms_sent_at: new Date().toISOString() }),
    ]

    const results = await sendSMSToBookings(bookings, restaurant, {
      createSmsSend: vi.fn().mockResolvedValue(undefined),
      updateBooking: vi.fn().mockResolvedValue(undefined),
    })

    expect(results.skipped).toBe(1)
    expect(results.sent).toBe(0)
    expect(mockSendSMS).not.toHaveBeenCalled()
  })

  it('should format SMS template with booking data', async () => {
    mockSendSMS.mockResolvedValue({ success: true, ticket: 'sms_123' })

    const bookings = [makeBooking()]

    await sendSMSToBookings(bookings, restaurant, {
      createSmsSend: vi.fn().mockResolvedValue(undefined),
      updateBooking: vi.fn().mockResolvedValue(undefined),
    })

    const callArgs = mockSendSMS.mock.calls[0]
    expect(callArgs[0]).toBe('+33612345678')
    expect(callArgs[1]).toContain('Le Bon Restaurant')
    expect(callArgs[1]).toContain('2026-03-09')
    expect(callArgs[1]).toContain('19:30')
    expect(callArgs[1]).toContain('4')
  })
})
