import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isToday,
  isDateToday,
  isDateTomorrow,
  canSendRelance,
  determineMessageType,
} from '@/lib/utils/date'

describe('date utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mockToday(year: number, month: number, day: number) {
    vi.setSystemTime(new Date(year, month - 1, day, 12, 0, 0))
  }

  describe('isToday', () => {
    it('should return true for a timestamp from today', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 13, 10, 30, 0).toISOString()
      expect(isToday(timestamp)).toBe(true)
    })

    it('should return false for a timestamp from yesterday', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 12, 10, 30, 0).toISOString()
      expect(isToday(timestamp)).toBe(false)
    })

    it('should return false for a timestamp from tomorrow', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 14, 10, 30, 0).toISOString()
      expect(isToday(timestamp)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isToday(null)).toBe(false)
    })
  })

  describe('isDateToday', () => {
    it('should return true for today\'s date', () => {
      mockToday(2026, 3, 13)
      expect(isDateToday('2026-03-13')).toBe(true)
    })

    it('should return false for yesterday', () => {
      mockToday(2026, 3, 13)
      expect(isDateToday('2026-03-12')).toBe(false)
    })

    it('should return false for tomorrow', () => {
      mockToday(2026, 3, 13)
      expect(isDateToday('2026-03-14')).toBe(false)
    })

    it('should use local timezone, not UTC (edge case at 23h)', () => {
      // At 23:00 local time on March 13, UTC is already March 14
      // This test verifies we use local timezone, not UTC
      vi.setSystemTime(new Date(2026, 2, 13, 23, 30, 0))
      expect(isDateToday('2026-03-13')).toBe(true)
      expect(isDateToday('2026-03-14')).toBe(false)
    })
  })

  describe('isDateTomorrow', () => {
    it('should return true for tomorrow\'s date', () => {
      mockToday(2026, 3, 13)
      expect(isDateTomorrow('2026-03-14')).toBe(true)
    })

    it('should return false for today', () => {
      mockToday(2026, 3, 13)
      expect(isDateTomorrow('2026-03-13')).toBe(false)
    })

    it('should return false for day after tomorrow', () => {
      mockToday(2026, 3, 13)
      expect(isDateTomorrow('2026-03-15')).toBe(false)
    })

    it('should handle month boundaries', () => {
      mockToday(2026, 3, 31)
      expect(isDateTomorrow('2026-04-01')).toBe(true)
    })

    it('should use local timezone, not UTC (edge case at 23h)', () => {
      // At 23:00 local time on March 13, UTC is already March 14
      // This test verifies we use local timezone, not UTC
      vi.setSystemTime(new Date(2026, 2, 13, 23, 30, 0))
      expect(isDateTomorrow('2026-03-14')).toBe(true)
      expect(isDateTomorrow('2026-03-15')).toBe(false)
    })
  })

  describe('canSendRelance', () => {
    it('should return true if SMS was sent today', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 13, 10, 30, 0).toISOString()
      expect(canSendRelance(timestamp)).toBe(true)
    })

    it('should return false if SMS was sent yesterday', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 12, 10, 30, 0).toISOString()
      expect(canSendRelance(timestamp)).toBe(false)
    })

    it('should return false if SMS was never sent', () => {
      expect(canSendRelance(null)).toBe(false)
    })
  })

  describe('determineMessageType', () => {
    it('should return "relance" if SMS was sent today', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 13, 10, 30, 0).toISOString()
      expect(determineMessageType('2026-03-14', timestamp)).toBe('relance')
    })

    it('should return "jj" if booking is today and no SMS sent', () => {
      mockToday(2026, 3, 13)
      expect(determineMessageType('2026-03-13', null)).toBe('jj')
    })

    it('should return "" (J-1) if booking is tomorrow and no SMS sent', () => {
      mockToday(2026, 3, 13)
      expect(determineMessageType('2026-03-14', null)).toBe('')
    })

    it('should return "" (J-1) as fallback for future dates', () => {
      mockToday(2026, 3, 13)
      expect(determineMessageType('2026-03-20', null)).toBe('')
    })

    it('should prioritize relance over booking date', () => {
      mockToday(2026, 3, 13)
      const timestamp = new Date(2026, 2, 13, 10, 30, 0).toISOString()
      // Even though booking is today, relance takes priority
      expect(determineMessageType('2026-03-13', timestamp)).toBe('relance')
    })
  })
})
