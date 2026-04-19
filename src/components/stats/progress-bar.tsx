interface ProgressBarProps {
  value: number // 0-1
  label?: string
  colorClass?: string
}

export function ProgressBar({ value, label, colorClass = 'bg-green-500' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{label}</span>
          <span className="text-gray-900 font-medium">{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
