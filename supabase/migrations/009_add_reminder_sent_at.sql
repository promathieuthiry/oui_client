-- Add reminder_sent_at column for day-of (Jour J) SMS reminder tracking
ALTER TABLE bookings ADD COLUMN reminder_sent_at timestamptz;
