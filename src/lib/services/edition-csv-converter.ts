import Papa from 'papaparse'

const FRENCH_MONTHS: Record<string, string> = {
  janvier: '01',
  février: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  août: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  décembre: '12',
}

export interface ConversionResult {
  csv: string
  bookingCount: number
  skippedCount: number
}

/**
 * Detect whether raw CSV text is in Edition PMS format
 * by looking for the characteristic column header row.
 */
export function isEditionFormat(csvText: string): boolean {
  return csvText.includes('Heure,Table,Cvts,Nom,')
}

/**
 * Parse a French date line like "samedi 14 mars 2026" → "2026-03-14"
 */
function parseFrenchDate(line: string): string | null {
  // Match: day-of-week day month year
  const match = line
    .trim()
    .match(/^[a-zA-ZÀ-ÿ]+\s+(\d{1,2})\s+([a-zA-ZÀ-ÿ]+)\s+(\d{4})$/)
  if (!match) return null

  const [, day, monthName, year] = match
  const month = FRENCH_MONTHS[monthName.toLowerCase()]
  if (!month) return null

  return `${year}-${month}-${day.padStart(2, '0')}`
}

/**
 * Parse French decimal party size like " 4,00 " → 4
 */
function parsePartySizeEdition(raw: string): number {
  const cleaned = raw.trim().replace(',', '.')
  return Math.round(parseFloat(cleaned))
}

/**
 * Convert Edition PMS CSV to the standard CSV format expected by importCSV().
 *
 * Standard format columns: guest_name,phone,booking_date,booking_time,party_size
 */
export function convertEditionCSV(rawText: string): ConversionResult {
  const lines = rawText.split('\n')

  // Find the header row
  const headerIndex = lines.findIndex((l) => l.startsWith('Heure,Table,Cvts,Nom,'))
  if (headerIndex === -1) {
    return { csv: 'guest_name,phone,booking_date,booking_time,party_size\n', bookingCount: 0, skippedCount: 0 }
  }

  // Parse header to get column indices
  const headerParsed = Papa.parse<string[]>(lines[headerIndex], { header: false })
  const headers = headerParsed.data[0]
  const colIndex = {
    heure: headers.indexOf('Heure'),
    cvts: headers.indexOf('Cvts'),
    nom: headers.indexOf('Nom'),
    prenom: headers.indexOf('Prénom'),
    telephone: headers.indexOf('Téléphone'),
    etat: headers.indexOf('Etat'),
  }

  const rows: string[][] = []
  let currentDate: string | null = null
  let skippedCount = 0

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse every line with PapaParse to handle quoted fields with commas
    const parsed = Papa.parse<string[]>(line, { header: false })
    const cols = parsed.data[0]
    if (!cols || cols.length === 0) continue

    const firstCol = cols[0]?.trim() || ''

    // Check for date line (first column contains "samedi 14 mars 2026")
    const parsedDate = parseFrenchDate(firstCol)
    if (parsedDate) {
      currentDate = parsedDate
      continue
    }

    // Skip section markers, totals, and restaurant name lines
    if (/^(MIDI|SOIR)\b/.test(firstCol)) continue
    if (/^Total\s/.test(firstCol)) continue

    // Data row: first column must be a time pattern
    if (!/^\d{1,2}:\d{2}$/.test(firstCol)) continue
    if (cols.length < headers.length) continue

    const time = firstCol

    // Check status — only include Confirmé
    const etat = cols[colIndex.etat]?.trim()
    if (etat !== 'Confirmé') {
      skippedCount++
      continue
    }

    if (!currentDate) continue

    const nom = cols[colIndex.nom]?.trim() || ''
    const prenom = cols[colIndex.prenom]?.trim() || ''
    const guestName = prenom ? `${prenom} ${nom}` : nom
    const phone = cols[colIndex.telephone]?.trim() || ''
    const partySize = parsePartySizeEdition(cols[colIndex.cvts] || '0')

    if (!guestName || !phone) continue

    rows.push([guestName, phone, currentDate, time, String(partySize)])
  }

  // Build standard CSV output
  const csvLines = ['guest_name,phone,booking_date,booking_time,party_size']
  for (const row of rows) {
    // Quote guest_name in case it contains commas
    csvLines.push(`"${row[0]}",${row[1]},${row[2]},${row[3]},${row[4]}`)
  }

  return {
    csv: csvLines.join('\n') + '\n',
    bookingCount: rows.length,
    skippedCount,
  }
}
