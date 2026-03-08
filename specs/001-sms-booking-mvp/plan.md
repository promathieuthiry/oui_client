# Implementation Plan: SMS Booking MVP

**Branch**: `001-sms-booking-mvp` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sms-booking-mvp/spec.md`

## Summary

Build the OuiClient MVP — a restaurant booking confirmation system via SMS. Operators import bookings from CSV, send confirmation SMS via Octopush, capture OUI/NON replies via webhook, and send recap emails to restaurants via Resend. The system runs as a single Next.js App Router project on Vercel with Supabase (PostgreSQL) for data and auth.

## Technical Context

**Language/Version**: TypeScript (strict mode) / Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Resend, Papa Parse, Zod
**Storage**: Supabase (PostgreSQL) with Row Level Security
**Testing**: Vitest with mocked external APIs (Octopush, Resend)
**Target Platform**: Vercel (production), localhost (development)
**Project Type**: Web application (Next.js)
**Performance Goals**: Import + send 50 bookings in < 5 min, SMS delivery > 95%
**Constraints**: Single Next.js project, no microservices, French UI, 2 operator accounts
**Scale/Scope**: 1-5 restaurants, ~50 bookings/day per restaurant, 2 operators

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate Question | Status |
|---|-----------|--------------|--------|
| I | SMS Reliability First | Is the SMS pipeline path preserved (import → send → reply → recap)? | PASS — Linear flow through 4 user stories |
| I | SMS Reliability First | Are Octopush calls isolated behind a service interface? | PASS — Single `lib/services/octopush.ts` module |
| I | SMS Reliability First | Are failed deliveries retried with exponential backoff? | PASS — FR-008, max 3 retries |
| I | SMS Reliability First | Does reply parsing handle variations? | PASS — FR-005, regex-based OUI/NON/indéterminé |
| I | SMS Reliability First | Is recap sent even with zero replies? | PASS — US2 acceptance scenario 3 |
| II | Operator-Centric | Can all daily ops be done via web UI? | PASS — FR-006, manual triggers in dashboard |
| II | Operator-Centric | Are all messages in plain French? | PASS — FR-015, French UI/SMS/email |
| II | Operator-Centric | Do bulk ops show confirmation before executing? | PASS — US1 acceptance scenario 2 |
| III | Structural Simplicity | Is it a single Next.js project? | PASS — No microservices, no monorepo |
| III | Structural Simplicity | Deployable via git push with env vars only? | PASS — Vercel + env vars |
| III | Structural Simplicity | Are new dependencies justified? | PASS — All deps serve specific needs (see research.md) |
| IV | Controlled Data Handling | Phone numbers in E.164, masked in logs? | PASS — FR-013 |
| IV | Controlled Data Handling | Data scoped per restaurant with RLS? | PASS — FR-014, Supabase RLS |
| IV | Controlled Data Handling | No API keys in repo? | PASS — All keys in env vars |
| V | Flexible Import | CSV import with configurable column mapping? | PASS — FR-011, US4 |
| V | Flexible Import | Row-level validation? | PASS — FR-002, Zod schemas |
| V | Flexible Import | Import idempotent (no duplicates)? | PASS — FR-012, key: phone+date+hour+restaurant |

**Result**: All gates PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-sms-booking-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api-routes.md
│   └── webhooks.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Dashboard (redirect to /bookings)
│   ├── login/
│   │   └── page.tsx                      # Login page
│   ├── bookings/
│   │   ├── page.tsx                      # Bookings list + status view
│   │   └── import/
│   │       └── page.tsx                  # CSV import + column mapping
│   ├── restaurants/
│   │   └── page.tsx                      # Restaurant management
│   └── api/
│       ├── cron/
│       │   ├── send-sms/
│       │   │   └── route.ts              # Cron: daily SMS send
│       │   └── send-recap/
│       │       └── route.ts              # Cron: daily recap email
│       ├── sms/
│       │   ├── send/
│       │   │   └── route.ts              # Manual SMS send trigger
│       │   └── reply/
│       │       └── route.ts              # Webhook: inbound SMS reply
│       ├── webhooks/
│       │   └── octopush/
│       │       └── delivery/
│       │           └── route.ts          # Webhook: delivery receipt
│       └── recap/
│           └── send/
│               └── route.ts              # Manual recap send trigger
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser Supabase client
│   │   ├── server.ts                     # Server Supabase client
│   │   └── middleware.ts                 # Auth session refresh
│   ├── services/
│   │   ├── octopush.ts                   # Octopush API service (isolated)
│   │   ├── sms-sender.ts                 # SMS sending orchestration (retries, logging)
│   │   ├── reply-parser.ts               # OUI/NON/indéterminé parsing
│   │   ├── recap-email.ts                # Recap generation + Resend send
│   │   └── csv-import.ts                 # CSV parsing, validation, upsert
│   ├── validators/
│   │   └── booking.ts                    # Zod schemas for booking validation
│   └── utils/
│       └── phone.ts                      # E.164 formatting + masking
├── components/
│   ├── bookings-table.tsx                # Booking list with status badges
│   ├── csv-upload.tsx                    # File upload + column mapper
│   ├── send-confirmation.tsx             # Send SMS confirmation dialog
│   ├── recap-preview.tsx                 # Recap email preview + send button
│   └── status-badge.tsx                  # Booking status badge component
├── emails/
│   └── recap-email.tsx                   # React Email template for recap
└── middleware.ts                         # Root middleware (auth + session)

supabase/
└── migrations/
    ├── 001_create_restaurants.sql
    ├── 002_create_profiles.sql
    ├── 003_create_bookings.sql
    ├── 004_create_sms_sends.sql
    ├── 005_create_sms_replies.sql
    ├── 006_create_recaps.sql
    └── 007_enable_rls.sql

tests/
├── unit/
│   ├── reply-parser.test.ts
│   ├── csv-import.test.ts
│   ├── phone.test.ts
│   └── booking-validator.test.ts
└── integration/
    ├── sms-sender.test.ts
    ├── recap-email.test.ts
    └── cron-idempotency.test.ts
```

**Structure Decision**: Single Next.js App Router project (Principle III). All source under `src/` with `app/` for routes, `lib/` for business logic, `components/` for UI, `emails/` for email templates. Database migrations in `supabase/migrations/`. Tests in `tests/` with unit and integration separation.

## Complexity Tracking

> No violations to justify. All gates pass.
