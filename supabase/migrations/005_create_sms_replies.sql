CREATE TABLE sms_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  interpretation text NOT NULL,
  octopush_message_id text,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_replies_booking ON sms_replies (booking_id);
