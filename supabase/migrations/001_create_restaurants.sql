CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  sms_template text NOT NULL DEFAULT 'Bonjour, votre réservation au {restaurant} le {date} à {heure} pour {couverts} personne(s) est bien notée. Merci de confirmer en répondant OUI ou NON à ce SMS.',
  csv_mapping jsonb,
  sms_send_time time NOT NULL DEFAULT '18:00',
  recap_send_time time NOT NULL DEFAULT '10:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
