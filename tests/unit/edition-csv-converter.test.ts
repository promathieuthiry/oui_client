import { describe, it, expect } from 'vitest'
import { isEditionFormat, convertEditionCSV } from '@/lib/services/edition-csv-converter'

const SAMPLE_CSV = `Editions > Réservations > Listes > Réservations restaurant,,,,,,,,,
Le 14/03/2026,,,,,,,,,
,,,,,,,,,
,,,,,,,,,
,,,,,,,,,
,,,,,,,,,
"Etats :Option, Confirmé, Annulé, Présent, Parti",,,,,,,,,
Surbooks uniquement :Non,,,,,,,,,
,,,,,,,,,
09/03/2026 15:50,,,,,,,,,
 ,,,,,,,,,
Heure,Table,Cvts,Nom,Prénom,Package,Chambre,Téléphone,Etat,Surbk
Hôtel Le Grand Large,,,,,,,,,
samedi 14 mars 2026,,,,,,,,,
MIDI,,,,,,,,,
12:45,08," 4,00 ",MONIQUE,,,,0687836648,Confirmé,Non
13:15,02," 4,00 ",ROBIN,,,,+33672733182,Confirmé,Non
13:15,06," 3,00 ",TOVAGLIARI SÉBASTIEN,,,,4915150634427,Confirmé,Non
Total MIDI : 3 réservation(s) - 11 couvert(s),,,,,,,,,
SOIR,,,,,,,,,
19:15,01," 2,00 ",Fabing,Jules,,n°17,+33682630827,Confirmé,Non
19:30,05," 2,00 ",Guinoiseau,Charlène,,n°06,+33771122752,Confirmé,Non
Total SOIR : 2 réservation(s) - 4 couvert(s),,,,,,,,,
Total 14/03/2026 : 5 réservation(s) - 15 couvert(s),,,,,,,,,
Total Hôtel Le Grand Large : 5 réservation(s) - 15 couvert(s),,,,,,,,,`

describe('isEditionFormat', () => {
  it('should detect Edition format', () => {
    expect(isEditionFormat(SAMPLE_CSV)).toBe(true)
  })

  it('should not detect standard CSV', () => {
    expect(isEditionFormat('guest_name,phone,booking_date,booking_time,party_size\n')).toBe(false)
  })
})

describe('convertEditionCSV', () => {
  it('should convert full sample to 5 bookings', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    expect(result.bookingCount).toBe(5)
    expect(result.skippedCount).toBe(0)
  })

  it('should produce correct standard CSV header', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const firstLine = result.csv.split('\n')[0]
    expect(firstLine).toBe('guest_name,phone,booking_date,booking_time,party_size')
  })

  it('should correctly parse guest names (last name only)', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const lines = result.csv.split('\n')
    // MONIQUE has no prénom
    expect(lines[1]).toContain('"MONIQUE"')
  })

  it('should correctly parse guest names (prénom + nom)', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const lines = result.csv.split('\n')
    // Fabing,Jules → Jules Fabing
    expect(lines[4]).toContain('"Jules Fabing"')
  })

  it('should parse French date correctly', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const lines = result.csv.split('\n')
    // All bookings should have date 2026-03-14
    for (let i = 1; i <= 5; i++) {
      expect(lines[i]).toContain('2026-03-14')
    }
  })

  it('should parse party size from French decimal format', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const lines = result.csv.split('\n')
    // " 4,00 " → 4
    expect(lines[1]).toMatch(/,4$/)
    // " 3,00 " → 3
    expect(lines[3]).toMatch(/,3$/)
    // " 2,00 " → 2
    expect(lines[4]).toMatch(/,2$/)
  })

  it('should preserve phone numbers as-is', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const lines = result.csv.split('\n')
    expect(lines[1]).toContain('0687836648')
    expect(lines[2]).toContain('+33672733182')
    expect(lines[3]).toContain('4915150634427')
  })

  it('should parse booking times correctly', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const lines = result.csv.split('\n')
    expect(lines[1]).toContain('12:45')
    expect(lines[4]).toContain('19:15')
    expect(lines[5]).toContain('19:30')
  })

  it('should skip non-Confirmé rows', () => {
    const csvWithAnnule = SAMPLE_CSV.replace(
      '19:30,05," 2,00 ",Guinoiseau,Charlène,,n°06,+33771122752,Confirmé,Non',
      '19:30,05," 2,00 ",Guinoiseau,Charlène,,n°06,+33771122752,Annulé,Non'
    )
    const result = convertEditionCSV(csvWithAnnule)
    expect(result.bookingCount).toBe(4)
    expect(result.skippedCount).toBe(1)
  })

  it('should skip metadata, total, and section lines', () => {
    const result = convertEditionCSV(SAMPLE_CSV)
    const csvOutput = result.csv
    expect(csvOutput).not.toContain('Total')
    expect(csvOutput).not.toContain('MIDI')
    expect(csvOutput).not.toContain('SOIR')
    expect(csvOutput).not.toContain('Editions')
    expect(csvOutput).not.toContain('Hôtel Le Grand Large')
  })

  it('should handle all 12 French months', () => {
    const months = [
      ['janvier', '01'], ['février', '02'], ['mars', '03'], ['avril', '04'],
      ['mai', '05'], ['juin', '06'], ['juillet', '07'], ['août', '08'],
      ['septembre', '09'], ['octobre', '10'], ['novembre', '11'], ['décembre', '12'],
    ]

    for (const [monthName, monthNum] of months) {
      const csv = SAMPLE_CSV.replace('samedi 14 mars 2026', `lundi 5 ${monthName} 2026`)
      const result = convertEditionCSV(csv)
      const lines = result.csv.split('\n')
      expect(lines[1]).toContain(`2026-${monthNum}-05`)
    }
  })

  it('should return empty result for non-Edition CSV', () => {
    const result = convertEditionCSV('guest_name,phone\nJohn,+33612345678\n')
    expect(result.bookingCount).toBe(0)
    expect(result.csv).toBe('guest_name,phone,booking_date,booking_time,party_size\n')
  })
})
