'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Restaurant {
  id: string
  name: string
  email: string
  sms_template: string
  csv_mapping: Record<string, string> | null
  sms_send_time: string
  recap_send_time: string
}

export default function RestaurantsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [smsTemplate, setSmsTemplate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
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
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profile.restaurant_id)
          .single()

        if (data) {
          setRestaurant(data)
          setName(data.name)
          setEmail(data.email)
          setSmsTemplate(data.sms_template)
        }
      }
    }

    loadRestaurant()
  }, [supabase])

  async function handleSave() {
    if (!restaurant) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('restaurants')
      .update({
        name,
        email,
        sms_template: smsTemplate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id)

    if (error) {
      setMessage('Erreur lors de la sauvegarde. Veuillez réessayer.')
    } else {
      setMessage('Restaurant mis à jour avec succès.')
      setRestaurant({ ...restaurant, name, email, sms_template: smsTemplate })
      setEditing(false)
    }

    setSaving(false)
  }

  if (!restaurant) {
    return <p className="text-gray-500">Chargement...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Restaurant</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Modifier
          </button>
        )}
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded text-sm ${
            message.includes('Erreur')
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du restaurant
          </label>
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{restaurant.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email pour le récapitulatif
          </label>
          {editing ? (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{restaurant.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template SMS
          </label>
          <p className="text-xs text-gray-500 mb-1">
            Variables disponibles : {'{restaurant}'}, {'{date}'},{' '}
            {'{heure}'}, {'{couverts}'}
          </p>
          {editing ? (
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded">
              {restaurant.sms_template}
            </p>
          )}
        </div>

        {restaurant.csv_mapping && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mapping CSV sauvegardé
            </label>
            <div className="bg-gray-50 p-3 rounded space-y-1">
              {Object.entries(restaurant.csv_mapping).map(
                ([csv, target]) => (
                  <div key={csv} className="text-sm text-gray-600 font-mono">
                    {csv} → {target}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {editing && (
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setName(restaurant.name)
                setEmail(restaurant.email)
                setSmsTemplate(restaurant.sms_template)
              }}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
