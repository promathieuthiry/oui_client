import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getNextSmsAction, getButtonText } from '@/lib/utils/sms-flow'

describe('sms-flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mockToday(year: number, month: number, day: number) {
    vi.setSystemTime(new Date(year, month - 1, day, 12, 0, 0))
  }

  describe('getNextSmsAction', () => {
    describe('completed states', () => {
      it('should return completed if status is confirmed', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-17',
          sms_sent_at: null,
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'confirmed',
        })
        expect(result).toEqual({ type: 'completed', enabled: false })
      })

      it('should return completed if status is to_verify', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-17',
          sms_sent_at: null,
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'to_verify',
        })
        expect(result).toEqual({ type: 'completed', enabled: false })
      })

      it('should return completed if status is cancelled', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-17',
          sms_sent_at: null,
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'cancelled',
        })
        expect(result).toEqual({ type: 'completed', enabled: false })
      })

      it('should return completed if relance has been sent', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-17',
          sms_sent_at: '2026-03-15T10:00:00Z',
          reminder_sent_at: null,
          relance_sent_at: '2026-03-16T10:00:00Z',
          status: 'pending',
        })
        expect(result).toEqual({ type: 'completed', enabled: false })
      })
    })

    describe('future bookings (normal flow: J-1 → Relance)', () => {
      it('should return rappel_j1 for future booking with no SMS sent', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-18',
          sms_sent_at: null,
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'pending',
        })
        expect(result).toEqual({ type: 'rappel_j1', enabled: true })
      })

      it('should return relance after J-1 is sent (skip Jour J)', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-18',
          sms_sent_at: '2026-03-15T10:00:00Z',
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'pending',
        })
        expect(result).toEqual({ type: 'relance', enabled: true })
      })
    })

    describe('same-day bookings (special flow: Jour J → Relance)', () => {
      it('should return rappel_jj for same-day booking with no SMS sent', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-16',
          sms_sent_at: null,
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'pending',
        })
        expect(result).toEqual({ type: 'rappel_jj', enabled: true })
      })

      it('should return relance after Jour J is sent', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-03-16',
          sms_sent_at: null,
          reminder_sent_at: '2026-03-16T10:00:00Z',
          relance_sent_at: null,
          status: 'pending',
        })
        expect(result).toEqual({ type: 'relance', enabled: true })
      })
    })

    describe('edge cases', () => {
      it('should handle bookings far in the future', () => {
        mockToday(2026, 3, 16)
        const result = getNextSmsAction({
          booking_date: '2026-06-01',
          sms_sent_at: null,
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'pending',
        })
        expect(result).toEqual({ type: 'rappel_j1', enabled: true })
      })

      it('should prioritize relance over booking date when J-1 sent on booking day', () => {
        mockToday(2026, 3, 16)
        // Booking is today, but J-1 was already sent → should go to relance
        const result = getNextSmsAction({
          booking_date: '2026-03-16',
          sms_sent_at: '2026-03-15T10:00:00Z',
          reminder_sent_at: null,
          relance_sent_at: null,
          status: 'pending',
        })
        expect(result).toEqual({ type: 'relance', enabled: true })
      })
    })
  })

  describe('getButtonText', () => {
    it('should return correct text for rappel_j1', () => {
      expect(getButtonText({ type: 'rappel_j1', enabled: true })).toBe(
        'Envoyer Rappel J-1'
      )
    })

    it('should return correct text for rappel_jj', () => {
      expect(getButtonText({ type: 'rappel_jj', enabled: true })).toBe(
        'Envoyer Rappel Jour J'
      )
    })

    it('should return correct text for relance', () => {
      expect(getButtonText({ type: 'relance', enabled: true })).toBe('Relancer')
    })

    it('should return null for completed state', () => {
      expect(getButtonText({ type: 'completed', enabled: false })).toBe(null)
    })

    it('should return correct text for disabled rappel_jj', () => {
      expect(
        getButtonText({
          type: 'rappel_jj',
          enabled: false,
          reason: 'Disponible le jour de la réservation',
        })
      ).toBe('Envoyer Rappel Jour J')
    })
  })
})
