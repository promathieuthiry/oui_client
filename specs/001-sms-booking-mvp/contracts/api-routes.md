# API Routes Contract: SMS Booking MVP

**Date**: 2026-03-08

## Internal API Routes (authenticated, operator-only)

### POST /api/sms/send

Trigger SMS sending for bookings.

**Request**:
```json
{
  "restaurant_id": "uuid",
  "booking_date": "2026-03-09"
}
```

**Response 200**:
```json
{
  "sent": 12,
  "failed": 1,
  "skipped": 3,
  "details": [
    { "booking_id": "uuid", "status": "sent" },
    { "booking_id": "uuid", "status": "failed", "error": "Invalid phone number" },
    { "booking_id": "uuid", "status": "skipped", "reason": "Already sent" }
  ]
}
```

**Response 401**: Unauthorized (no valid session)
**Response 400**: Missing or invalid parameters

---

### POST /api/recap/send

Trigger recap email for a restaurant's bookings on a given date.

**Request**:
```json
{
  "restaurant_id": "uuid",
  "service_date": "2026-03-09"
}
```

**Response 200**:
```json
{
  "recap_id": "uuid",
  "email_status": "sent",
  "booking_count": 15,
  "resend_id": "email_abc123"
}
```

**Response 401**: Unauthorized
**Response 400**: Missing or invalid parameters

---

## Cron Routes (secured via CRON_SECRET)

### GET /api/cron/send-sms

Daily automated SMS send. Triggered by Vercel Cron at 18:00 Europe/Paris (day before).

**Auth**: `Authorization: Bearer <CRON_SECRET>`

**Behavior**:
1. Query all bookings with `booking_date = tomorrow` AND `sms_sent_at IS NULL`
2. Group by restaurant
3. For each booking, send SMS via Octopush
4. Set `sms_sent_at = now()` on success (idempotency marker)
5. Log results

**Response 200**:
```json
{
  "restaurants_processed": 3,
  "total_sent": 45,
  "total_failed": 2,
  "total_skipped": 0
}
```

**Response 401**: Invalid CRON_SECRET

---

### GET /api/cron/send-recap

Daily automated recap email. Triggered by Vercel Cron at 10:00 Europe/Paris (morning of service).

**Auth**: `Authorization: Bearer <CRON_SECRET>`

**Behavior**:
1. Query all restaurants that have bookings with `booking_date = today`
2. For each restaurant, check if recap already sent today (idempotency)
3. Generate and send recap email
4. Create recap record

**Response 200**:
```json
{
  "restaurants_processed": 3,
  "recaps_sent": 3,
  "recaps_skipped": 0
}
```

**Response 401**: Invalid CRON_SECRET

---

## Server Actions (form submissions)

### uploadCSV

Server Action for CSV file upload and import.

**Input**: `FormData` with `file` (CSV) and `restaurant_id` (string)

**Returns**:
```json
{
  "imported": 48,
  "updated": 2,
  "errors": [
    { "row": 5, "field": "phone", "message": "Format de téléphone invalide" },
    { "row": 12, "field": "booking_date", "message": "La date est dans le passé" }
  ]
}
```
