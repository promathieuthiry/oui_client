'use client'

import * as Dialog from '@radix-ui/react-dialog'

interface Booking {
  id: string
  guest_name: string
  booking_time: string
  party_size: number
}

interface DeleteConfirmationModalProps {
  booking: Booking
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  isDeleting: boolean
  error?: string | null
}

export function DeleteConfirmationModal({
  booking,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: DeleteConfirmationModalProps) {
  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Confirmer la suppression
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer cette réservation ?
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="font-medium text-gray-900">{booking.guest_name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {booking.booking_time.slice(0, 5)} • {booking.party_size} personne(s)
              </p>
            </div>
          </Dialog.Description>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
