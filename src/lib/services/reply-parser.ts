/**
 * Parse an SMS reply and classify it as 'oui', 'non', or 'unknown'.
 * Handles common French variations: case, whitespace, punctuation, phrases.
 */

const CONFIRM_KEYWORDS = new Set([
  'ok',
  'd accord',
  'dac',
  'daccord',
  'confirm',
  'confirme',
  'confirmé',
  'c est bon',
  'cest bon',
  'parfait',
  'super',
  'yes',
  'bien sûr',
  'bien sur',
  'entendu',
  'top',
])

const CANCEL_KEYWORDS = new Set([
  'annule',
  'annuler',
  'annulation',
  'j annule',
  'jannule',
  'cancel',
])

export function parseReply(text: string): 'oui' | 'non' | 'unknown' {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/'/g, ' ')
    .replace(/[!.,;:?"]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return 'unknown'
  }

  // OUI patterns: "oui", "oui merci", "oui merci beaucoup", etc.
  if (/^oui(\s|$)/.test(cleaned)) {
    return 'oui'
  }

  // NON patterns: "non", "non merci", "non désolé", etc.
  if (/^non(\s|$)/.test(cleaned)) {
    return 'non'
  }

  // Check confirmation keywords (exact match or text starts with keyword)
  for (const kw of CONFIRM_KEYWORDS) {
    if (cleaned === kw || cleaned.startsWith(kw + ' ')) {
      return 'oui'
    }
  }

  // Check cancellation keywords (exact match or text starts with keyword)
  for (const kw of CANCEL_KEYWORDS) {
    if (cleaned === kw || cleaned.startsWith(kw + ' ')) {
      return 'non'
    }
  }

  return 'unknown'
}
