import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importCSV } from '@/lib/services/csv-import'

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

  const result = await importCSV(csvText, restaurantId, {
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

      await supabase.from('bookings').insert(data)
      return { isNew: true }
    },
  }, mapping)

  return NextResponse.json(result)
}
