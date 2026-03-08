import { describe, it, expect } from 'vitest'
import { parseReply } from '@/lib/services/reply-parser'

describe('parseReply', () => {
  it.each([
    ['oui', 'oui'],
    ['OUI', 'oui'],
    ['Oui', 'oui'],
    ['Oui!', 'oui'],
    ['oui.', 'oui'],
    ['oui merci', 'oui'],
    ['Oui merci beaucoup', 'oui'],
    [' oui ', 'oui'],
    ['OUI !', 'oui'],
  ])('should classify "%s" as "oui"', (input, expected) => {
    expect(parseReply(input)).toBe(expected)
  })

  it.each([
    ['non', 'non'],
    ['NON', 'non'],
    ['Non', 'non'],
    ['Non merci', 'non'],
    ['non désolé', 'non'],
    ['non.', 'non'],
    [' non ', 'non'],
    ['NON !', 'non'],
  ])('should classify "%s" as "non"', (input, expected) => {
    expect(parseReply(input)).toBe(expected)
  })

  it.each([
    ['peut-être', 'unknown'],
    ['je sais pas', 'unknown'],
    ['random text', 'unknown'],
    ['', 'unknown'],
    ['bonjour', 'unknown'],
    ['12345', 'unknown'],
    ['ok', 'unknown'],
  ])('should classify "%s" as "unknown"', (input, expected) => {
    expect(parseReply(input)).toBe(expected)
  })
})
