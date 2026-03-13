'use client'

import { TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { StatusBadge } from '@/components/status-badge'
import { formatPhone } from '@/lib/utils/phone'
import { getNextSmsAction, getButtonText } from '@/lib/utils/sms-flow'
import { cn } from '@/lib/utils'
import type { Service } from '@/lib/constants'

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
}

interface BookingsTableProps {
  bookings: Booking[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onSendSms?: (bookingId: string) => void
  onDelete?: (bookingId: string) => void
  deletingIds?: Set<string>
  onBulkDelete?: () => void
  onBulkSendSms?: () => void
  bulkDeleting?: boolean
  bookingsToSend?: Booking[]
}

export function BookingsTable({
  bookings,
  selectedIds,
  onSelectionChange,
  onSendSms,
  onDelete,
  deletingIds,
  onBulkDelete,
  onBulkSendSms,
  bulkDeleting,
  bookingsToSend = [],
}: BookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune réservation pour cette date.
      </div>
    )
  }

  const allSelected = bookings.length > 0 && bookings.every((b) => selectedIds.has(b.id))
  const hasSelections = selectedIds.size > 0

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
    return rows.map((booking) => (
      <tr
        key={booking.id}
        className={cn(
          'transition-colors duration-150',
          selectedIds.has(booking.id) && 'bg-blue-50'
        )}
      >
        <td className="px-6 py-4 whitespace-nowrap">
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
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center justify-end gap-2">
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
      </tr>
    ))
  }

  function renderSectionHeader(label: string, count: number) {
    return (
      <tr>
        <td colSpan={8} className="bg-gray-100 px-6 py-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="ml-2 text-sm text-gray-400">{count} réservation(s)</span>
        </td>
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
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
          {midi.length > 0 && (
            <>
              {renderSectionHeader('Midi', midi.length)}
              {renderRows(midi)}
            </>
          )}
          {soir.length > 0 && (
            <>
              {renderSectionHeader('Soir', soir.length)}
              {renderRows(soir)}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
