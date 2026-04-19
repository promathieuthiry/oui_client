import { Resend } from 'resend'
import { StatsEmail } from '@/emails/stats-email'
import type { StatsResponse } from '@/lib/services/stats-queries'
import { formatDateFr } from '@/lib/utils/date'

interface Restaurant {
  id: string
  name: string
  email: string
}

interface SendStatsEmailResult {
  email_status: 'sent' | 'failed'
  resend_id?: string
  error?: string
}

function buildBcc(extra?: string[]): string[] {
  const envBcc = process.env.RECAP_BCC_EMAIL
  const set = new Set<string>(extra?.map((e) => e.toLowerCase()) ?? [])
  if (envBcc) set.add(envBcc.toLowerCase())
  return [...set]
}

export async function sendStatsEmail(
  restaurant: Restaurant,
  stats: StatsResponse,
  options?: { to?: string[]; bcc?: string[]; statsUrl?: string }
): Promise<SendStatsEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const to = options?.to?.length ? options.to : [restaurant.email]
  const bcc = buildBcc(options?.bcc)

  const periodLabel =
    stats.period.from && stats.period.to
      ? `${formatDateFr(stats.period.from)} → ${formatDateFr(stats.period.to)}`
      : 'Depuis le début'

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'OuiClient <noreply@ouiclient.com>',
      to,
      ...(bcc.length > 0 && { bcc }),
      subject: `Statistiques hebdo — ${restaurant.name} — ${periodLabel}`,
      react: StatsEmail({
        restaurantName: restaurant.name,
        stats,
        periodLabel,
        statsUrl: options?.statsUrl,
      }),
    })

    if (error) {
      return {
        email_status: 'failed',
        error: `${error.name ?? 'ResendError'}: ${error.message}`,
      }
    }

    return { email_status: 'sent', resend_id: data?.id }
  } catch (error) {
    return {
      email_status: 'failed',
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}\n${error.stack}`
          : 'Unknown error',
    }
  }
}
