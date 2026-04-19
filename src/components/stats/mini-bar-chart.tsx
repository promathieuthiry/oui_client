interface MiniBarChartDatum {
  label: string
  value: number
  sublabel?: string
}

interface MiniBarChartProps {
  data: MiniBarChartDatum[]
  colorClass?: string
}

export function MiniBarChart({ data, colorClass = 'bg-blue-500' }: MiniBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d) => {
        const heightPct = (d.value / max) * 100
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1">
            <span className="text-xs font-medium text-gray-700">{d.value}</span>
            <div className="w-full bg-gray-100 rounded-t flex items-end" style={{ height: '60%' }}>
              <div
                className={`w-full rounded-t ${colorClass}`}
                style={{ height: `${heightPct}%` }}
                title={d.sublabel}
              />
            </div>
            <span className="text-xs text-gray-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
