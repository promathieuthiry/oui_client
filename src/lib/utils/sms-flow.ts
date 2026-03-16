/**
 * Sequential SMS flow state management
 * Enforces strict progression: Rappel J-1 → Relance (or Rappel Jour J → Relance for same-day bookings)
 */

import { isDateToday } from './date'

export type SmsFlowState =
  | { type: 'rappel_j1'; enabled: true }
  | { type: 'rappel_jj'; enabled: boolean; reason?: string }
  | { type: 'relance'; enabled: true }
  | { type: 'completed'; enabled: false }

/**
 * Determine the next SMS action in the sequence for a booking
 *
 * Decision logic:
 * 1. If confirmed/to_verify/cancelled → completed (no button)
 * 2. If no SMS sent:
 *    - If booking_date === today → rappel_jj (enabled) - skip J-1 for same-day bookings
 *    - Else → rappel_j1 (enabled)
 * 3. If J-1 sent → relance (enabled) - skip Jour J for bookings with J-1
 * 4. If Jour J sent, not Relance → relance (enabled)
 * 5. If all sent → completed (no button)
 */
export function getNextSmsAction(booking: {
  booking_date: string
  sms_sent_at: string | null
  reminder_sent_at: string | null
  relance_sent_at: string | null
  status: string
}): SmsFlowState {
  // If booking is confirmed, to_verify, or cancelled, no more SMS needed
  if (booking.status === 'confirmed' || booking.status === 'to_verify' || booking.status === 'cancelled') {
    return { type: 'completed', enabled: false }
  }

  const hasJ1 = booking.sms_sent_at !== null
  const hasJJ = booking.reminder_sent_at !== null
  const hasRelance = booking.relance_sent_at !== null
  const isBookingToday = isDateToday(booking.booking_date)

  // All SMS sent → completed
  if (hasRelance) {
    return { type: 'completed', enabled: false }
  }

  // Jour J sent, waiting for relance
  if (hasJJ) {
    return { type: 'relance', enabled: true }
  }

  // J-1 sent → skip Jour J, go directly to Relance
  if (hasJ1) {
    return { type: 'relance', enabled: true }
  }

  // No SMS sent yet
  if (isBookingToday) {
    // Same-day booking → skip J-1, go directly to Jour J
    return { type: 'rappel_jj', enabled: true }
  } else {
    // Future booking → start with J-1
    return { type: 'rappel_j1', enabled: true }
  }
}

/**
 * Get button text for the current SMS flow state
 * Returns null if no button should be shown (completed state)
 */
export function getButtonText(state: SmsFlowState): string | null {
  switch (state.type) {
    case 'rappel_j1':
      return 'Envoyer Rappel J-1'
    case 'rappel_jj':
      return 'Envoyer Rappel Jour J'
    case 'relance':
      return 'Relancer'
    case 'completed':
      return null
  }
}
