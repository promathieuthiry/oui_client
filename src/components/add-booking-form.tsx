'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { bookingRowSchema } from '@/lib/validators/booking'
import { toE164 } from '@/lib/utils/phone'

interface AddBookingFormProps {
  restaurantId: string
  bookingDate: string
  onSuccess: () => void
  onCancel: () => void
}

export function AddBookingForm({
  restaurantId,
  bookingDate,
  onSuccess,
  onCancel,
}: AddBookingFormProps) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(bookingDate)
  const [time, setTime] = useState('')
  const [partySize, setPartySize] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const normalizedPhone = toE164(phone)
    if (!normalizedPhone) {
      setError('Numéro de téléphone invalide')
      return
    }

    const result = bookingRowSchema.safeParse({
      guest_name: guestName,
      phone: normalizedPhone,
      booking_date: date,
      booking_time: time,
      party_size: partySize,
    })

    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setSubmitting(true)

    const supabase = createClient()
    const { error: insertError } = await supabase.from('bookings').insert({
      restaurant_id: restaurantId,
      guest_name: result.data.guest_name,
      phone: result.data.phone,
      booking_date: result.data.booking_date,
      booking_time: result.data.booking_time,
      party_size: result.data.party_size,
      status: 'pending',
    })

    if (insertError) {
      setError("Erreur lors de l'ajout : " + insertError.message)
      setSubmitting(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Ajouter une réservation
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="guest_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nom
            </label>
            <input
              id="guest_name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="booking_date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <input
              id="booking_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {submitting ? 'Ajout...' : 'Ajouter'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
