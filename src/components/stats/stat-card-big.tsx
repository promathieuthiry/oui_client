interface StatCardBigProps {
  label: string
  value: string | number
  sublabel?: string
  color?: string
}

export function StatCardBig({ label, value, sublabel, color = 'text-gray-900' }: StatCardBigProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  )
}
