/**
 * Convert a French phone number to E.164 format (+33XXXXXXXXX).
 * Accepts: 06..., +336..., 0033 6..., 33 6..., etc.
 * Returns null if the number cannot be converted.
 */
export function toE164(phone: string): string | null {
  // Remove all spaces, dots, dashes, parentheses
  const cleaned = phone.replace(/[\s.\-()]/g, '')

  // Already E.164 format
  if (/^\+33[1-9]\d{8}$/.test(cleaned)) {
    return cleaned
  }

  // Starts with 0033
  if (/^0033[1-9]\d{8}$/.test(cleaned)) {
    return '+33' + cleaned.slice(4)
  }

  // Starts with 33 (without +)
  if (/^33[1-9]\d{8}$/.test(cleaned)) {
    return '+' + cleaned
  }

  // French local format (0X XX XX XX XX)
  if (/^0[1-9]\d{8}$/.test(cleaned)) {
    return '+33' + cleaned.slice(1)
  }

  // Already full E.164 with + (non-French international)
  if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return cleaned
  }

  // International number without + prefix (e.g. 4915150634427)
  if (/^[1-9]\d{9,14}$/.test(cleaned)) {
    return '+' + cleaned
  }

  return null
}

/**
 * Mask a phone number for display: +33 6 XX XX XX 34
 * Shows only the last 2 digits.
 */
export function maskPhone(phone: string): string {
  if (!phone.startsWith('+33') || phone.length < 12) {
    return phone.slice(0, 4) + ' **** ' + phone.slice(-2)
  }

  const countryCode = '+33'
  const firstDigit = phone[3]
  const lastTwo = phone.slice(-2)

  return `${countryCode} ${firstDigit} XX XX XX ${lastTwo}`
}
