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
} from '@react-email/components'
import type { Service } from '@/lib/constants'
import { formatDateFr } from '@/lib/utils/date'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  sms_sent: 'SMS envoyé',
  sms_delivered: 'SMS reçu',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  to_verify: 'À vérifier',
  send_failed: 'Échec',
  invalid_number: 'Numéro invalide',
}

interface RecapBooking {
  id: string
  guest_name: string
  booking_time: string
  party_size: number
  status: string
  service: Service
}

interface RecapEmailProps {
  restaurantName: string
  serviceDate: string
  bookings: RecapBooking[]
  serviceLabel?: string
}

// Calculate confirmation percentage and counts
function calculateConfirmationStats(bookings: RecapBooking[]) {
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length
  const pending = bookings.filter(
    (b) => !['confirmed', 'cancelled'].includes(b.status)
  ).length
  const total = bookings.length
  const percentage = total > 0 ? Math.round((confirmed / total) * 100) : 0
  return { confirmed, cancelled, pending, total, percentage }
}

// Group bookings by status category
function groupBookingsByStatus(bookings: RecapBooking[]) {
  return {
    confirmed: bookings.filter((b) => b.status === 'confirmed'),
    cancelled: bookings.filter((b) => b.status === 'cancelled'),
    pending: bookings.filter(
      (b) => !['confirmed', 'cancelled'].includes(b.status)
    ),
  }
}

// Reusable table component for each status section
function BookingTable({
  bookings,
  backgroundColor,
}: {
  bookings: RecapBooking[]
  backgroundColor: string
}) {
  if (bookings.length === 0) return null

  return (
    <Section
      style={{
        backgroundColor,
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '16px',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '8px',
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              Nom
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '8px',
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              Heure
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '8px',
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              Couverts
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '8px',
                fontSize: '12px',
                color: '#666',
                textTransform: 'uppercase',
              }}
            >
              Statut
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr
              key={booking.id}
              style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
              <td style={{ padding: '8px', fontSize: '14px' }}>
                {booking.guest_name}
              </td>
              <td style={{ padding: '8px', fontSize: '14px' }}>
                {booking.booking_time.slice(0, 5)}
              </td>
              <td style={{ padding: '8px', fontSize: '14px' }}>
                {booking.party_size}
              </td>
              <td style={{ padding: '8px', fontSize: '14px' }}>
                {STATUS_LABELS[booking.status] || booking.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

export function RecapEmail({
  restaurantName,
  serviceDate,
  bookings,
  serviceLabel,
}: RecapEmailProps) {
  const stats = calculateConfirmationStats(bookings)
  const grouped = groupBookingsByStatus(bookings)

  // Preview text for inbox
  const previewText =
    stats.total === 0
      ? 'Aucune réservation'
      : `${stats.percentage}% confirmées - ${stats.confirmed} confirmée(s), ${stats.cancelled} annulée(s), ${stats.pending} en attente`

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
          {/* Header */}
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
            Récapitulatif{serviceLabel ? ` ${serviceLabel}` : ''} du{' '}
            {formatDateFr(serviceDate)}
          </Text>

          {stats.total === 0 ? (
            /* No bookings case */
            <Section
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: '4px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: '16px',
                  color: '#666',
                  margin: '0',
                }}
              >
                Aucune réservation pour ce service
              </Text>
            </Section>
          ) : (
            <>
              {/* La situation */}
              <Text
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                  marginTop: '0',
                  marginBottom: '16px',
                }}
              >
                Voici l&#39;état actuel des confirmations pour le service
                {serviceLabel ? ` ${serviceLabel}` : ''} du {formatDateFr(serviceDate)}
              </Text>

              {/* Les chiffres */}
              <Text
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                {stats.confirmed} confirmée{stats.confirmed > 1 ? 's' : ''} -{' '}
                {stats.cancelled} annulée{stats.cancelled > 1 ? 's' : ''} -{' '}
                {stats.pending} en attente
              </Text>

              {/* Le pourcentage */}
              <Text
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginTop: '0',
                  marginBottom: '32px',
                }}
              >
                {stats.percentage} % des réservations sont confirmées à ce
                stade.
              </Text>

              {/* Confirmed Bookings Section */}
              {grouped.confirmed.length > 0 && (
                <>
                  <Heading
                    style={{
                      fontSize: '18px',
                      color: '#10b981',
                      marginBottom: '12px',
                      marginTop: '24px',
                    }}
                  >
                    ✓ CONFIRMÉES ({grouped.confirmed.length})
                  </Heading>
                  <BookingTable
                    bookings={grouped.confirmed}
                    backgroundColor="#f0fdf4"
                  />
                </>
              )}

              {/* Cancelled Bookings Section */}
              {grouped.cancelled.length > 0 && (
                <>
                  <Heading
                    style={{
                      fontSize: '18px',
                      color: '#ef4444',
                      marginBottom: '12px',
                      marginTop: '24px',
                    }}
                  >
                    ✗ ANNULÉES ({grouped.cancelled.length})
                  </Heading>
                  <BookingTable
                    bookings={grouped.cancelled}
                    backgroundColor="#fef2f2"
                  />
                </>
              )}

              {/* Pending Bookings Section */}
              {grouped.pending.length > 0 && (
                <>
                  <Heading
                    style={{
                      fontSize: '18px',
                      color: '#f59e0b',
                      marginBottom: '12px',
                      marginTop: '24px',
                    }}
                  >
                    ⏱ EN ATTENTE ({grouped.pending.length})
                  </Heading>
                  <BookingTable
                    bookings={grouped.pending}
                    backgroundColor="#fefce8"
                  />
                </>
              )}
            </>
          )}

          {/* Footer */}
          <Text
            style={{
              fontSize: '12px',
              color: '#999',
              marginTop: '32px',
              textAlign: 'center',
            }}
          >
            Envoyé par OuiClient
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
