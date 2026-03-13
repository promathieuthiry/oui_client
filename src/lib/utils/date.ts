/**
 * Date utility functions for SMS booking feature
 * Uses browser local timezone (acceptable for French restaurant context)
 */

/**
 * Check if a UTC timestamp is today in browser's local timezone
 */
export function isToday(utcTimestamp: string | null): boolean {
  if (!utcTimestamp) return false

  const date = new Date(utcTimestamp)
  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

/**
 * Check if a YYYY-MM-DD date string is today in browser's local timezone
 */
export function isDateToday(isoDate: string): boolean {
  // Use local timezone (fr-CA gives YYYY-MM-DD format)
  // Avoids UTC bug where after 23h/22h local time, UTC date is already tomorrow
  const today = new Date().toLocaleDateString('fr-CA')
  return isoDate === today
}

/**
 * Check if a YYYY-MM-DD date string is tomorrow in browser's local timezone
 */
export function isDateTomorrow(isoDate: string): boolean {
  // Use local timezone (fr-CA gives YYYY-MM-DD format)
  // Avoids UTC bug where after 23h/22h local time, UTC date is already tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('fr-CA')
  return isoDate === tomorrowStr
}

/**
 * Check if relance is allowed (SMS sent today)
 * Used to determine if "Envoyer Relance" button should appear
 */
export function canSendRelance(sms_sent_at: string | null): boolean {
  return isToday(sms_sent_at)
}

/**
 * Determine the appropriate message type based on booking date and SMS status
 * Auto-selection logic for SMS template in SendConfirmation modal
 *
 * @returns '' for J-1, 'jj' for Jour J, 'relance' for relance
 */
export function determineMessageType(
  booking_date: string,
  sms_sent_at: string | null
): '' | 'jj' | 'relance' {
  // Priority 1: If SMS sent today -> Relance
  if (canSendRelance(sms_sent_at)) {
    return 'relance'
  }

  // Priority 2: If booking today -> Jour J
  if (isDateToday(booking_date)) {
    return 'jj'
  }

  // Priority 3: If booking tomorrow -> J-1
  if (isDateTomorrow(booking_date)) {
    return ''
  }

  // Fallback: J-1 (for bookings in the future)
  return ''
}
