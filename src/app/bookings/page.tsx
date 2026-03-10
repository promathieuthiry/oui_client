'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getActiveRestaurantId } from '@/lib/utils/active-restaurant'
import { BookingsTable } from '@/components/bookings-table'
import { SendConfirmation } from '@/components/send-confirmation'
import { RecapPreview } from '@/components/recap-preview'
import { AddBookingForm } from '@/components/add-booking-form'

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const [bookings, setBookings] = useState<
    {
      id: string
      guest_name: string
      phone: string
      booking_date: string
      booking_time: string
      party_size: number
      status: string
      sms_sent_at: string | null
    }[]
  >([])
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  )
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadBookings = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('booking_date', selectedDate)
      .order('booking_time', { ascending: true })

    setBookings(data || [])
    setLoading(false)
  }, [restaurantId, selectedDate, supabase])

  useEffect(() => {
    async function loadRestaurant() {
      const activeId = getActiveRestaurantId()
      if (!activeId) {
        setLoading(false)
        return
      }

      setRestaurantId(activeId)

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', activeId)
        .single()

      if (restaurant) {
        setRestaurantName(restaurant.name)
      }
    }

    loadRestaurant()
  }, [supabase])

  useEffect(() => {
    if (restaurantId) {
      loadBookings()
    }
  }, [restaurantId, selectedDate, loadBookings])

  async function handleDelete() {
    if (selectedIds.size === 0) return
    setDeleting(true)

    const { error } = await supabase
      .from('bookings')
      .delete()
      .in('id', Array.from(selectedIds))

    if (!error) {
      setSelectedIds(new Set())
      await loadBookings()
    }
    setDeleting(false)
  }

  const pendingBookings = bookings.filter(
    (b) => b.status === 'pending' && !b.sms_sent_at
  )

  const bookingsToSend = pendingBookings.filter((b) => selectedIds.has(b.id))

  const sentCount = bookings.filter((b) => b.sms_sent_at).length
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length

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
          <a
            href="/bookings/import"
            className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            Importer CSV
          </a>
          {selectedIds.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              {deleting
                ? 'Suppression...'
                : `Supprimer (${selectedIds.size})`}
            </button>
          )}
          {bookingsToSend.length > 0 && (
            <button
              onClick={() => setShowSendDialog(true)}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Envoyer les SMS ({bookingsToSend.length})
            </button>
          )}
        </div>
      </div>

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

      {bookings.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">SMS envoyés</p>
            <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Confirmées</p>
            <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Annulées</p>
            <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
          </div>
        </div>
      )}

      {showSendDialog && restaurantId && (
        <SendConfirmation
          bookings={bookingsToSend}
          restaurantId={restaurantId}
          bookingDate={selectedDate}
          onSendComplete={() => {
            setShowSendDialog(false)
            loadBookings()
          }}
          onCancel={() => setShowSendDialog(false)}
        />
      )}

      {showAddForm && restaurantId && (
        <AddBookingForm
          restaurantId={restaurantId}
          bookingDate={selectedDate}
          onSuccess={() => {
            setShowAddForm(false)
            loadBookings()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {!loading && !restaurantId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            Aucun restaurant sélectionné.{' '}
            <a href="/restaurants" className="underline font-medium">
              Choisir un restaurant
            </a>
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <>
          <BookingsTable
            bookings={bookings}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {bookings.length > 0 && restaurantId && (
            <RecapPreview
              bookings={bookings}
              restaurantId={restaurantId}
              serviceDate={selectedDate}
            />
          )}
        </>
      )}
    </div>
  )
}
