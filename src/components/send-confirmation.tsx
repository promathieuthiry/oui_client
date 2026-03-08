'use client'

import { useState } from 'react'
import { maskPhone } from '@/lib/utils/phone'

interface Booking {
  id: string
  phone: string
  guest_name: string
}

interface SendConfirmationProps {
  bookings: Booking[]
  restaurantId: string
  bookingDate: string
  onSendComplete?: () => void
  onCancel?: () => void
}

export function SendConfirmation({
  bookings,
  restaurantId,
  bookingDate,
  onSendComplete,
  onCancel,
}: SendConfirmationProps) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    sent: number
    failed: number
    skipped: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          booking_date: bookingDate,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Erreur lors de l'envoi des SMS")
      }

      const data = await response.json()
      setResult(data)
      onSendComplete?.()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'envoi"
      )
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Envoi terminé</h3>
        <div className="space-y-1 text-sm">
          <p className="text-green-600">{result.sent} SMS envoyé(s)</p>
          {result.failed > 0 && (
            <p className="text-red-600">{result.failed} échec(s)</p>
          )}
          {result.skipped > 0 && (
            <p className="text-gray-500">{result.skipped} ignoré(s) (déjà envoyés)</p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Fermer
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Confirmer l&apos;envoi des SMS
      </h3>

      <p className="text-sm text-gray-600">
        {bookings.length} SMS seront envoyés pour le {bookingDate} :
      </p>

      <ul className="text-sm text-gray-500 space-y-1 max-h-40 overflow-y-auto">
        {bookings.map((b) => (
          <li key={b.id} className="font-mono">
            {b.guest_name} — {maskPhone(b.phone)}
          </li>
        ))}
      </ul>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleSend}
          disabled={sending}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {sending ? 'Envoi en cours...' : 'Envoyer les SMS'}
        </button>
        <button
          onClick={onCancel}
          disabled={sending}
          className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
