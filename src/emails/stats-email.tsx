import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Preview,
  Link,
} from '@react-email/components'
import { formatDateFr } from '@/lib/utils/date'
import type { StatsResponse } from '@/lib/services/stats-queries'

interface StatsEmailProps {
  restaurantName: string
  stats: StatsResponse
  periodLabel: string
  statsUrl?: string
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

const metricCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'top',
}

export function StatsEmail({ restaurantName, stats, periodLabel, statsUrl }: StatsEmailProps) {
  const previewText = `${stats.volume.bookings_total} réservations, ${pct(
    stats.confirmations.confirmed_rate
  )} confirmées, ${stats.volume.covers_total} couverts`

  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
          padding: '20px',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '600px',
          }}
        >
          <Heading
            style={{
              fontSize: '22px',
              color: '#1a1a1a',
              marginTop: '0',
              marginBottom: '4px',
            }}
          >
            {restaurantName}
          </Heading>
          <Text
            style={{
              fontSize: '14px',
              color: '#666',
              marginTop: '0',
              marginBottom: '24px',
            }}
          >
            Statistiques — {periodLabel}
          </Text>

          {/* Volume */}
          <Heading
            style={{
              fontSize: '16px',
              color: '#1a1a1a',
              marginTop: '24px',
              marginBottom: '8px',
            }}
          >
            Volume
          </Heading>
          <Section
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '16px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={metricCellStyle}>
                    <Text style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                      Réservations
                    </Text>
                    <Text
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#1a1a1a',
                        margin: 0,
                      }}
                    >
                      {stats.volume.bookings_total}
                    </Text>
                  </td>
                  <td style={metricCellStyle}>
                    <Text style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                      SMS envoyés
                    </Text>
                    <Text
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#2563eb',
                        margin: 0,
                      }}
                    >
                      {stats.volume.sms_sent_total}
                    </Text>
                  </td>
                  <td style={metricCellStyle}>
                    <Text style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                      Couverts totaux
                    </Text>
                    <Text
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#4f46e5',
                        margin: 0,
                      }}
                    >
                      {stats.volume.covers_total}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Engagement */}
          <Heading
            style={{
              fontSize: '16px',
              color: '#1a1a1a',
              marginTop: '24px',
              marginBottom: '8px',
            }}
          >
            Engagement
          </Heading>
          <Section
            style={{
              backgroundColor: '#f9fafb',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <Text style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 4px 0' }}>
              Taux de réponse : <strong>{pct(stats.engagement.reply_rate)}</strong>
            </Text>
            <Text style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 4px 0' }}>
              Délai moyen : <strong>{formatDelay(stats.engagement.avg_reply_delay_minutes)}</strong>
            </Text>
            <Text style={{ fontSize: '14px', color: '#1a1a1a', margin: '0' }}>
              Réponses après relance : <strong>{stats.engagement.replies_after_relance}</strong>
            </Text>
          </Section>

          {/* Confirmations */}
          <Heading
            style={{
              fontSize: '16px',
              color: '#1a1a1a',
              marginTop: '24px',
              marginBottom: '8px',
            }}
          >
            Confirmations
          </Heading>
          <Section
            style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <Text style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 4px 0' }}>
              Taux de confirmation :{' '}
              <strong>{pct(stats.confirmations.confirmed_rate)}</strong>
            </Text>
            <Text style={{ fontSize: '14px', color: '#1a1a1a', margin: '0 0 4px 0' }}>
              Confirmées : <strong>{stats.confirmations.confirmed_count}</strong> · Annulées :{' '}
              <strong>{stats.confirmations.cancelled_count}</strong> · Sans réponse :{' '}
              <strong>{stats.confirmations.no_response_count}</strong>
            </Text>
            <Text style={{ fontSize: '14px', color: '#1a1a1a', margin: '0' }}>
              % traitées avant le service :{' '}
              <strong>{pct(stats.confirmations.with_status_before_service_rate)}</strong>
            </Text>
          </Section>

          {statsUrl && (
            <Section style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link
                href={statsUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Voir le détail dans OuiClient
              </Link>
            </Section>
          )}

          <Text
            style={{
              fontSize: '12px',
              color: '#999',
              marginTop: '32px',
              textAlign: 'center',
            }}
          >
            {stats.period.from && stats.period.to
              ? `Récap du ${formatDateFr(stats.period.from)} au ${formatDateFr(stats.period.to)} · `
              : ''}
            Envoyé par OuiClient
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
