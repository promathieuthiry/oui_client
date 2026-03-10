-- Add index for webhook lookups by octopush_ticket
-- This significantly improves webhook performance by avoiding full table scans
-- when looking up SMS sends by their Octopush ticket ID

CREATE INDEX IF NOT EXISTS idx_sms_sends_octopush_ticket
ON sms_sends(octopush_ticket);
