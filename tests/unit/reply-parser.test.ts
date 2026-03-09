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
    ['ok', 'oui'],
    ['OK', 'oui'],
    ['Ok merci', 'oui'],
    ["d'accord", 'oui'],
    ['D accord', 'oui'],
    ['dac', 'oui'],
    ['daccord', 'oui'],
    ['Confirme', 'oui'],
    ['confirm', 'oui'],
    ['confirmé', 'oui'],
    ['Confirmé !', 'oui'],
    ["c'est bon", 'oui'],
    ['C est bon merci', 'oui'],
    ['parfait', 'oui'],
    ['Parfait merci', 'oui'],
    ['super', 'oui'],
    ['Super !', 'oui'],
    ['yes', 'oui'],
    ['bien sûr', 'oui'],
    ['Bien sur', 'oui'],
    ['entendu', 'oui'],
    ['Entendu merci', 'oui'],
    ['top', 'oui'],
    ['Top !', 'oui'],
  ])('should classify "%s" as "oui" (keyword)', (input, expected) => {
    expect(parseReply(input)).toBe(expected)
  })

  it.each([
    ['annule', 'non'],
    ['Annule', 'non'],
    ['annuler', 'non'],
    ['annulation', 'non'],
    ["j'annule", 'non'],
    ['J annule', 'non'],
    ['cancel', 'non'],
    ['Cancel', 'non'],
    ['Annule merci', 'non'],
  ])('should classify "%s" as "non" (keyword)', (input, expected) => {
    expect(parseReply(input)).toBe(expected)
  })

  it.each([
    ['peut-être', 'unknown'],
    ['je sais pas', 'unknown'],
    ['random text', 'unknown'],
    ['', 'unknown'],
    ['bonjour', 'unknown'],
    ['12345', 'unknown'],
  ])('should classify "%s" as "unknown"', (input, expected) => {
    expect(parseReply(input)).toBe(expected)
  })
})
