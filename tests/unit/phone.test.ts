import { describe, it, expect } from 'vitest'
import { toE164, maskPhone } from '@/lib/utils/phone'

describe('toE164', () => {
  it('should convert French mobile number 06...', () => {
    expect(toE164('0612345678')).toBe('+33612345678')
  })

  it('should handle spaces in number', () => {
    expect(toE164('06 12 34 56 78')).toBe('+33612345678')
  })

  it('should handle dots in number', () => {
    expect(toE164('06.12.34.56.78')).toBe('+33612345678')
  })

  it('should handle dashes in number', () => {
    expect(toE164('06-12-34-56-78')).toBe('+33612345678')
  })

  it('should pass through E.164 format', () => {
    expect(toE164('+33612345678')).toBe('+33612345678')
  })

  it('should convert 0033 format', () => {
    expect(toE164('0033612345678')).toBe('+33612345678')
  })

  it('should convert 33 without + format', () => {
    expect(toE164('33612345678')).toBe('+33612345678')
  })

  it('should handle French landline 01...', () => {
    expect(toE164('0145678901')).toBe('+33145678901')
  })

  it('should return null for invalid number', () => {
    expect(toE164('123')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(toE164('')).toBeNull()
  })

  it('should convert international number without + prefix', () => {
    expect(toE164('4915150634427')).toBe('+4915150634427')
  })

  it('should pass through international E.164 with +', () => {
    expect(toE164('+4915150634427')).toBe('+4915150634427')
  })

  it('should pass through UK E.164 number', () => {
    expect(toE164('+44712345678')).toBe('+44712345678')
  })
})

describe('maskPhone', () => {
  it('should mask French mobile number', () => {
    expect(maskPhone('+33612345678')).toBe('+33 6 XX XX XX 78')
  })

  it('should mask French landline', () => {
    expect(maskPhone('+33145678901')).toBe('+33 1 XX XX XX 01')
  })

  it('should handle short numbers gracefully', () => {
    const result = maskPhone('+331')
    expect(result).toContain('****')
  })
})
