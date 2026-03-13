'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { TrashIcon, PaperAirplaneIcon, ChevronRightIcon, PencilIcon } from '@heroicons/react/24/outline'
import { StatusBadge } from '@/components/status-badge'
import { formatPhone } from '@/lib/utils/phone'
import { getNextSmsAction, getButtonText } from '@/lib/utils/sms-flow'
import { cn } from '@/lib/utils'
import type { Service } from '@/lib/constants'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  CheckIcon,
  ChevronDownIcon,
} from '@/components/ui/dropdown-menu'
import { fetchSmsHistory } from '@/lib/fetchers/sms-history'
import type { SmsHistory } from '@/lib/fetchers/sms-history'

interface Booking {
  id: string
  guest_name: string
  phone: string
  booking_date: string
  booking_time: string
  party_size: number
  status: string
  service: Service
  sms_sent_at?: string | null
  reminder_sent_at?: string | null
  relance_sent_at?: string | null
  reply_count?: number
}

interface BookingsTableProps {
  bookings: Booking[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  selectedStatus?: string
  onStatusChange?: (status: string) => void
  onEdit?: (bookingId: string) => void
  onSendSms?: (bookingId: string) => void
  onDelete?: (bookingId: string) => void
  deletingIds?: Set<string>
  onBulkDelete?: () => void
  onBulkSendSms?: () => void
  bulkDeleting?: boolean
  bookingsToSend?: Booking[]
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'À envoyer' },
  { value: 'sms_sent', label: 'SMS envoyé' },
  { value: 'sms_delivered', label: 'SMS reçu' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'cancelled', label: 'Annulée' },
  { value: 'to_verify', label: 'À vérifier' },
  { value: 'send_failed', label: 'Échec' },
]

export function BookingsTable({
  bookings,
  selectedIds,
  onSelectionChange,
  selectedStatus = 'all',
  onStatusChange,
  onEdit,
  onSendSms,
  onDelete,
  deletingIds,
  onBulkDelete,
  onBulkSendSms,
  bulkDeleting,
  bookingsToSend = [],
}: BookingsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const allSelected = bookings.length > 0 && bookings.every((b) => selectedIds.has(b.id))
  const hasSelections = selectedIds.size > 0

  // Fetch SMS history for expanded booking
  const { data: history, isLoading: isLoadingHistory } = useSWR<SmsHistory>(
    expandedId ? ['sms-history', expandedId] : null,
    ([_, id]) => fetchSmsHistory(id as string),
    { revalidateOnFocus: false }
  )

  function renderSmsButton(booking: Booking) {
    const state = getNextSmsAction({
      booking_date: booking.booking_date,
      sms_sent_at: booking.sms_sent_at ?? null,
      reminder_sent_at: booking.reminder_sent_at ?? null,
      relance_sent_at: booking.relance_sent_at ?? null,
      status: booking.status,
    })

    const buttonText = getButtonText(state)

    // No button if completed
    if (!buttonText) {
      return null
    }

    // Show button (enabled or disabled with tooltip)
    return (
      <button
        onClick={() => state.enabled && onSendSms?.(booking.id)}
        disabled={!state.enabled}
        title={state.enabled ? undefined : state.reason}
        className={cn(
          'inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
          state.enabled
            ? 'text-white bg-blue-600 hover:bg-blue-700 cursor-pointer focus:ring-blue-500'
            : 'text-gray-400 bg-gray-200 cursor-not-allowed'
        )}
      >
        {buttonText}
      </button>
    )
  }

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(bookings.map((b) => b.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const midi = bookings.filter((b) => b.service === 'midi')
  const soir = bookings.filter((b) => b.service === 'soir')

  function renderRows(rows: Booking[]) {
    return rows.flatMap((booking) => {
      const hasReplies = (booking.reply_count ?? 0) > 0
      const isExpanded = expandedId === booking.id

      return [
        // Main row
        <tr
          key={booking.id}
          className={cn(
            'transition-colors duration-150',
            selectedIds.has(booking.id) && 'bg-blue-50',
            hasReplies && 'hover:bg-gray-50 cursor-pointer'
          )}
          onClick={() => hasReplies && setExpandedId(isExpanded ? null : booking.id)}
        >
          {/* Expansion column */}
          <td className="px-2 py-4 whitespace-nowrap w-10">
            {hasReplies && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedId(isExpanded ? null : booking.id)
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={isExpanded ? 'Masquer les réponses SMS' : 'Afficher les réponses SMS'}
              >
                <ChevronRightIcon
                  className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    isExpanded ? 'rotate-90 text-blue-600' : 'text-gray-400'
                  )}
                />
              </button>
            )}
          </td>

          {/* Checkbox */}
          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedIds.has(booking.id)}
              onChange={() => toggleOne(booking.id)}
              className={cn(
                'rounded border-gray-300 cursor-pointer transition-opacity duration-150',
                hasSelections ? 'opacity-100' : 'opacity-40 hover:opacity-100'
              )}
            />
          </td>

          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {booking.guest_name}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
            {formatPhone(booking.phone)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {booking.booking_date.split('-').reverse().join('/')}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {booking.booking_time.slice(0, 5)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {booking.party_size}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <StatusBadge status={booking.status} />
          </td>

          {/* Actions */}
          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(booking.id)}
                  className="inline-flex items-center p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Modifier"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              )}
              {onSendSms && renderSmsButton(booking)}
              {onDelete && (
                <button
                  onClick={() => onDelete(booking.id)}
                  disabled={deletingIds?.has(booking.id)}
                  className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="Supprimer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        </tr>,

        // Expanded row (SMS history timeline)
        isExpanded && (
          <tr key={`${booking.id}-expanded`}>
            <td colSpan={9} className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              {isLoadingHistory ? (
                <div className="text-sm text-gray-500">Chargement de l&apos;historique...</div>
              ) : !history || (history.sends.length === 0 && history.replies.length === 0) ? (
                <div className="text-sm text-gray-500">Aucun historique SMS disponible</div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {renderTimeline(history, booking)}
                </div>
              )}
            </td>
          </tr>
        ),
      ].filter(Boolean)
    })
  }

  function renderTimeline(history: SmsHistory, booking: Booking) {
    // Combine sends and replies into chronological order
    type TimelineEvent =
      | { type: 'send'; data: SmsHistory['sends'][0]; timestamp: string }
      | { type: 'reply'; data: SmsHistory['replies'][0]; timestamp: string }

    const events: TimelineEvent[] = [
      ...history.sends.map((send) => ({
        type: 'send' as const,
        data: send,
        timestamp: send.created_at,
      })),
      ...history.replies.map((reply) => ({
        type: 'reply' as const,
        data: reply,
        timestamp: reply.received_at,
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return events.map((event) => {
      if (event.type === 'send') {
        const send = event.data
        const messageType = getSmsType(send, booking)

        return (
          <div
            key={`send-${send.id}`}
            className="bg-white p-3 rounded border-l-4 border-l-blue-500"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">{messageType}</span>
                  {send.delivery_status && (
                    <span className="text-xs text-gray-500">
                      {send.delivery_status === 'delivered' ? '✓ Délivré' : send.delivery_status}
                    </span>
                  )}
                </div>
                {send.error_message && (
                  <p className="text-xs text-red-600 mt-1">{send.error_message}</p>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                {formatTimestamp(send.created_at)}
              </span>
            </div>
          </div>
        )
      } else {
        const reply = event.data
        const borderColor =
          reply.interpretation === 'oui'
            ? 'border-l-green-500'
            : reply.interpretation === 'non'
            ? 'border-l-red-500'
            : 'border-l-yellow-500'

        return (
          <div
            key={`reply-${reply.id}`}
            className={cn('bg-white p-3 rounded border-l-4', borderColor)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">Réponse du client</span>
                  <StatusBadge
                    status={
                      reply.interpretation === 'oui'
                        ? 'confirmed'
                        : reply.interpretation === 'non'
                        ? 'cancelled'
                        : 'to_verify'
                    }
                  />
                </div>
                <p className="text-sm text-gray-900 mt-1">&quot;{reply.raw_text}&quot;</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                {formatTimestamp(reply.received_at)}
              </span>
            </div>
          </div>
        )
      }
    })
  }

  function getSmsType(send: SmsHistory['sends'][0], booking: Booking): string {
    // Determine if this is J-1, Jour J, or Relance based on timestamps
    if (booking.relance_sent_at && new Date(send.created_at) >= new Date(booking.relance_sent_at)) {
      return 'SMS Relance'
    }
    if (booking.reminder_sent_at && new Date(send.created_at) >= new Date(booking.reminder_sent_at)) {
      return 'SMS Jour J'
    }
    return 'SMS J-1'
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function renderSectionHeader(label: string, sectionBookings: Booking[]) {
    const count = sectionBookings.length
    const sectionIds = sectionBookings.map((b) => b.id)
    const allSectionSelected = sectionBookings.every((b) => selectedIds.has(b.id))
    const someSectionSelected = sectionBookings.some((b) => selectedIds.has(b.id))

    function toggleSection() {
      const next = new Set(selectedIds)
      if (allSectionSelected) {
        // Deselect all in section
        sectionIds.forEach((id) => next.delete(id))
      } else {
        // Select all in section
        sectionIds.forEach((id) => next.add(id))
      }
      onSelectionChange(next)
    }

    return (
      <tr>
        <td colSpan={9} className="bg-gray-100 px-6 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSectionSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someSectionSelected && !allSectionSelected
                }
              }}
              onChange={toggleSection}
              className="rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700">{label}</span>
            <span className="ml-2 text-sm text-gray-400">
              {count} réservation{count > 1 ? 's' : ''}
            </span>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Expansion column */}
            <th className="px-2 py-3 w-10" />

            {/* Checkbox column */}
            <th className="px-6 py-3 text-left">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sélection
                </span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nom
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Téléphone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Heure
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Couverts
            </th>
            <th className="px-6 py-3 text-left">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors">
                  Statut
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STATUS_FILTER_OPTIONS.map((option, index) => (
                    <div key={option.value}>
                      {index === 1 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => {
                          onStatusChange?.(option.value)
                          onSelectionChange(new Set())
                        }}
                        className="justify-between"
                      >
                        <span>{option.label}</span>
                        {selectedStatus === option.value && (
                          <CheckIcon className="h-4 w-4 text-blue-600" />
                        )}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </th>
            <th className="px-6 py-3 text-right">
              {hasSelections ? (
                <div className="flex items-center justify-end gap-1.5">
                  {onBulkDelete && (
                    <button
                      onClick={onBulkDelete}
                      disabled={bulkDeleting}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      {bulkDeleting ? 'Suppression...' : `${selectedIds.size}`}
                    </button>
                  )}
                  {onBulkSendSms && bookingsToSend.length > 0 && (
                    <button
                      onClick={onBulkSendSms}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                      <PaperAirplaneIcon className="h-3.5 w-3.5" />
                      {bookingsToSend.length}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                Aucune réservation pour cette date.
              </td>
            </tr>
          ) : (
            <>
              {midi.length > 0 && (
                <>
                  {renderSectionHeader('Midi', midi)}
                  {renderRows(midi)}
                </>
              )}
              {soir.length > 0 && (
                <>
                  {renderSectionHeader('Soir', soir)}
                  {renderRows(soir)}
                </>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
