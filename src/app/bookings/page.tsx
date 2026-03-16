'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import { fetchBookings } from '@/lib/fetchers/bookings'
import { BookingsTable } from '@/components/bookings-table'
import { SendConfirmation } from '@/components/send-confirmation'
import { RecapPreview } from '@/components/recap-preview'
import { AddBookingForm } from '@/components/add-booking-form'
import { CSVImportModal } from '@/components/csv-import-modal'
import { DeleteConfirmationModal } from '@/components/delete-confirmation-modal'
import { EditBookingModal } from '@/components/edit-booking-modal'
import { useRefreshTimer } from '@/hooks/useRefreshTimer'
import type { Service } from '@/lib/constants'

interface Booking {
  id: string
  guest_name: string
  phone: string
  booking_date: string
  booking_time: string
  party_size: number
  status: string
  sms_sent_at: string | null
  reminder_sent_at: string | null
  relance_sent_at: string | null
  service: Service
}

interface StatCardProps {
  label: string
  value: number
  color: string
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  )
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deletingSingleIds, setDeletingSingleIds] = useState<Set<string>>(new Set())
  const [singleBookingToSend, setSingleBookingToSend] = useState<Booking | null>(null)
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null)
  const supabase = createClient()

  // Use SWR hook for reactive restaurant data
  const { restaurants, activeRestaurantId, isLoading: restaurantsLoading } = useRestaurants()

  // Derive active restaurant details (follows rerender-derived-state-no-effect)
  const activeRestaurant = restaurants.find(r => r.id === activeRestaurantId)
  const restaurantId = activeRestaurantId
  const restaurantName = activeRestaurant?.name ?? ''
  const restaurantEmail = activeRestaurant?.email ?? ''

  // SWR for automatic polling and data fetching
  const swrKey = restaurantId && selectedDate
    ? ['bookings', restaurantId, selectedDate]
    : null

  const {
    data: bookings = [],
    error: swrError,
    isLoading,
    mutate,
  } = useSWR(
    swrKey,
    ([_key, restaurantId, selectedDate]) =>
      fetchBookings({ restaurantId, selectedDate }),
    {
      refreshInterval: 60000, // Poll every 60 seconds
      revalidateOnFocus: true, // Refetch when tab gains focus
      revalidateOnReconnect: true, // Refetch on network reconnect
      dedupingInterval: 2000, // Deduplicate requests within 2s
    }
  )

  // Countdown timer for next refresh
  const { secondsUntilRefresh, resetTimer } = useRefreshTimer(60000)

  const error = swrError ? 'Impossible de charger les réservations.' : null
  const loading = isLoading

  async function handleDelete() {
    if (selectedIds.size === 0) return
    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .in('id', Array.from(selectedIds))

    if (deleteError) {
      console.error('Failed to delete bookings:', deleteError)
      setDeleting(false)
      return
    }

    // Success path
    setSelectedIds(new Set())
    mutate() // Trigger SWR refetch
    setDeleting(false)
  }

  function handleSendSingle(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return
    setSingleBookingToSend(booking)
  }

  function handleDeleteClick(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return
    setDeleteError(null) // Clear any previous error
    setBookingToDelete(booking)
  }

  function handleEditClick(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return
    setBookingToEdit(booking)
  }

  async function confirmDelete() {
    if (!bookingToDelete) return

    setDeleteError(null) // Clear any previous error
    setDeletingSingleIds((prev) => new Set(prev).add(bookingToDelete.id))

    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingToDelete.id)

    setDeletingSingleIds((prev) => {
      const next = new Set(prev)
      next.delete(bookingToDelete.id)
      return next
    })

    if (deleteError) {
      console.error('Failed to delete booking:', deleteError)
      setDeleteError('Impossible de supprimer la réservation. Veuillez réessayer.')
      // Keep modal open to show error
    } else {
      mutate() // Trigger SWR refetch
      setBookingToDelete(null) // Close modal only on success
    }
  }

  // Apply status filter
  const filteredBookings = selectedStatus === 'all'
    ? bookings
    : bookings.filter((b) => b.status === selectedStatus)

  const pendingBookings = bookings.filter(
    (b) => b.status === 'pending' && !b.sms_sent_at
  )

  // Use raw bookings (not filteredBookings) to find selected pending bookings
  // This ensures SMS sending works correctly even when status filter is active
  const bookingsToSend = bookings.filter(
    (b) => b.status === 'pending' && !b.sms_sent_at && selectedIds.has(b.id)
  )

  const sentCount = bookings.filter((b) => b.status === 'sms_sent').length
  const deliveredCount = bookings.filter((b) => b.status === 'sms_delivered').length
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length
  const toVerifyCount = bookings.filter((b) => b.status === 'to_verify').length
  const sendFailedCount = bookings.filter((b) => b.status === 'send_failed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          {restaurantName && (
            <p className="text-sm text-gray-500">{restaurantName}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Ajouter une réservation
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            Importer CSV
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date
          </label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSelectedIds(new Set())
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              mutate()
              resetTimer()
            }}
            className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-3 rounded-md border border-gray-300 text-sm font-medium transition-colors"
            title="Actualiser maintenant"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Actualiser</span>
          </button>
          <div className="text-sm text-gray-500">
            Prochaine actualisation : <span className="font-medium text-gray-700">{secondsUntilRefresh}s</span>
          </div>
        </div>
      </div>

      {bookings.length > 0 && (
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard
            label={selectedStatus === 'all' ? 'Total' : 'Affichées'}
            value={filteredBookings.length}
            color="text-gray-900"
          />
          <StatCard label="À envoyer" value={pendingBookings.length} color="text-gray-600" />
          <StatCard label="SMS envoyés" value={sentCount} color="text-blue-600" />
          <StatCard label="SMS reçus" value={deliveredCount} color="text-indigo-600" />
          <StatCard label="Confirmées" value={confirmedCount} color="text-green-600" />
          <StatCard label="Annulées" value={cancelledCount} color="text-red-600" />
          <StatCard label="À vérifier" value={toVerifyCount} color="text-yellow-600" />
          <StatCard label="Échec" value={sendFailedCount} color="text-red-800" />
        </div>
      )}

      {showSendDialog && restaurantId && (
        <SendConfirmation
          bookings={bookingsToSend}
          restaurantId={restaurantId}
          bookingDate={selectedDate}
          onSendComplete={() => {
            setShowSendDialog(false)
            mutate() // Trigger SWR refetch
          }}
          onCancel={() => setShowSendDialog(false)}
        />
      )}

      {singleBookingToSend && restaurantId && (
        <SendConfirmation
          bookings={[singleBookingToSend]}
          restaurantId={restaurantId}
          bookingDate={selectedDate}
          onSendComplete={() => {
            setSingleBookingToSend(null)
            mutate() // Trigger SWR refetch
          }}
          onCancel={() => setSingleBookingToSend(null)}
        />
      )}

      {bookingToDelete && (
        <DeleteConfirmationModal
          booking={bookingToDelete}
          onConfirm={confirmDelete}
          onCancel={() => setBookingToDelete(null)}
          isDeleting={deletingSingleIds.has(bookingToDelete.id)}
          error={deleteError}
        />
      )}

      {bookingToEdit && (
        <EditBookingModal
          booking={bookingToEdit}
          onSuccess={() => {
            setBookingToEdit(null)
            mutate() // Trigger SWR refetch
          }}
          onCancel={() => setBookingToEdit(null)}
        />
      )}

      {showAddForm && restaurantId && (
        <AddBookingForm
          restaurantId={restaurantId}
          bookingDate={selectedDate}
          onSuccess={() => {
            setShowAddForm(false)
            mutate() // Trigger SWR refetch
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {restaurantId && (
        <CSVImportModal
          open={showImportModal}
          restaurantId={restaurantId}
          selectedDate={selectedDate}
          onImportComplete={() => {
            setShowImportModal(false)
            mutate() // Trigger SWR refetch
          }}
          onCancel={() => setShowImportModal(false)}
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {restaurantsLoading ? (
        <p className="text-gray-500">Chargement du restaurant...</p>
      ) : !restaurantId ? (
        <div className="text-center py-8">
          <p className="text-gray-700 mb-4">
            Aucun restaurant actif. Veuillez en sélectionner un.
          </p>
          <a
            href="/restaurants"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Aller aux restaurants
          </a>
        </div>
      ) : loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <>
          <BookingsTable
            bookings={filteredBookings}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onEdit={handleEditClick}
            onSendSms={handleSendSingle}
            onDelete={handleDeleteClick}
            deletingIds={deletingSingleIds}
            onBulkDelete={handleDelete}
            onBulkSendSms={() => setShowSendDialog(true)}
            bulkDeleting={deleting}
            bookingsToSend={bookingsToSend}
          />

          {bookings.length > 0 && restaurantId && (
            <RecapPreview
              bookings={bookings}
              restaurantId={restaurantId}
              serviceDate={selectedDate}
              restaurantEmail={restaurantEmail}
            />
          )}
        </>
      )}
    </div>
  )
}
