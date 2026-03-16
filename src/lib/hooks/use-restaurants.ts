import useSWR from 'swr'

export interface Restaurant {
  id: string
  name: string
  email: string
  sms_template: string
  sms_template_jj: string
  sms_template_relance: string
  csv_mapping: Record<string, string> | null
  sms_send_time: string
  recap_send_time: string
  created_at: string
}

interface RestaurantsData {
  restaurants: Restaurant[]
  activeRestaurantId: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useRestaurants() {
  const { data, error, isLoading, mutate } = useSWR<RestaurantsData>(
    '/api/restaurants',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    restaurants: data?.restaurants ?? [],
    activeRestaurantId: data?.activeRestaurantId ?? null,
    isLoading,
    isError: error,
    mutate,
  }
}
