'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CSVUpload } from '@/components/csv-upload'

export default function ImportPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [savedMapping, setSavedMapping] = useState<Record<string, string> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadRestaurant() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        setRestaurantId(profile.restaurant_id)

        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('name, csv_mapping')
          .eq('id', profile.restaurant_id)
          .single()

        if (restaurant) {
          setRestaurantName(restaurant.name)
          if (restaurant.csv_mapping) {
            setSavedMapping(restaurant.csv_mapping as Record<string, string>)
          }
        }
      }
    }

    loadRestaurant()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Importer des réservations
          </h1>
          {restaurantName && (
            <p className="text-sm text-gray-500">{restaurantName}</p>
          )}
        </div>
        <a
          href="/bookings"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Retour aux réservations
        </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Fichier CSV
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Importez un fichier CSV avec vos réservations. Si les colonnes ne
          correspondent pas au format standard, vous pourrez configurer le
          mapping.
        </p>

        {restaurantId ? (
          <CSVUpload
            restaurantId={restaurantId}
            savedMapping={savedMapping}
          />
        ) : (
          <p className="text-gray-500">Chargement du restaurant...</p>
        )}
      </div>

      {savedMapping && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Mapping sauvegardé
          </h3>
          <div className="space-y-1 text-sm text-gray-500">
            {Object.entries(savedMapping).map(([csv, target]) => (
              <div key={csv} className="font-mono">
                {csv} → {target}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
