'use client'

import { StatusBadge } from '@/components/status-badge'
import { formatPhone } from '@/lib/utils/phone'
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
}

interface BookingsTableProps {
  bookings: Booking[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

export function BookingsTable({ bookings, selectedIds, onSelectionChange }: BookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune réservation pour cette date.
      </div>
    )
  }

  const allSelected = bookings.length > 0 && bookings.every((b) => selectedIds.has(b.id))

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
      <tr key={booking.id}>
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedIds.has(booking.id)}
            onChange={() => toggleOne(booking.id)}
            className="rounded border-gray-300"
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
      </tr>
    ))
  }

  function renderSectionHeader(label: string, count: number) {
    return (
      <tr>
        <td colSpan={7} className="bg-gray-100 px-6 py-2">
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
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-gray-300"
              />
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
