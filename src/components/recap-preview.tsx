'use client'

import { useState } from 'react'
import { StatusBadge } from '@/components/status-badge'

interface Booking {
  id: string
  guest_name: string
  booking_time: string
  party_size: number
  status: string
}

interface RecapPreviewProps {
  bookings: Booking[]
  restaurantId: string
  serviceDate: string
}

export function RecapPreview({
  bookings,
  restaurantId,
  serviceDate,
}: RecapPreviewProps) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    email_status: string
    booking_count: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/recap/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          service_date: serviceDate,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Erreur lors de l'envoi du récapitulatif")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi"
      )
    } finally {
      setSending(false)
    }
  }

  if (bookings.length === 0) {
    return null
  }

  const confirmed = bookings.filter((b) => b.status === 'confirmed').length

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Récapitulatif du {serviceDate}
          </h3>
          <p className="text-sm text-gray-500">
            {confirmed}/{bookings.length} confirmée(s)
          </p>
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          {sending ? 'Envoi...' : 'Envoyer le récapitulatif'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`px-4 py-3 rounded text-sm ${
            result.email_status === 'sent'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {result.email_status === 'sent'
            ? `Récapitulatif envoyé (${result.booking_count} réservations)`
            : "Échec de l'envoi du récapitulatif"}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Nom
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Heure
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Couverts
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-4 py-2 text-sm text-gray-900">
                  {booking.guest_name}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {booking.booking_time}
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {booking.party_size}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
