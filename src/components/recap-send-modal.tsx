'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { EmailTagInput } from '@/components/email-tag-input'

interface RecapSendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  serviceDate: string
  service: 'midi' | 'soir'
  label: string
  onSent: (result: { email_status: string; booking_count: number }) => void
}

export function RecapSendModal({
  open,
  onOpenChange,
  restaurantId,
  serviceDate,
  service,
  label,
  onSent,
}: RecapSendModalProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])

  useEffect(() => {
    if (!open) return

    setHtml(null)
    setError(null)
    setLoading(true)

    fetch('/api/recap/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        service_date: serviceDate,
        service,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Erreur lors du chargement')
        }
        return res.json()
      })
      .then((data) => {
        setHtml(data.html)
        setTo([data.restaurantEmail])
        setBcc(data.bcc ? [data.bcc] : [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      })
      .finally(() => setLoading(false))
  }, [open, restaurantId, serviceDate, service])

  async function handleSend() {
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/recap/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          service_date: serviceDate,
          service,
          to,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Erreur lors de l'envoi")
      }

      const result = await response.json()

      if (result.email_status === 'failed') {
        throw new Error(result.error || "L'envoi a échoué côté serveur")
      }

      onSent(result)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Envoyer le récapitulatif {label} du {serviceDate}
          </DialogTitle>
          <DialogDescription>
            Vérifiez les destinataires et l&apos;aperçu avant d&apos;envoyer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <EmailTagInput
            label="Destinataires (À)"
            emails={to}
            onChange={setTo}
            placeholder="ajouter un destinataire"
          />

          <EmailTagInput
            label="Copie (CC)"
            emails={cc}
            onChange={setCc}
            placeholder="ajouter en copie"
          />

          <EmailTagInput
            label="Copie cachée (BCC)"
            emails={bcc}
            onChange={setBcc}
            readOnly
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aperçu
            </label>
            <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50">
              {loading && (
                <div className="flex items-center justify-center h-48 text-sm text-gray-500">
                  Chargement de l&apos;aperçu...
                </div>
              )}
              {html && (
                <iframe
                  srcDoc={html}
                  sandbox=""
                  className="w-full h-[400px] border-0"
                  title="Aperçu du récapitulatif"
                />
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || loading || to.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
