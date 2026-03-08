const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'En attente',
    className: 'bg-gray-100 text-gray-700',
  },
  sms_sent: {
    label: 'SMS envoyé',
    className: 'bg-blue-100 text-blue-700',
  },
  confirmed: {
    label: 'Confirmée',
    className: 'bg-green-100 text-green-700',
  },
  cancelled: {
    label: 'Annulée',
    className: 'bg-red-100 text-red-700',
  },
  to_verify: {
    label: 'À vérifier',
    className: 'bg-yellow-100 text-yellow-700',
  },
  send_failed: {
    label: 'Échec',
    className: 'bg-red-100 text-red-800',
  },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
