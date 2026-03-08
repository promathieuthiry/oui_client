import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
} from '@react-email/components'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  sms_sent: 'SMS envoyé',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  to_verify: 'À vérifier',
  send_failed: 'Échec',
}

interface RecapBooking {
  guest_name: string
  booking_time: string
  party_size: number
  status: string
}

interface RecapEmailProps {
  restaurantName: string
  serviceDate: string
  bookings: RecapBooking[]
}

export function RecapEmail({
  restaurantName,
  serviceDate,
  bookings,
}: RecapEmailProps) {
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const total = bookings.length

  return (
    <Html lang="fr">
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', padding: '20px' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px', maxWidth: '600px' }}>
          <Heading style={{ fontSize: '24px', color: '#1a1a1a', marginBottom: '8px' }}>
            Récapitulatif — {restaurantName}
          </Heading>
          <Text style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            Service du {serviceDate} — {confirmed}/{total} confirmée(s)
          </Text>

          <Section>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e5e5' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                    Nom
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                    Heure
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                    Couverts
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, index) => (
                  <tr
                    key={index}
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                  >
                    <td style={{ padding: '8px', fontSize: '14px' }}>
                      {booking.guest_name}
                    </td>
                    <td style={{ padding: '8px', fontSize: '14px' }}>
                      {booking.booking_time}
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

          <Text style={{ fontSize: '12px', color: '#999', marginTop: '24px' }}>
            Envoyé par OuiClient
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
