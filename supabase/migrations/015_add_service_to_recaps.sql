ALTER TABLE recaps ADD COLUMN service text;

CREATE INDEX idx_recaps_restaurant_date_service ON recaps (restaurant_id, service_date, service);
