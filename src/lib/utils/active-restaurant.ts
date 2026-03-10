export const ACTIVE_RESTAURANT_COOKIE = 'active_restaurant_id'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getActiveRestaurantId(): string | null {
  if (typeof document === 'undefined') return null
  const value = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${ACTIVE_RESTAURANT_COOKIE}=`))
    ?.split('=')[1]
  if (!value) return null
  if (!UUID_RE.test(value)) return null
  return value
}
