# Quickstart: SMS Booking MVP

**Date**: 2026-03-08

## Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier)
- Octopush account (with SMS Premium France enabled)
- Resend account (free tier)
- Vercel account (for deployment)

## 1. Clone and install

```bash
git clone <repo-url>
cd oui_client
npm install
```

## 2. Environment variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Octopush
OCTOPUSH_API_LOGIN=your-email@example.com
OCTOPUSH_API_KEY=your-api-key
OCTOPUSH_SMS_MODE=simu          # "simu" for dev, remove for production
OCTOPUSH_SENDER=OuiClient       # SMS sender name

# Resend
RESEND_API_KEY=re_your-api-key
RESEND_FROM_EMAIL=OuiClient <noreply@yourdomain.com>

# Cron (production only)
CRON_SECRET=your-random-secret-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Database setup

```bash
# Link to Supabase project
npx supabase link --project-ref your-project-ref

# Run migrations
npx supabase db push
```

## 4. Create operator accounts

In Supabase Dashboard:
1. Go to Authentication > Users > Add user
2. Create 2 users with email + password
3. Note: Public signup is disabled

Then create profile records linking each user to a restaurant (via SQL editor or seed script).

## 5. Configure Octopush webhooks

In Octopush Dashboard > Callbacks:
- **Inbound SMS URL**: `https://your-domain.com/api/sms/reply`
- **Delivery receipt URL**: `https://your-domain.com/api/webhooks/octopush/delivery`

For local development, use a tunnel (e.g., ngrok) to expose localhost.

## 6. Run locally

```bash
npm run dev
```

Open `http://localhost:3000` and log in with operator credentials.

## 7. Test the full pipeline

1. Import a CSV with your own phone number as a booking for tomorrow
2. Click "Envoyer les SMS" and confirm
3. Check your phone for the SMS (will be simulated in `simu` mode)
4. Reply OUI or NON
5. Check dashboard for updated status
6. Click "Envoyer le récapitulatif" to send recap email

## 8. Deploy to Vercel

```bash
# Set environment variables in Vercel dashboard first
# Remove OCTOPUSH_SMS_MODE (or set to empty) for real SMS

git push origin main
```

Vercel Cron Jobs configured in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/send-sms", "schedule": "0 16 * * *" },
    { "path": "/api/cron/send-recap", "schedule": "0 8 * * *" }
  ]
}
```

Note: Cron schedules are in UTC. `16:00 UTC` = `18:00 Europe/Paris` (CET), `08:00 UTC` = `10:00 Europe/Paris` (CET). Adjust for CEST (summer time) if needed.
