import Papa from 'papaparse'
import { bookingRowSchema } from '@/lib/validators/booking'
import { toE164 } from '@/lib/utils/phone'

interface ImportError {
  row: number
  field: string
  message: string
}

interface ImportResult {
  imported: number
  updated: number
  errors: ImportError[]
}

interface ColumnMapping {
  [csvColumn: string]: string
}

interface DBCallbacks {
  upsertBooking: (data: {
    restaurant_id: string
    guest_name: string
    phone: string
    booking_date: string
    booking_time: string
    party_size: number
  }) => Promise<{ isNew: boolean }>
}

function applyMapping(
  row: Record<string, string>,
  mapping: ColumnMapping | null
): Record<string, string> {
  if (!mapping) return row

  const mapped: Record<string, string> = {}
  for (const [csvCol, targetField] of Object.entries(mapping)) {
    if (row[csvCol] !== undefined) {
      mapped[targetField] = row[csvCol]
    }
  }
  return mapped
}

export async function importCSV(
  csvText: string,
  restaurantId: string,
  db: DBCallbacks,
  mapping: ColumnMapping | null = null
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, errors: [] }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      result.errors.push({
        row: (error.row ?? 0) + 2, // +2 for header row + 0-indexed
        field: 'csv',
        message: `Erreur de parsing: ${error.message}`,
      })
    }
  }

  for (let i = 0; i < parsed.data.length; i++) {
    const rowNumber = i + 2 // +2 for header row + 0-indexed
    const rawRow = parsed.data[i]
    const row = applyMapping(rawRow, mapping)

    // Convert phone to E.164 before validation
    if (row.phone) {
      const e164 = toE164(row.phone)
      if (e164) {
        row.phone = e164
      } else {
        result.errors.push({
          row: rowNumber,
          field: 'phone',
          message: 'Format de téléphone invalide',
        })
        continue
      }
    }

    const validation = bookingRowSchema.safeParse(row)

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        result.errors.push({
          row: rowNumber,
          field: issue.path[0] as string,
          message: issue.message,
        })
      }
      continue
    }

    try {
      const { isNew } = await db.upsertBooking({
        restaurant_id: restaurantId,
        guest_name: validation.data.guest_name,
        phone: validation.data.phone,
        booking_date: validation.data.booking_date,
        booking_time: validation.data.booking_time,
        party_size: validation.data.party_size,
      })

      if (isNew) {
        result.imported++
      } else {
        result.updated++
      }
    } catch (error) {
      result.errors.push({
        row: rowNumber,
        field: 'database',
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'enregistrement",
      })
    }
  }

  return result
}
