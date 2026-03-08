# Data Model: SMS Booking MVP

**Date**: 2026-03-08
**Feature**: 001-sms-booking-mvp

## Entities

### Restaurant

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL | Restaurant display name |
| email | text | NOT NULL | Email for recap delivery |
| sms_template | text | NOT NULL, default template | SMS content with variables: {restaurant}, {date}, {heure}, {couverts} |
| csv_mapping | jsonb | nullable | Saved column mapping config for CSV import |
| sms_send_time | time | NOT NULL, default '18:00' | Daily auto SMS send time (day before) |
| recap_send_time | time | NOT NULL, default '10:00' | Daily auto recap send time (morning of) |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Default SMS template**: `Bonjour, votre réservation au {restaurant} le {date} à {heure} pour {couverts} personne(s) est bien notée. Merci de confirmer en répondant OUI ou NON à ce SMS.`

### Profile

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, FK → auth.users(id) | Supabase auth user ID |
| restaurant_id | uuid | NOT NULL, FK → restaurants(id) | Scoping for RLS |
| display_name | text | NOT NULL | Operator display name |
| created_at | timestamptz | NOT NULL, default now() | |

**Note**: Only 2 profiles exist (co-founders). Created via Supabase Dashboard, not self-registration.

### Booking

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| restaurant_id | uuid | NOT NULL, FK → restaurants(id) | Restaurant scope |
| guest_name | text | NOT NULL | Customer name |
| phone | text | NOT NULL | E.164 format (+33...) |
| booking_date | date | NOT NULL | Reservation date |
| booking_time | time | NOT NULL | Reservation time |
| party_size | integer | NOT NULL, CHECK > 0 | Number of guests |
| status | text | NOT NULL, default 'pending' | See state machine below |
| sms_sent_at | timestamptz | nullable | Idempotency marker for auto-send |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Unique constraint**: `(restaurant_id, phone, booking_date, booking_time)` — import idempotency key.

**Index**: `(restaurant_id, booking_date)` — primary query pattern (bookings for a restaurant on a given date).

### SMS Send

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| booking_id | uuid | NOT NULL, FK → bookings(id) | |
| octopush_ticket | text | nullable | Octopush sms_ticket reference |
| status | text | NOT NULL, default 'pending' | pending, sent, delivered, failed |
| attempts | integer | NOT NULL, default 0 | Number of send attempts (max 3) |
| last_attempt_at | timestamptz | nullable | Timestamp of last attempt |
| delivery_status | text | nullable | Octopush DLR status (DELIVERED, NOT_DELIVERED, etc.) |
| error_message | text | nullable | Error details on failure |
| created_at | timestamptz | NOT NULL, default now() | |

**Index**: `(booking_id)` — lookup sends for a booking.

### SMS Reply

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| booking_id | uuid | NOT NULL, FK → bookings(id) | |
| raw_text | text | NOT NULL | Original reply content |
| interpretation | text | NOT NULL | oui, non, unknown |
| octopush_message_id | text | nullable | Octopush message reference |
| received_at | timestamptz | NOT NULL | When Octopush received the reply |
| created_at | timestamptz | NOT NULL, default now() | |

**Note**: When a reply is received, it is matched by phone number to ALL bookings with `status = 'pending'` or `status = 'sms_sent'` for that phone. Multiple `sms_reply` records may be created from a single inbound SMS.

**Index**: `(booking_id)` — lookup replies for a booking.

### Recap

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | |
| restaurant_id | uuid | NOT NULL, FK → restaurants(id) | |
| service_date | date | NOT NULL | Date of service covered |
| booking_count | integer | NOT NULL | Number of bookings included |
| email_status | text | NOT NULL, default 'pending' | pending, sent, failed |
| resend_id | text | nullable | Resend email ID reference |
| sent_at | timestamptz | nullable | When email was sent |
| created_at | timestamptz | NOT NULL, default now() | |

**Index**: `(restaurant_id, service_date)` — lookup recaps by restaurant and date.

## State Machine: Booking Status

```
                ┌─────────┐
                │ pending  │ ← Initial state (after CSV import)
                └────┬─────┘
                     │ SMS sent successfully
                     ▼
               ┌───────────┐
               │  sms_sent  │
               └─────┬──────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
    ┌───────────┐ ┌────────┐ ┌──────────┐
    │ confirmed │ │cancelled│ │to_verify │
    └───────────┘ └────────┘ └──────────┘
          ▲          ▲          │
          │          │          │ Operator reviews
          └──────────┴──────────┘
                     │
              (manual reclassification)


    ┌─────────────┐
    │ send_failed  │ ← All 3 retry attempts exhausted
    └─────────────┘
```

**Status values** (stored as text):
- `pending` — Imported, no SMS sent yet
- `sms_sent` — SMS delivered, awaiting reply
- `confirmed` — Client replied OUI
- `cancelled` — Client replied NON
- `to_verify` — Client reply unparseable, needs operator review
- `send_failed` — All send attempts failed

**Transitions**:
- `pending` → `sms_sent`: SMS send succeeds (delivery confirmed)
- `pending` → `send_failed`: All 3 send attempts fail
- `sms_sent` → `confirmed`: Reply parsed as OUI
- `sms_sent` → `cancelled`: Reply parsed as NON
- `sms_sent` → `to_verify`: Reply unparseable
- `to_verify` → `confirmed` | `cancelled`: Operator manually reclassifies
- Any reply state → updated by latest reply (last reply wins)

## Validation Rules (Zod)

### Booking Import Row

```
phone: E.164 format (starts with +, 10-15 digits)
guest_name: non-empty string, trimmed
booking_date: valid date, must be today or future
booking_time: valid time (HH:mm format)
party_size: positive integer
```

### Phone Number

```
Input: Various French formats (06..., +336..., 0033 6...)
Output: E.164 (+33XXXXXXXXX)
Display: Masked (+33 6 XX XX XX 34) — only last 2 digits visible
Logs: Always masked
```

## Row Level Security

All tables with `restaurant_id` column have RLS enabled:

```sql
-- Policy pattern (applied to bookings, sms_sends via join, sms_replies via join, recaps)
CREATE POLICY "tenant_isolation" ON {table}
  FOR ALL TO authenticated
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
```

**Tables with direct RLS**: `restaurants`, `bookings`, `recaps`
**Tables with RLS via join**: `sms_sends` (through `bookings.restaurant_id`), `sms_replies` (through `bookings.restaurant_id`)

## Data Retention

- All booking-related data (bookings, sms_sends, sms_replies, recaps) older than 90 days is purged or anonymized.
- Retention policy enforced via scheduled job or manual cleanup.
