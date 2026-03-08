CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  phone text NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  party_size integer NOT NULL CHECK (party_size > 0),
  status text NOT NULL DEFAULT 'pending',
  sms_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, phone, booking_date, booking_time)
);

CREATE INDEX idx_bookings_restaurant_date ON bookings (restaurant_id, booking_date);
