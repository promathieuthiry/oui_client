'use client'

import { useState } from 'react'
import { bookingRowSchema } from '@/lib/validators/booking'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Booking {
  id: string
  guest_name: string
  phone: string
  booking_date: string
  booking_time: string
  party_size: number
  status: string
}

interface EditBookingModalProps {
  booking: Booking
  onSuccess: () => void
  onCancel: () => void
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'À envoyer' },
  { value: 'sms_sent', label: 'SMS envoyé' },
  { value: 'sms_delivered', label: 'SMS reçu' },
  { value: 'relance_sent', label: 'Relancé' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'cancelled', label: 'Annulée' },
  { value: 'to_verify', label: 'À vérifier' },
  { value: 'send_failed', label: 'Échec' },
]

export function EditBookingModal({
  booking,
  onSuccess,
  onCancel,
}: EditBookingModalProps) {
  const [time, setTime] = useState(booking.booking_time.slice(0, 5))
  const [partySize, setPartySize] = useState(booking.party_size.toString())
  const [status, setStatus] = useState(booking.status)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate the fields using Zod
    const validationResult = bookingRowSchema
      .pick({
        booking_time: true,
        party_size: true,
      })
      .safeParse({
        booking_time: time,
        party_size: partySize,
      })

    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message)
      return
    }

    setSubmitting(true)

    // Optimistic update using fetch API
    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_time: time,
        party_size: Number(partySize),
        status,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Erreur lors de la mise à jour')
      setSubmitting(false)
      return
    }

    onSuccess()
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier la réservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="booking_time"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Heure
            </label>
            <input
              id="booking_time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="party_size"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Couverts
            </label>
            <input
              id="party_size"
              type="number"
              min={1}
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Statut
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
