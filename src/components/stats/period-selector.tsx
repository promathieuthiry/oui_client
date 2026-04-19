'use client'

export type PeriodPreset = 'week' | 'month' | 'custom' | 'all'

export interface Period {
  preset: PeriodPreset
  from: string | null
  to: string | null
}

interface PeriodSelectorProps {
  value: Period
  onChange: (next: Period) => void
}

function todayIso(): string {
  return new Date().toLocaleDateString('fr-CA')
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('fr-CA')
}

export function presetToPeriod(preset: PeriodPreset): Period {
  switch (preset) {
    case 'week':
      return { preset, from: daysAgoIso(7), to: todayIso() }
    case 'month':
      return { preset, from: daysAgoIso(30), to: todayIso() }
    case 'all':
      return { preset, from: null, to: null }
    case 'custom':
      return { preset, from: daysAgoIso(14), to: todayIso() }
  }
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  week: 'Semaine',
  month: 'Mois',
  custom: 'Personnalisé',
  all: 'Tout',
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-1 bg-gray-100 rounded-md p-1">
        {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(presetToPeriod(p))}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              value.preset === p
                ? 'bg-white text-gray-900 shadow-sm font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Du
            </label>
            <input
              type="date"
              value={value.from ?? ''}
              onChange={(e) =>
                onChange({ ...value, from: e.target.value || null })
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Au
            </label>
            <input
              type="date"
              value={value.to ?? ''}
              onChange={(e) =>
                onChange({ ...value, to: e.target.value || null })
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
