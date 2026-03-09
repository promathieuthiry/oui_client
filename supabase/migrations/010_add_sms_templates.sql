-- Add JJ and relance SMS templates to restaurants, plus relance idempotency marker

-- Update existing J-1 template default
ALTER TABLE restaurants ALTER COLUMN sms_template SET DEFAULT '{restaurant}

Petit rappel pour vous dire que toute l''équipe du restaurant vous attend demain à {heure} pour {couverts} personnes.

Pour préparer au mieux votre accueil, merci de répondre OK ou ANNULER.

Bonne journée';

-- JJ (same-day morning) template
ALTER TABLE restaurants ADD COLUMN sms_template_jj text NOT NULL DEFAULT '{restaurant}

Petit rappel pour vous dire que toute l''équipe du restaurant vous attend aujourd''hui à {heure} pour {couverts} personnes.

Pour préparer au mieux votre accueil, merci de répondre OK ou ANNULER.

Bonne journée';

-- Relance (same-day follow-up for non-responders) template
ALTER TABLE restaurants ADD COLUMN sms_template_relance text NOT NULL DEFAULT '{restaurant}

Nous n''avons pas encore recu votre confirmation pour ce soir {heure} ({couverts} pers.).
Merci au nom de l''équipe en salle de répondre OK ou ANNULER rapidement.';

-- Relance idempotency marker on bookings
ALTER TABLE bookings ADD COLUMN relance_sent_at timestamptz;
