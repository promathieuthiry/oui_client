/**
 * Parse an SMS reply and classify it as 'oui', 'non', or 'unknown'.
 * Handles common French variations: case, whitespace, punctuation, phrases.
 */
export function parseReply(text: string): 'oui' | 'non' | 'unknown' {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[!.,;:?'"]+/g, '')
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

  return 'unknown'
}
