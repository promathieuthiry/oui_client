CREATE TABLE recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  booking_count integer NOT NULL,
  email_status text NOT NULL DEFAULT 'pending',
  resend_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recaps_restaurant_date ON recaps (restaurant_id, service_date);
