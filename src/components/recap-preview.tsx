'use client'

import { useState } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { RecapSendModal } from '@/components/recap-send-modal'
import type { Service } from '@/lib/constants'

interface Booking {
  id: string
  guest_name: string
  booking_time: string
  party_size: number
  status: string
  service: Service
}

interface RecapPreviewProps {
  bookings: Booking[]
  restaurantId: string
  serviceDate: string
}

function RecapSection({
  bookings,
  restaurantId,
  serviceDate,
  service,
  label,
}: {
  bookings: Booking[]
  restaurantId: string
  serviceDate: string
  service: 'midi' | 'soir'
  label: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [result, setResult] = useState<{
    email_status: string
    booking_count: number
  } | null>(null)

  const confirmed = bookings.filter((b) => b.status === 'confirmed').length

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Récapitulatif {label} du {serviceDate}
          </h3>
          <p className="text-sm text-gray-500">
            {confirmed}/{bookings.length} confirmée(s)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium"
        >
          Envoyer le récapitulatif
        </button>
      </div>

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
                  {booking.booking_time.slice(0, 5)}
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

      <RecapSendModal
        open={showModal}
        onOpenChange={setShowModal}
        restaurantId={restaurantId}
        serviceDate={serviceDate}
        service={service}
        label={label}
        onSent={setResult}
      />
    </div>
  )
}

export function RecapPreview({
  bookings,
  restaurantId,
  serviceDate,
}: RecapPreviewProps) {
  const midi = bookings.filter((b) => b.service === 'midi')
  const soir = bookings.filter((b) => b.service === 'soir')

  if (midi.length === 0 && soir.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Récapitulatifs email</h2>
      {midi.length > 0 && (
        <RecapSection
          bookings={midi}
          restaurantId={restaurantId}
          serviceDate={serviceDate}
          service="midi"
          label="Midi"
        />
      )}
      {soir.length > 0 && (
        <RecapSection
          bookings={soir}
          restaurantId={restaurantId}
          serviceDate={serviceDate}
          service="soir"
          label="Soir"
        />
      )}
    </div>
  )
}
