import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importCSV } from '@/lib/services/csv-import'
import { isEditionFormat, convertEditionCSV } from '@/lib/services/edition-csv-converter'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const restaurantId = formData.get('restaurant_id') as string | null
  const mappingStr = formData.get('mapping') as string | null
  const shouldSaveMapping = formData.get('save_mapping') === 'true'
  const expectedDate = formData.get('expected_date') as string | null

  if (!file || !restaurantId) {
    return NextResponse.json(
      { error: 'Fichier et restaurant_id requis' },
      { status: 400 }
    )
  }

  const csvText = await file.text()

  if (!csvText.trim()) {
    return NextResponse.json(
      { imported: 0, updated: 0, errors: [{ row: 0, field: 'csv', message: 'Aucune réservation trouvée dans le fichier' }] }
    )
  }

  // Auto-detect Edition PMS format and convert
  const isEdition = isEditionFormat(csvText)
  let processedCsv = csvText
  if (isEdition) {
    const conversion = convertEditionCSV(csvText)
    processedCsv = conversion.csv
  }

  // Use provided mapping, or load saved mapping from restaurant
  let mapping = null
  if (mappingStr) {
    try {
      mapping = JSON.parse(mappingStr)
    } catch {
      // Invalid mapping JSON, ignore
    }
  } else {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('csv_mapping')
      .eq('id', restaurantId)
      .single()
    mapping = restaurant?.csv_mapping || null
  }

  // Save mapping to restaurant if requested
  if (shouldSaveMapping && mapping) {
    await supabase
      .from('restaurants')
      .update({ csv_mapping: mapping, updated_at: new Date().toISOString() })
      .eq('id', restaurantId)
  }

  // Edition converter already maps columns to standard names, skip mapping
  const effectiveMapping = isEdition ? null : mapping

  // Server-side date validation (safety net for all formats)
  if (expectedDate) {
    // Use PapaParse to properly handle quoted CSV values
    const parsed = Papa.parse<Record<string, string>>(processedCsv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (parsed.data.length === 0) {
      return NextResponse.json({
        imported: 0,
        updated: 0,
        errors: [{
          row: 0,
          field: 'csv',
          message: 'Aucune réservation trouvée dans le fichier'
        }]
      })
    }

    // Determine the date column name
    let dateColumnName = 'booking_date'
    if (effectiveMapping) {
      const mappedDateColumn = Object.entries(effectiveMapping).find(([, v]) => v === 'booking_date')?.[0]
      if (mappedDateColumn) {
        dateColumnName = mappedDateColumn
      }
    }

    // Check if the date column exists
    const firstRow = parsed.data[0]
    if (!(dateColumnName in firstRow) && !Object.keys(firstRow).some(k => k.toLowerCase() === 'booking_date')) {
      return NextResponse.json({
        imported: 0,
        updated: 0,
        errors: [{
          row: 0,
          field: 'booking_date',
          message: "La colonne 'booking_date' est introuvable dans le fichier CSV"
        }]
      })
    }

    // Find actual column name (case-insensitive fallback)
    const actualDateColumn = dateColumnName in firstRow
      ? dateColumnName
      : Object.keys(firstRow).find(k => k.toLowerCase() === 'booking_date') || dateColumnName

    // Check all data rows for mismatched dates
    const mismatchedDates = new Set<string>()
    for (const row of parsed.data) {
      const dateValue = effectiveMapping
        ? row[actualDateColumn]
        : (row[actualDateColumn] || row['booking_date'])

      if (dateValue && dateValue !== expectedDate) {
        mismatchedDates.add(dateValue)
      }
    }

    if (mismatchedDates.size > 0) {
      const dates = Array.from(mismatchedDates).join(', ')
      return NextResponse.json({
        imported: 0,
        updated: 0,
        errors: [{
          row: 0,
          field: 'booking_date',
          message: `Le fichier contient des réservations pour d'autres dates que ${expectedDate}. Dates trouvées : ${dates}`
        }]
      })
    }
  }

  const result = await importCSV(processedCsv, restaurantId, {
    upsertBooking: async (data) => {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('restaurant_id', data.restaurant_id)
        .eq('phone', data.phone)
        .eq('booking_date', data.booking_date)
        .eq('booking_time', data.booking_time)
        .single()

      if (existing) {
        await supabase
          .from('bookings')
          .update({
            guest_name: data.guest_name,
            party_size: data.party_size,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        return { isNew: false }
      }

      const { status, error_reason, ...bookingFields } = data
      await supabase.from('bookings').insert({
        ...bookingFields,
        ...(status ? { status, error_reason } : {}),
      })
      return { isNew: true }
    },
  }, effectiveMapping)

  return NextResponse.json(result)
}
