'use client'

import { useState } from 'react'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import { mutate } from 'swr'

type FormData = {
  name: string
  email: string
  sms_template: string
  sms_template_jj: string
  sms_template_relance: string
  sms_send_time: string
  recap_send_time: string
}

const emptyForm: FormData = {
  name: '',
  email: '',
  sms_template: '',
  sms_template_jj: '',
  sms_template_relance: '',
  sms_send_time: '09:00',
  recap_send_time: '18:00',
}

export default function RestaurantsPage() {
  const { restaurants, activeRestaurantId, isLoading } = useRestaurants()
  const [formMode, setFormMode] = useState<'hidden' | 'create' | 'edit'>('hidden')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function openCreateForm() {
    const first = restaurants[0]
    setForm(first ? {
      name: '',
      email: '',
      sms_template: first.sms_template,
      sms_template_jj: first.sms_template_jj,
      sms_template_relance: first.sms_template_relance,
      sms_send_time: first.sms_send_time,
      recap_send_time: first.recap_send_time,
    } : emptyForm)
    setEditingId(null)
    setFormMode('create')
    setMessage(null)
  }

  function openEditForm(restaurantId: string) {
    const r = restaurants.find((rest) => rest.id === restaurantId)
    if (!r) return

    setForm({
      name: r.name,
      email: r.email,
      sms_template: r.sms_template,
      sms_template_jj: r.sms_template_jj,
      sms_template_relance: r.sms_template_relance,
      sms_send_time: r.sms_send_time,
      recap_send_time: r.recap_send_time,
    })
    setEditingId(r.id)
    setFormMode('edit')
    setMessage(null)
  }

  function closeForm() {
    setFormMode('hidden')
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit() {
    if (!form.name || !form.email) {
      setMessage({ type: 'error', text: 'Le nom et l\'email sont requis.' })
      return
    }

    setSaving(true)
    setMessage(null)

    if (formMode === 'create') {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Restaurant créé avec succès.' })
        closeForm()
        await mutate('/api/restaurants')
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la création.' })
      }
    } else if (formMode === 'edit' && editingId) {
      const res = await fetch(`/api/restaurants/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Restaurant mis à jour avec succès.' })
        closeForm()
        await mutate('/api/restaurants')
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' })
      }
    }

    setSaving(false)
  }

  async function handleSwitch(restaurantId: string) {
    setSwitching(restaurantId)
    setMessage(null)

    const res = await fetch('/api/restaurants/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurantId }),
    })

    if (res.ok) {
      await mutate('/api/restaurants')
      setMessage({ type: 'success', text: 'Restaurant actif changé.' })
    } else {
      setMessage({ type: 'error', text: 'Erreur lors du changement de restaurant.' })
    }

    setSwitching(null)
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <p className="text-gray-500">Chargement...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
        {formMode === 'hidden' && (
          <button
            onClick={openCreateForm}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + Ajouter un restaurant
          </button>
        )}
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded text-sm ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Restaurant list */}
      <div className="space-y-3">
        {restaurants.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{r.name}</span>
                {r.id === activeRestaurantId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Actif
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{r.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {r.id !== activeRestaurantId && (
                <button
                  onClick={() => handleSwitch(r.id)}
                  disabled={switching === r.id}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {switching === r.id ? 'Activation...' : 'Activer'}
                </button>
              )}
              <button
                onClick={() => openEditForm(r.id)}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Modifier
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit form */}
      {formMode !== 'hidden' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {formMode === 'create' ? 'Nouveau restaurant' : 'Modifier le restaurant'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du restaurant
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email pour le récapitulatif
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template SMS J-1 (veille)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Variables disponibles : {'{restaurant}'}, {'{date}'},{' '}
              {'{heure}'}, {'{couverts}'}
            </p>
            <textarea
              value={form.sms_template}
              onChange={(e) => updateField('sms_template', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template SMS Jour J (matin)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Variables disponibles : {'{restaurant}'}, {'{date}'},{' '}
              {'{heure}'}, {'{couverts}'}
            </p>
            <textarea
              value={form.sms_template_jj}
              onChange={(e) => updateField('sms_template_jj', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template SMS Relance (après-midi)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Variables disponibles : {'{restaurant}'}, {'{date}'},{' '}
              {'{heure}'}, {'{couverts}'}
            </p>
            <textarea
              value={form.sms_template_relance}
              onChange={(e) => updateField('sms_template_relance', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure d&apos;envoi SMS
              </label>
              <input
                type="time"
                value={form.sms_send_time}
                onChange={(e) => updateField('sms_send_time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure du récapitulatif
              </label>
              <input
                type="time"
                value={form.recap_send_time}
                onChange={(e) => updateField('recap_send_time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving
                ? 'Sauvegarde...'
                : formMode === 'create'
                  ? 'Créer'
                  : 'Sauvegarder'}
            </button>
            <button
              onClick={closeForm}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
