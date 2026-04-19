import useSWR from 'swr'

export type RecapStatus = 'sent' | 'failed' | 'not_sent'

export interface RecapStatusData {
  status: RecapStatus
  sent_at: string | null
  resend_id: string | null
  booking_count: number | null
}

const fetcher = async (url: string): Promise<RecapStatusData> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to load recap status')
  }
  return res.json()
}

export function recapStatusKey(
  restaurantId: string,
  serviceDate: string,
  service: 'midi' | 'soir'
): string {
  const params = new URLSearchParams({
    restaurant_id: restaurantId,
    service_date: serviceDate,
    service,
  })
  return `/api/recaps/status?${params.toString()}`
}

export function useRecapStatus(
  restaurantId: string | null,
  serviceDate: string,
  service: 'midi' | 'soir'
) {
  const key = restaurantId
    ? recapStatusKey(restaurantId, serviceDate, service)
    : null

  const { data, error, isLoading, mutate } = useSWR<RecapStatusData>(
    key,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 60_000,
    }
  )

  return {
    status: data?.status ?? 'not_sent',
    sentAt: data?.sent_at ?? null,
    resendId: data?.resend_id ?? null,
    bookingCount: data?.booking_count ?? null,
    isLoading,
    isError: error,
    mutate,
  }
}
