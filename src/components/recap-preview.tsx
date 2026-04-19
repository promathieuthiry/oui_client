'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { StatusBadge } from '@/components/status-badge'
import { RecapSendModal } from '@/components/recap-send-modal'
import { RECAP_SCHEDULE_PARIS, type Service } from '@/lib/constants'
import { useRecapStatus } from '@/lib/hooks/use-recap-status'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import { formatParisDateTime } from '@/lib/utils/date'

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

  const { status, sentAt, bookingCount, mutate: mutateStatus } = useRecapStatus(
    restaurantId,
    serviceDate,
    service
  )
  const { restaurants } = useRestaurants()
  const restaurantEmail = restaurants.find((r) => r.id === restaurantId)?.email

  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const scheduledTime = RECAP_SCHEDULE_PARIS[service]
  const buttonLabel = status === 'sent' ? 'Renvoyer maintenant' : 'Envoyer maintenant'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
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
          className="inline-flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-medium whitespace-nowrap"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>

      {status === 'sent' && sentAt && (
        <div className="flex items-start gap-3 border-l-4 border-green-500 bg-green-50 px-4 py-3 rounded-r">
          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-800">
              Envoyé le {formatParisDateTime(sentAt)}
            </p>
            <p className="text-green-700">
              {restaurantEmail ? `Destinataire : ${restaurantEmail}` : 'Envoyé'}
              {bookingCount !== null
                ? ` · ${bookingCount} réservation${bookingCount > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
        </div>
      )}
      {status === 'failed' && (
        <div className="flex items-start gap-3 border-l-4 border-red-500 bg-red-50 px-4 py-3 rounded-r">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-800">
              Échec de l&apos;envoi automatique prévu à {scheduledTime}
            </p>
            <p className="text-red-700">
              Cliquez sur « Envoyer maintenant » pour réessayer manuellement.
            </p>
          </div>
        </div>
      )}
      {status === 'not_sent' && (
        <div className="flex items-start gap-3 border-l-4 border-blue-400 bg-blue-50 px-4 py-3 rounded-r">
          <ClockIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">
              Envoi automatique prévu à {scheduledTime}
            </p>
            <p className="text-blue-700">
              Vous pouvez aussi l&apos;envoyer dès maintenant.
            </p>
          </div>
        </div>
      )}

      {result && result.email_status === 'failed' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          Échec de l&apos;envoi manuel — veuillez réessayer.
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
        onSent={(r) => {
          setResult(r)
          mutateStatus()
        }}
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
