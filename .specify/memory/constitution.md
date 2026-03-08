<!--
Sync Impact Report — Constitution v1.0.0 (2026-03-08)

Templates cross-checked:
  - plan-template.md: Constitution Check gates align with 5 principles.
    Gate examples: "SMS pipeline path preserved?", "Requires terminal/SQL?",
    "New dependency or service introduced?", "Phone numbers masked in logs?",
    "Import idempotent?"
  - spec-template.md: No conflicts. User stories must include French-language
    acceptance scenarios (Principle II). Edge cases must cover SMS delivery
    failure and unparseable replies (Principle I).
  - tasks-template.md: No conflicts. Single-project path convention applies
    (Principle III). No microservice phases needed.

No breaking changes to existing specs or tasks (none exist yet).
-->

# OuiClient Constitution

## Core Principles

### I. SMS Reliability First

The SMS pipeline is the product. Every decision MUST prioritize the path: booking data → SMS delivery → reply capture → recap email.

- SMS sends logged with Octopush response status
- Failed deliveries retried (max 3, exponential backoff)
- Octopush integration isolated behind a service interface
- Reply parsing handles variations (case, whitespace, typos like "oui.", "Oui!", "non merci"); unparseable replies flagged for operator review
- Recap email sent even with zero replies

### II. Operator-Centric Design

Built for 2 co-founders, one non-technical. Daily ops MUST NOT require terminal, SQL, or API calls.

- All UI/error messages in plain French, no developer jargon
- Every action achievable through the web UI
- Errors show actionable next steps in French, not stack traces
- Bulk operations (import, send) require a confirmation step showing what will happen

### III. Structural Simplicity

Single Next.js project. No microservices, no monorepo, no queue systems, no feature flags unless a concrete failure scenario requires them.

- Explicit linear flows preferred over abstractions
- New dependencies must be justified
- Deployable via `git push` to Vercel with only env vars

### IV. Controlled Data Handling

Pragmatic privacy without formal GDPR process.

- Phone numbers in E.164 format, masked in logs (`+33 6 XX XX XX 34`)
- Booking data scoped per restaurant (always filtered by restaurant ID)
- Supabase RLS on customer data tables
- 90-day data retention, then purge/anonymize
- No API keys in repo, no public-facing API endpoints

### V. Flexible Import

Each restaurant manages bookings differently. The import system adapts without code changes.

- CSV import with configurable column mapping per restaurant
- Row-level validation (phone format, date not in past, required fields)
- Saved column mappings per restaurant
- API import as secondary method via isolated adapters
- Import is idempotent (re-import updates, no duplicates)

## Technical Standards

- **Stack**: Next.js (App Router), Supabase (PostgreSQL), Octopush API, Vercel
- **SMS**: All Octopush calls through a single service module
- **Email**: Transactional email (Resend or equivalent) for recap delivery
- **Scheduling**: Vercel Cron Jobs for daily SMS sends and recap generation, secured with `CRON_SECRET`, idempotent
- **Language**: TypeScript strict mode, no `any` without justification
- **Testing**: Vitest, mock all external APIs, critical paths tested (SMS sending, CSV parsing, reply parsing, recap generation, cron idempotency)
- **French**: UI/SMS/emails in French, code internals in English, SMS templates configurable

## Development Workflow

- `main` = production branch, feature branches merged via PR
- Preview deployments for review by both co-founders
- PR summaries in plain French for non-technical co-founder
- New features start with a spec (`.specify/` workflow)
- Local/preview environments use Octopush sandbox mode
- Manual send/recap trigger in admin UI as cron fallback

## Governance

This constitution is the highest-authority document for OuiClient. All specs, plans, and code reviews MUST verify compliance with these principles.

- Amendments require written justification and approval from both co-founders
- Any violation of Principle I (SMS Reliability) or Principle IV (Data Handling) MUST be flagged as a blocking issue
- Complexity additions (new services, dependencies, abstractions) require a written justification referencing Principle III
- Use this file as the gate checklist during plan reviews (plan-template.md Constitution Check)

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
