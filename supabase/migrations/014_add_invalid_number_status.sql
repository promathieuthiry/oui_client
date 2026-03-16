-- Add column to store the reason for phone number invalidity
ALTER TABLE bookings
  ADD COLUMN error_reason text;

-- Partial index for filtering invalid number bookings per restaurant
CREATE INDEX idx_bookings_invalid_number
  ON bookings (restaurant_id, status)
  WHERE status = 'invalid_number';

COMMENT ON COLUMN bookings.error_reason IS
  'Raison de l''invalidite (ex: "Format E.164 invalide", "BAD_DESTINATION")';
