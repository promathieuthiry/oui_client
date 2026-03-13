import { createClient } from '@/lib/supabase/client'

export async function fetchBookings(params: {
  restaurantId: string
  selectedDate: string
}) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('restaurant_id', params.restaurantId)
    .eq('booking_date', params.selectedDate)
    .order('booking_time', { ascending: true })

  if (error) throw error
  return data || []
}
