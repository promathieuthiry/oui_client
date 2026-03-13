-- Add service column (nullable initially)
ALTER TABLE bookings ADD COLUMN service text;

-- Backfill existing bookings (< 17:00 = midi, >= 17:00 = soir)
UPDATE bookings
SET service = CASE
  WHEN booking_time < '17:00'::time THEN 'midi'
  ELSE 'soir'
END;

-- Make NOT NULL after backfill
ALTER TABLE bookings ALTER COLUMN service SET NOT NULL;

-- Add constraint for valid values
ALTER TABLE bookings ADD CONSTRAINT bookings_service_check
  CHECK (service IN ('midi', 'soir'));

-- Create index for filtering
CREATE INDEX idx_bookings_service ON bookings (restaurant_id, booking_date, service);

-- Create trigger function
CREATE OR REPLACE FUNCTION set_booking_service()
RETURNS TRIGGER AS $$
BEGIN
  NEW.service := CASE
    WHEN NEW.booking_time < '17:00'::time THEN 'midi'
    ELSE 'soir'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_booking_service
  BEFORE INSERT OR UPDATE OF booking_time ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_service();
