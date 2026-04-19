import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeStats } from '@/lib/services/stats-queries'
import { sendStatsEmail } from '@/lib/services/stats-email'

export const dynamic = 'force-dynamic'

// Temporary hardcoded recipient while Resend is in test mode (no verified domain).
// Remove this override to resume sending to each restaurant's own email once a
// domain is verified at resend.com/domains.
const HARDCODED_RECIPIENT = 'promathieuthiry@gmail.com'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const from = isoDaysAgo(7)
  const to = isoDaysAgo(1)

  console.log(`[send-stats-recap] from=${from}, to=${to}`)

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, email')

  if (error) {
    console.error('[send-stats-recap] Failed to query restaurants:', error.message)
    return NextResponse.json(
      { error: 'Database error querying restaurants', details: error.message },
      { status: 500 }
    )
  }

  if (!restaurants || restaurants.length === 0) {
    return NextResponse.json({ restaurants_processed: 0, emails_sent: 0 })
  }

  const statsUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/stats`
    : undefined

  let emailsSent = 0
  let emailsFailed = 0
  let emailsSkipped = 0

  for (const restaurant of restaurants) {
    try {
      const stats = await computeStats(supabase, {
        restaurantId: restaurant.id,
        from,
        to,
      })

      if (stats.volume.bookings_total === 0) {
        console.log(
          `[send-stats-recap] No bookings for ${restaurant.name}, skipping`
        )
        emailsSkipped++
        continue
      }

      const result = await sendStatsEmail(restaurant, stats, {
        statsUrl,
        to: [HARDCODED_RECIPIENT],
      })

      if (result.email_status === 'sent') {
        console.log(
          `[send-stats-recap] Sent to ${HARDCODED_RECIPIENT} for ${restaurant.name} (resend_id: ${result.resend_id})`
        )
        emailsSent++
      } else {
        console.error(
          `[send-stats-recap] Failed for ${restaurant.name} (id=${restaurant.id}, to=${HARDCODED_RECIPIENT}, from=${from}, to=${to}): ${result.error}`
        )
        emailsFailed++
      }
    } catch (e) {
      console.error(
        `[send-stats-recap] Exception for ${restaurant.name} (id=${restaurant.id}, from=${from}, to=${to}):`,
        e instanceof Error ? `${e.message}\n${e.stack}` : e
      )
      emailsFailed++
    }
  }

  const response = {
    period: { from, to },
    restaurants_processed: restaurants.length,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
    emails_skipped: emailsSkipped,
  }
  console.log('[send-stats-recap] Done:', JSON.stringify(response))

  return NextResponse.json(response)
}
