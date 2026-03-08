# Tasks: Confirmation de Réservation par SMS — MVP

**Input**: Design documents from `/specs/001-sms-booking-mvp/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution mandates critical path testing (SMS sending, CSV parsing, reply parsing, recap generation, cron idempotency).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (Next.js App Router under `src/app/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and configuration

- [x] T001 Initialize Next.js 15 project with TypeScript strict mode, install dependencies (next, @supabase/supabase-js, @supabase/ssr, resend, @react-email/components, papaparse, zod) and dev dependencies (vitest, @types/papaparse) in package.json
- [x] T002 [P] Configure Vitest with TypeScript support and path aliases in vitest.config.ts
- [x] T003 [P] Create environment variable template in .env.local.example with all required keys (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OCTOPUSH_API_LOGIN, OCTOPUSH_API_KEY, OCTOPUSH_SMS_MODE, OCTOPUSH_SENDER, RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET, NEXT_PUBLIC_APP_URL)
- [x] T004 [P] Create vercel.json with cron job configuration: send-sms at 0 16 * * * UTC and send-recap at 0 8 * * * UTC in vercel.json
- [x] T005 [P] Configure next.config.ts with TypeScript strict mode and serverActions.bodySizeLimit of 2mb

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth, shared utilities, and app shell — MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create database migration for restaurants table with fields per data-model.md (id, name, email, sms_template, csv_mapping, sms_send_time, recap_send_time, timestamps) in supabase/migrations/001_create_restaurants.sql
- [x] T007 Create database migration for profiles table (id FK auth.users, restaurant_id FK restaurants, display_name, created_at) in supabase/migrations/002_create_profiles.sql
- [x] T008 Create database migration for bookings table with unique constraint on (restaurant_id, phone, booking_date, booking_time) and index on (restaurant_id, booking_date) in supabase/migrations/003_create_bookings.sql
- [x] T009 [P] Create database migration for sms_sends table (id, booking_id FK, octopush_ticket, status, attempts, last_attempt_at, delivery_status, error_message, created_at) with index on booking_id in supabase/migrations/004_create_sms_sends.sql
- [x] T010 [P] Create database migration for sms_replies table (id, booking_id FK, raw_text, interpretation, octopush_message_id, received_at, created_at) with index on booking_id in supabase/migrations/005_create_sms_replies.sql
- [x] T011 [P] Create database migration for recaps table (id, restaurant_id FK, service_date, booking_count, email_status, resend_id, sent_at, created_at) with index on (restaurant_id, service_date) in supabase/migrations/006_create_recaps.sql
- [x] T012 Create database migration enabling RLS on all tables with tenant isolation policies using profiles.restaurant_id lookup per data-model.md in supabase/migrations/007_enable_rls.sql
- [x] T013 [P] Implement Supabase browser client utility in src/lib/supabase/client.ts using createBrowserClient from @supabase/ssr
- [x] T014 [P] Implement Supabase server client utility in src/lib/supabase/server.ts using createServerClient with cookie handlers
- [x] T015 [P] Implement Supabase auth session refresh middleware helper in src/lib/supabase/middleware.ts with updateSession function
- [x] T016 [P] Implement phone number utilities (toE164, maskPhone) with French number support in src/lib/utils/phone.ts
- [x] T017 [P] Implement Zod booking validation schemas (bookingRowSchema, phoneSchema) per data-model.md validation rules in src/lib/validators/booking.ts
- [x] T018 Implement root auth middleware that refreshes session and redirects unauthenticated users to /login in src/middleware.ts
- [x] T019 Create app layout with French locale, global navigation (Réservations, Restaurants), and auth state in src/app/layout.tsx
- [x] T020 Create login page with email/password form and Supabase auth in src/app/login/page.tsx
- [x] T021 Create root page that redirects to /bookings in src/app/page.tsx

**Checkpoint**: Foundation ready — database schema, auth, shared utilities, and app shell are in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — Envoyer un SMS de confirmation et recevoir une réponse (Priority: P1) 🎯 MVP

**Goal**: Complete SMS confirmation loop — import bookings from CSV, send SMS, receive OUI/NON replies, view status in dashboard.

**Independent Test**: Import a CSV with your own phone number, trigger SMS send, reply OUI, verify status updates in dashboard.

### Tests for User Story 1

- [x] T022 [P] [US1] Unit test for reply parser covering OUI/NON/unknown variations (oui, OUI, Oui!, oui., oui merci, non, NON, Non merci, peut-être, random text) in tests/unit/reply-parser.test.ts
- [x] T023 [P] [US1] Unit test for phone utilities (toE164 with various French formats, maskPhone output) in tests/unit/phone.test.ts
- [x] T024 [P] [US1] Unit test for booking validator (valid row, invalid phone, past date, missing fields, party_size <= 0) in tests/unit/booking-validator.test.ts
- [x] T025 [P] [US1] Integration test for SMS sender with mocked Octopush API (successful send, failed send, retry logic, max 3 attempts) in tests/integration/sms-sender.test.ts

### Implementation for User Story 1

- [x] T026 [US1] Implement Octopush API service (sendSMS with auth headers, simu mode support, with_replies flag) isolated behind service interface in src/lib/services/octopush.ts
- [x] T027 [US1] Implement reply parser with regex classification (oui/non/unknown) handling case, whitespace, punctuation, common French phrases in src/lib/services/reply-parser.ts
- [x] T028 [US1] Implement SMS sender orchestration (send to bookings list, create sms_send records, retry logic with exponential backoff, idempotency via sms_sent_at marker) in src/lib/services/sms-sender.ts
- [x] T029 [US1] Implement basic CSV import service (parse with Papa Parse, validate each row with Zod, format phones to E.164, upsert bookings by unique key, return imported/updated/errors counts) in src/lib/services/csv-import.ts
- [x] T030 [P] [US1] Create status badge component displaying booking statuses in French (En attente, Confirmée, Annulée, À vérifier, Échec) with color coding in src/components/status-badge.tsx
- [x] T031 [P] [US1] Create CSV upload component with file input (.csv accept), upload progress, and results display (imported/errors) in src/components/csv-upload.tsx
- [x] T032 [US1] Create bookings table component with columns (Nom, Téléphone masqué, Date, Heure, Couverts, Statut) and status badge integration in src/components/bookings-table.tsx
- [x] T033 [US1] Create send SMS confirmation dialog showing count of SMS to send, list of phone numbers (masked), and confirm/cancel buttons in src/components/send-confirmation.tsx
- [x] T034 [US1] Implement POST /api/sms/send route — auth check, query pending bookings by restaurant_id and date, call sms-sender, return results per api-routes.md contract in src/app/api/sms/send/route.ts
- [x] T035 [US1] Implement POST /api/sms/reply webhook — parse Octopush inbound payload, classify reply, match by phone to all pending/sms_sent bookings, create sms_reply records, update booking statuses, return 200 empty per webhooks.md contract in src/app/api/sms/reply/route.ts
- [x] T036 [US1] Implement POST /api/webhooks/octopush/delivery — parse DLR payload, update sms_send delivery_status, update booking status on DELIVERED, trigger retry on NOT_DELIVERED if attempts < 3, return 200 empty per webhooks.md contract in src/app/api/webhooks/octopush/delivery/route.ts
- [x] T037 [US1] Create bookings list page with date filter, bookings table, "Envoyer les SMS" button with confirmation dialog, and real-time status display in src/app/bookings/page.tsx
- [x] T038 [US1] Create CSV import page with restaurant selector, CSV upload component, import results display (imported count, error list with row numbers and French messages) in src/app/bookings/import/page.tsx

**Checkpoint**: User Story 1 complete — full SMS pipeline testable end-to-end. Import CSV → Send SMS → Receive reply → View status. This is the MVP.

---

## Phase 4: User Story 2 — Recevoir le récapitulatif par email (Priority: P2)

**Goal**: Generate and send recap email with all bookings for a given date and their confirmation statuses.

**Independent Test**: After US1 bookings exist with various statuses, trigger recap send and verify email content.

### Tests for User Story 2

- [x] T039 [P] [US2] Integration test for recap email service with mocked Resend API (email with mixed statuses, email with zero replies, re-send behavior) in tests/integration/recap-email.test.ts

### Implementation for User Story 2

- [x] T040 [US2] Create React Email recap template with restaurant header, date, booking table (Nom, Heure, Couverts, Statut), and French formatting in src/emails/recap-email.tsx
- [x] T041 [US2] Implement recap email service (query bookings by restaurant+date, render email template, send via Resend, create recap record, handle re-sends) in src/lib/services/recap-email.ts
- [x] T042 [US2] Create recap preview component showing booking summary table and "Envoyer le récapitulatif" button in src/components/recap-preview.tsx
- [x] T043 [US2] Implement POST /api/recap/send route — auth check, call recap-email service, return recap_id and status per api-routes.md contract in src/app/api/recap/send/route.ts
- [x] T044 [US2] Add recap section to bookings page with date selector, recap preview, and send button in src/app/bookings/page.tsx

**Checkpoint**: User Stories 1 AND 2 complete — full pipeline from import to recap email.

---

## Phase 5: User Story 3 — Envoi automatique quotidien (Priority: P3)

**Goal**: Automated daily SMS sends (18h day before) and recap emails (10h morning of) via Vercel Cron, with idempotency.

**Independent Test**: Import bookings for tomorrow and today, verify cron endpoints send SMS and recap without duplicates.

### Tests for User Story 3

- [x] T045 [P] [US3] Integration test for cron idempotency (sms_sent_at marker prevents double-send, recap not re-sent if already exists, CRON_SECRET validation) in tests/integration/cron-idempotency.test.ts

### Implementation for User Story 3

- [x] T046 [US3] Implement GET /api/cron/send-sms route — verify CRON_SECRET, query bookings for tomorrow with sms_sent_at IS NULL, send SMS per restaurant, set sms_sent_at, force-dynamic, return summary per api-routes.md contract in src/app/api/cron/send-sms/route.ts
- [x] T047 [US3] Implement GET /api/cron/send-recap route — verify CRON_SECRET, query restaurants with bookings today, skip if recap already sent, send recap email, force-dynamic, return summary per api-routes.md contract in src/app/api/cron/send-recap/route.ts
- [x] T048 [US3] Add auto-send status indicators to bookings page showing last cron run status and manual fallback trigger buttons in src/app/bookings/page.tsx

**Checkpoint**: All daily operations can run hands-free. Operator only intervenes on failures.

---

## Phase 6: User Story 4 — Import flexible avec mapping de colonnes (Priority: P4)

**Goal**: Configurable CSV column mapping per restaurant, saved for reuse, with row-level validation feedback.

**Independent Test**: Import a CSV with non-standard column names, configure mapping, save, re-import a modified file, verify updates without duplicates.

### Tests for User Story 4

- [x] T049 [P] [US4] Unit test for CSV import with column mapping (apply mapping, save/load mapping, re-import idempotency, validation errors with French messages) in tests/unit/csv-import.test.ts

### Implementation for User Story 4

- [x] T050 [US4] Enhance CSV import service with column mapping support (accept mapping config, apply before validation, support save/load from restaurant.csv_mapping) in src/lib/services/csv-import.ts
- [x] T051 [US4] Enhance CSV upload component with interactive column mapper UI (dropdown per detected column → target field, auto-detect suggestions, save mapping checkbox) in src/components/csv-upload.tsx
- [x] T052 [US4] Update import page with mapping workflow (detect columns → show mapper → preview → confirm import) in src/app/bookings/import/page.tsx

**Checkpoint**: All user stories complete — each independently testable and functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all stories

- [x] T053 Create restaurant management page with name, email, SMS template editor, and saved mapping display in src/app/restaurants/page.tsx
- [x] T054 [P] Add consistent French error messages, loading states, and empty states across all pages
- [x] T055 [P] Verify phone number masking in all UI displays and server logs per constitution Principle IV
- [ ] T056 Run quickstart.md validation — full end-to-end manual test of the complete pipeline per specs/001-sms-booking-mvp/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion
  - Execute sequentially in priority order: P1 → P2 → P3 → P4
  - US2 reuses US1 booking data and status model
  - US3 reuses US1 sms-sender and US2 recap-email services
  - US4 enhances US1 csv-import service
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — No dependencies on other stories
- **US2 (P2)**: Can start after Foundational — Uses booking statuses from US1 but independently testable (can create test data directly)
- **US3 (P3)**: Depends on US1 (sms-sender) and US2 (recap-email) services being implemented
- **US4 (P4)**: Enhances US1 csv-import service — depends on US1 basic import being in place

### Within Each User Story

- Tests FIRST, ensure they FAIL before implementation
- Services before API routes
- API routes before UI pages
- Components can be built in parallel with services

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005 can all run in parallel after T001
- Phase 2: T009–T011 in parallel, T013–T017 in parallel
- US1: T022–T025 tests in parallel, T030–T031 components in parallel
- US2: T039 test in parallel with US1 implementation
- US3: T045 test in parallel with US2 implementation
- US4: T049 test in parallel with US3 implementation

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
Task: "Unit test for reply parser in tests/unit/reply-parser.test.ts"
Task: "Unit test for phone utilities in tests/unit/phone.test.ts"
Task: "Unit test for booking validator in tests/unit/booking-validator.test.ts"
Task: "Integration test for SMS sender in tests/integration/sms-sender.test.ts"

# Launch parallel US1 components:
Task: "Create status badge component in src/components/status-badge.tsx"
Task: "Create CSV upload component in src/components/csv-upload.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test with your own phone number — import CSV, send SMS, reply OUI, check dashboard
5. Deploy to Vercel in simu mode for demo

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test end-to-end → Deploy (MVP! Can test with real phone)
3. Add US2 → Test recap email → Deploy (Restaurant gets email)
4. Add US3 → Test cron → Deploy (Hands-free daily operation)
5. Add US4 → Test mapping → Deploy (Multi-restaurant ready)
6. Polish → Final quality pass → Production launch

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Tests written first, must fail before implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All UI text in French, code internals in English
- Use Octopush simu mode for development (OCTOPUSH_SMS_MODE=simu)
