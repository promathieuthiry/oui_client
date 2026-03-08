# Research: SMS Booking MVP

**Date**: 2026-03-08
**Feature**: 001-sms-booking-mvp

## R1: Octopush SMS API Integration

**Decision**: Use Octopush REST API v1 with webhook-based inbound SMS and delivery receipts.

**Rationale**: Octopush provides a modern REST API with JSON payloads, built-in simulation mode (`mode: "simu"`), and webhook-based two-way SMS — all ideal for the confirmation pipeline.

**Key details**:
- **Send endpoint**: `POST https://api.octopush.com/v1/public/sms-campaign/send`
- **Auth**: Headers `api-login` + `api-key`
- **Phone format**: E.164 required (`+33600000000`)
- **Batch**: Up to 500 recipients per request
- **Reply type**: Set `with_replies: true` to enable two-way SMS (Premium SMS in France)
- **Inbound webhook payload**: `{ message_id, number, text, reception_date }`
- **Delivery receipt webhook**: `{ message_id, number, status, delivery_date }`
- **Status values**: `DELIVERED`, `NOT_DELIVERED`, `BAD_DESTINATION`, `BLACKLISTED_NUMBER`, `UNKNOWN_DELIVERY`
- **Sandbox**: `mode: "simu"` — validates request, returns HTTP 201, no SMS sent, no credits consumed
- **Webhook constraint**: Must respond within ~1 second, process asynchronously

**Alternatives considered**:
- Twilio: More expensive, more complex, unnecessary for France-only
- Vonage: Similar pricing tier but less French market focus

## R2: Resend Transactional Email

**Decision**: Use Resend with React Email components for recap email delivery.

**Rationale**: Best DX for Next.js, React component templates, free tier covers MVP needs (3,000 emails/month, 100/day), batch sending support.

**Key details**:
- **Package**: `resend` + `@react-email/components`
- **API pattern**: `resend.emails.send({ from, to, subject, react: Component(props) })` — returns `{ data, error }`
- **Batch**: `resend.batch.send([...])` for up to 100 emails per call
- **Rate limit**: 2 requests/second
- **Free tier**: 3,000 emails/month, 100/day — sufficient for ~50 recap emails/day
- **Domain**: Must verify sending domain via DNS for production
- **Testing**: Use `delivered@resend.dev` as recipient during development
- **Error types**: `missing_api_key` (401), `validation_error` (403), `rate_limit_exceeded` (429)

**Alternatives considered**:
- SendGrid: More complex setup, less developer-friendly
- AWS SES: Overkill for MVP scale
- Nodemailer + SMTP: Deliverability issues

## R3: Supabase Auth + RLS

**Decision**: Use `@supabase/ssr` with cookie-based auth, disabled public signup, RLS scoped by restaurant_id.

**Rationale**: `@supabase/ssr` is the recommended package for Next.js App Router. Disabling public signup and creating 2 operator accounts via dashboard is the simplest approach. RLS with `auth.uid()` → `restaurant_id` lookup provides database-level tenant isolation.

**Key details**:
- **Packages**: `@supabase/supabase-js` + `@supabase/ssr`
- **Client files**: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/middleware.ts` (session refresh)
- **Auth check**: Always use `supabase.auth.getUser()` (not `getSession()`) on server for security
- **User creation**: Disable public signup in dashboard, create 2 users via Supabase Dashboard (Authentication > Users > Add user)
- **RLS pattern**: Policy using subquery `restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())`
- **Indexes**: Add index on `restaurant_id` columns for RLS performance

**Alternatives considered**:
- NextAuth: More complexity for simple email/password
- `@supabase/auth-helpers-nextjs`: Deprecated, replaced by `@supabase/ssr`

## R4: Vercel Cron Jobs

**Decision**: Use Vercel native cron with `vercel.json` configuration, secured via `CRON_SECRET`.

**Rationale**: Zero infrastructure overhead, works with existing Vercel deployment, built-in auth mechanism.

**Key details**:
- **Config**: `vercel.json` with `crons` array (`path` + `schedule` in cron expression)
- **Security**: Vercel sends `CRON_SECRET` as `Authorization: Bearer <secret>` header — verify in route handler
- **Idempotency**: Track execution with marker fields (e.g., `sms_sent_at` on booking record)
- **Limits (Hobby)**: 2 cron jobs, max 1 trigger/day each, 10s timeout
- **Limits (Pro)**: Higher job count, up to 300s timeout, more frequent schedules
- **Runs only on production** — not on preview deployments
- **Local testing**: Hit endpoint directly at `localhost:3000/api/cron/...`
- **Required**: `export const dynamic = 'force-dynamic'` to prevent cached responses

**Two cron jobs needed**:
1. SMS send: Daily at 18:00 Europe/Paris (`0 16 * * *` UTC, adjust for DST)
2. Recap email: Daily at 10:00 Europe/Paris (`0 8 * * *` UTC, adjust for DST)

**Alternatives considered**:
- QStash / Inngest: Better for complex workflows but adds external dependency (Principle III)
- External cron services: Adds infrastructure complexity

## R5: CSV Parsing

**Decision**: Use Papa Parse for CSV parsing with Next.js Server Actions for file upload.

**Rationale**: Papa Parse is the fastest parser with excellent error reporting, auto-delimiter detection, and TypeScript generics. Server Actions provide the simplest upload pattern with no manual API endpoint.

**Key details**:
- **Package**: `papaparse` + `@types/papaparse`
- **Upload**: Server Action with `FormData`, file accessed via `formData.get('file') as File`
- **Parsing**: `Papa.parse(text, { header: true, skipEmptyLines: true })`
- **Validation**: Combine with Zod schemas for row-level validation (phone format, date, required fields)
- **Encoding**: Papa Parse handles UTF-8 natively; French accented characters work out of the box
- **Size limit**: Configure `serverActions.bodySizeLimit` in `next.config.js` (default 1MB, increase to 2MB)
- **Errors**: `results.errors` contains parsing errors with row numbers

**Alternatives considered**:
- csv-parse: More Node.js-oriented, 2x slower
- fast-csv: Good but less browser testing, smaller community
