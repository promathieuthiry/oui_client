# Webhook Contracts: SMS Booking MVP

**Date**: 2026-03-08

These endpoints receive callbacks from Octopush. They are public (no auth session) but should validate the request origin.

## POST /api/sms/reply

Receives inbound SMS replies from Octopush.

**Octopush sends**:
```json
{
  "message_id": "sms_5fa275dbf21dc",
  "number": "+33600000000",
  "text": "OUI",
  "sim_card_number": "12345",
  "reception_date": "2026-03-09 11:30:45"
}
```

**Processing**:
1. Parse reply text → classify as `oui`, `non`, or `unknown` (via reply-parser)
2. Find all bookings with matching `phone` AND `status IN ('sms_sent', 'pending')` AND `booking_date >= today`
3. For each matching booking:
   - Create `sms_reply` record
   - Update booking status (`confirmed`, `cancelled`, or `to_verify`)
4. Return 200 immediately (< 1 second)

**Response 200**: Empty body (Octopush requirement)

**Edge cases**:
- No matching booking found → log and ignore (no error returned)
- Multiple bookings match → reply applied to all (confirmation groupée)
- Reply after booking date → ignored (booking_date filter)

---

## POST /api/webhooks/octopush/delivery

Receives delivery receipts (DLR) from Octopush.

**Octopush sends**:
```json
{
  "message_id": "sms_5fa275dbf21dc",
  "number": "+33600000000",
  "status": "DELIVERED",
  "delivery_date": "2026-03-08 18:01:23"
}
```

**Processing**:
1. Find `sms_send` record by `octopush_ticket = message_id`
2. Update `delivery_status` and `status`
3. If status is `DELIVERED`, update booking status from `pending` to `sms_sent`
4. If status is `NOT_DELIVERED` or `BAD_DESTINATION`, trigger retry if `attempts < 3`
5. Return 200 immediately

**Octopush status values**:
- `DELIVERED` → sms_send.status = `delivered`, booking.status = `sms_sent`
- `NOT_DELIVERED` → retry or mark `send_failed`
- `BAD_DESTINATION` → mark `send_failed` immediately (no retry)
- `BLACKLISTED_NUMBER` → mark `send_failed` immediately
- `UNKNOWN_DELIVERY` → keep current status, log for review

**Response 200**: Empty body
