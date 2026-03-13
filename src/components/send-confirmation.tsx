'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { formatPhone, formatDateFr } from '@/lib/utils/phone'
import { getNextSmsAction } from '@/lib/utils/sms-flow'
import { createClient } from '@/lib/supabase/client'

interface Booking {
  id: string
  phone: string
  guest_name: string
  booking_date: string
  booking_time: string
  party_size: number
  sms_sent_at?: string | null
  reminder_sent_at?: string | null
  relance_sent_at?: string | null
  status: string
}

interface Restaurant {
  id: string
  name: string
  sms_template: string
  sms_template_jj: string
  sms_template_relance: string
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
  const [templateType, setTemplateType] = useState<'' | 'jj' | 'relance'>('')
  const [result, setResult] = useState<{
    sent: number
    failed: number
    skipped: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch restaurant data on mount
  useEffect(() => {
    async function fetchRestaurant() {
      const supabase = createClient()

      const { data } = await supabase
        .from('restaurants')
        .select('id, name, sms_template, sms_template_jj, sms_template_relance')
        .eq('id', restaurantId)
        .single()

      setRestaurant(data)
      setLoading(false)
    }
    fetchRestaurant()
  }, [restaurantId])

  // Auto-set template type based on sequential SMS flow
  useEffect(() => {
    if (bookings.length === 0) return

    const firstBooking = bookings[0]
    const state = getNextSmsAction({
      booking_date: firstBooking.booking_date,
      sms_sent_at: firstBooking.sms_sent_at ?? null,
      reminder_sent_at: firstBooking.reminder_sent_at ?? null,
      relance_sent_at: firstBooking.relance_sent_at ?? null,
      status: firstBooking.status,
    })

    // Map state type to template type
    const typeMap: Record<string, '' | 'jj' | 'relance'> = {
      'rappel_j1': '',
      'rappel_jj': 'jj',
      'relance': 'relance',
      'completed': ''
    }

    setTemplateType(typeMap[state.type] ?? '')
  }, [bookings])

  // Populate customMessage when template type changes
  useEffect(() => {
    if (!restaurant) return

    const template = templateType === 'jj'
      ? restaurant.sms_template_jj
      : templateType === 'relance'
      ? restaurant.sms_template_relance
      : restaurant.sms_template

    setCustomMessage(template || '')
  }, [templateType, restaurant])

  // Generate preview with first booking's data
  function renderPreview(): string {
    if (!restaurant || !customMessage || bookings.length === 0) return ''

    const firstBooking = bookings[0]
    return customMessage
      .replace(/\{restaurant\}/g, restaurant.name)
      .replace(/\{date\}/g, formatDateFr(firstBooking.booking_date))
      .replace(/\{heure\}/g, firstBooking.booking_time.slice(0, 5))
      .replace(/\{couverts\}/g, String(firstBooking.party_size))
      .replace(/\{nom\}/g, firstBooking.guest_name)
  }

  async function handleSend() {
    setSending(true)
    setError(null)

    // Determine SMS type from template type
    const smsTypeMap: Record<'' | 'jj' | 'relance', 'rappel_j1' | 'rappel_jj' | 'relance'> = {
      '': 'rappel_j1',
      'jj': 'rappel_jj',
      'relance': 'relance'
    }
    const smsType = smsTypeMap[templateType]

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          booking_date: bookingDate,
          booking_ids: bookings.map((b) => b.id),
          custom_message: customMessage,
          sms_type: smsType,
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
      <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel?.()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
              Envoi terminé
            </Dialog.Title>
            <Dialog.Description className="space-y-1 text-sm mb-6">
              <p className="text-green-600">{result.sent} SMS envoyé(s)</p>
              {result.failed > 0 && (
                <p className="text-red-600">{result.failed} échec(s)</p>
              )}
              {result.skipped > 0 && (
                <p className="text-gray-500">{result.skipped} ignoré(s) (déjà envoyés)</p>
              )}
            </Dialog.Description>
            <div className="flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Fermer
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  if (loading) {
    return (
      <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel?.()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <p className="text-sm text-gray-500">Chargement...</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && !sending && onCancel?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Confirmer l&apos;envoi des SMS
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-4">
            {bookings.length} SMS seront envoyés pour le {formatDateFr(bookingDate)} :
          </Dialog.Description>

          <ul className="text-sm text-gray-500 space-y-1 max-h-40 overflow-y-auto mb-4">
            {bookings.map((b) => (
              <li key={b.id} className="font-mono">
                {b.guest_name} — {formatPhone(b.phone)}
              </li>
            ))}
          </ul>

          <div className="bg-gray-50 border border-gray-200 p-3 rounded mb-4">
            <p className="text-sm text-gray-700 mb-1">Type de SMS</p>
            <p className="text-base font-semibold text-gray-900">
              {templateType === '' && 'Rappel J-1'}
              {templateType === 'jj' && 'Rappel Jour J'}
              {templateType === 'relance' && 'Relance'}
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-gray-700">
              Message personnalisable
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              maxLength={612}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              placeholder="Sélectionnez un modèle ci-dessus..."
            />
            <div className="flex justify-between items-center text-xs">
              <p className="text-gray-500">
                Placeholders : {'{restaurant}'}, {'{nom}'}, {'{date}'}, {'{heure}'}, {'{couverts}'}
              </p>
              <p className={`font-mono ${customMessage.length > 612 ? 'text-red-600' : customMessage.length > 480 ? 'text-orange-600' : 'text-gray-500'}`}>
                {customMessage.length}/612 caractères ({Math.ceil(customMessage.length / 160)} SMS)
              </p>
            </div>
          </div>

          {customMessage && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2 mb-4">
              <p className="text-xs font-medium text-gray-700">
                Aperçu (exemple avec {bookings[0]?.guest_name})
              </p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                {renderPreview()}
              </p>
              <p className="text-xs text-gray-500 italic">
                Le message sera personnalisé pour chaque réservation
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex space-x-3 justify-end mt-6">
            <button
              onClick={onCancel}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !customMessage.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Envoi en cours...' : 'Envoyer les SMS'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
