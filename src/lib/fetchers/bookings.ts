import { createClient } from '@/lib/supabase/client'

export async function fetchBookings(params: {
  restaurantId: string
  selectedDate: string
}) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      reply_count:sms_replies(count)
    `)
    .eq('restaurant_id', params.restaurantId)
    .eq('booking_date', params.selectedDate)
    .order('booking_time', { ascending: true })

  if (error) throw error

  // Transform the reply_count from array to number
  return (data || []).map((booking) => ({
    ...booking,
    reply_count: booking.reply_count?.[0]?.count ?? 0,
  }))
}
