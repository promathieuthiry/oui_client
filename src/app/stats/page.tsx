'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useRestaurants } from '@/lib/hooks/use-restaurants'
import {
  PeriodSelector,
  presetToPeriod,
  type Period,
} from '@/components/stats/period-selector'
import { StatCardBig } from '@/components/stats/stat-card-big'
import { ProgressBar } from '@/components/stats/progress-bar'
import { MiniBarChart } from '@/components/stats/mini-bar-chart'
import type { StatsResponse } from '@/lib/services/stats-queries'

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
    throw new Error(body.error || 'Erreur lors du chargement des statistiques')
  }
  return res.json()
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDelay(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function buildStatsUrl(period: Period): string {
  const params = new URLSearchParams()
  if (period.from) params.set('from', period.from)
  if (period.to) params.set('to', period.to)
  const qs = params.toString()
  return qs ? `/api/stats?${qs}` : '/api/stats'
}

export default function StatsPage() {
  const { activeRestaurantId, restaurants, isLoading: restaurantsLoading } =
    useRestaurants()
  const [period, setPeriod] = useState<Period>(() => presetToPeriod('month'))
  const [showQuality, setShowQuality] = useState(false)

  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId)

  const swrKey = activeRestaurantId ? buildStatsUrl(period) : null
  const { data, error, isLoading } = useSWR<StatsResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
  })

  const dayChartData = useMemo(() => {
    if (!data) return []
    return data.by_day_of_week.map((d) => ({
      label: DAY_LABELS[d.day],
      value: d.bookings,
      sublabel: `${d.bookings} résa, ${d.covers} couverts`,
    }))
  }, [data])

  if (restaurantsLoading) {
    return <p className="text-gray-500">Chargement du restaurant...</p>
  }

  if (!activeRestaurantId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-700 mb-4">
          Aucun restaurant actif. Veuillez en sélectionner un.
        </p>
        <a href="/restaurants" className="text-blue-600 hover:text-blue-800 underline">
          Aller aux restaurants
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        {activeRestaurant && (
          <p className="text-sm text-gray-500">{activeRestaurant.name}</p>
        )}
      </div>

      <PeriodSelector value={period} onChange={setPeriod} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error.message}</p>
        </div>
      )}

      {isLoading && !data && <p className="text-gray-500">Chargement...</p>}

      {data && (
        <>
          {/* Volume */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Volume</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCardBig
                label="Réservations"
                value={data.volume.bookings_total}
                color="text-gray-900"
              />
              <StatCardBig
                label="SMS envoyés"
                value={data.volume.sms_sent_total}
                color="text-blue-600"
              />
              <StatCardBig
                label="Couverts totaux"
                value={data.volume.covers_total}
                color="text-indigo-600"
              />
            </div>
          </section>

          {/* Engagement */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Engagement</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <ProgressBar
                value={data.engagement.reply_rate}
                label="Taux de réponse aux SMS"
                colorClass="bg-green-500"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500">Délai moyen de réponse</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDelay(data.engagement.avg_reply_delay_minutes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Réponses après relance</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {data.engagement.replies_after_relance}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Taux de réponses ambiguës</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {pct(data.engagement.ambiguous_reply_rate)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Confirmations */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Confirmations</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <ProgressBar
                value={data.confirmations.confirmed_rate}
                label="Taux de confirmation"
                colorClass="bg-green-500"
              />
              <ProgressBar
                value={data.confirmations.with_status_before_service_rate}
                label="Réservations avec un statut avant le service"
                colorClass="bg-blue-500"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500">Confirmées</p>
                  <p className="text-lg font-semibold text-green-600">
                    {data.confirmations.confirmed_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Annulées</p>
                  <p className="text-lg font-semibold text-red-600">
                    {data.confirmations.cancelled_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sans réponse</p>
                  <p className="text-lg font-semibold text-amber-600">
                    {data.confirmations.no_response_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">En attente</p>
                  <p className="text-lg font-semibold text-gray-600">
                    {data.confirmations.pending_count}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Qualité & Patterns (collapsible) */}
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setShowQuality((v) => !v)}
              className="text-lg font-semibold text-gray-900 flex items-center gap-2"
            >
              <span>{showQuality ? '▾' : '▸'}</span>
              <span>Qualité & Patterns</span>
            </button>

            {showQuality && (
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                  <ProgressBar
                    value={data.sms_quality.delivery_rate}
                    label="Taux de livraison SMS"
                    colorClass="bg-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-500">Numéros invalides</p>
                      <p className="text-lg font-semibold text-red-600">
                        {data.sms_quality.invalid_numbers}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Échecs d&apos;envoi</p>
                      <p className="text-lg font-semibold text-red-800">
                        {data.sms_quality.send_failed}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                  <ProgressBar
                    value={data.relance_efficacy.relance_reply_rate}
                    label="Taux de réponse après relance"
                    colorClass="bg-amber-500"
                  />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-500">Relances envoyées</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {data.relance_efficacy.relance_sent_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Réponses déclenchées</p>
                      <p className="text-lg font-semibold text-green-600">
                        {data.relance_efficacy.replies_triggered_by_relance}
                      </p>
                    </div>
                  </div>
                </div>

                {dayChartData.some((d) => d.value > 0) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                      Réservations par jour de la semaine
                    </p>
                    <MiniBarChart data={dayChartData} colorClass="bg-blue-500" />
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
