# Service Distinction Implementation Summary

**Date:** 2026-03-13
**Feature:** Automatic service (midi/soir) assignment for bookings based on time

## Overview

Implemented a database-driven service distinction system that automatically assigns bookings to either "midi" or "soir" service based on a 17:00 cutoff time. This replaces the previous runtime calculation approach that was duplicated across multiple files.

## Changes Made

### 1. Database Migration

**File:** `supabase/migrations/013_add_service_column.sql`

- Added `service` column to `bookings` table (text, NOT NULL)
- Backfilled all existing bookings with appropriate service values
- Added CHECK constraint to enforce valid values ('midi' or 'soir')
- Created composite index on (restaurant_id, booking_date, service) for query optimization
- Implemented PostgreSQL trigger that automatically assigns service based on booking_time:
  - `< 17:00` → 'midi'
  - `≥ 17:00` → 'soir'
- Trigger fires on INSERT and UPDATE of booking_time column

### 2. Constants Update

**File:** `src/lib/constants.ts`

- Updated `SOIR_CUTOFF` from `'15:00'` to `'17:00'`
- Added `Service` type export: `'midi' | 'soir'`

### 3. Validator Update

**File:** `src/lib/validators/booking.ts`

- Added optional `service` field to `bookingRowSchema`
- Made optional because trigger assigns automatically in database

### 4. Component Updates

**Files:**
- `src/components/bookings-table.tsx`
- `src/components/recap-preview.tsx`

Changes in both:
- Added `service: string` to Booking interface
- Replaced time-based filtering (`b.booking_time < SOIR_CUTOFF`) with `b.service === 'midi'` / `b.service === 'soir'`
- Removed unused `SOIR_CUTOFF` imports

### 5. API Route Update

**File:** `src/app/api/recap/send/route.ts`

- Added `service` to bookings SELECT query
- Replaced time-based filtering with service-based filtering
- Removed unused `SOIR_CUTOFF` import

### 6. Service Layer Updates

**Files:**
- `src/lib/services/sms-sender.ts`
- `src/lib/services/recap-email.ts`

Changes:
- Added `service: string` to Booking/RecapBooking interfaces

### 7. Page Updates

**File:** `src/app/bookings/page.tsx`

- Added `service: string` to Booking interface

### 8. Test Updates

**Files:**
- `tests/integration/sms-sender.test.ts`
- `tests/integration/recap-email.test.ts`
- `tests/integration/cron-idempotency.test.ts`

Changes:
- Added `service: 'soir'` to all mock booking objects
- All 112 tests pass ✅

## Verification Checklist

### Before Deployment

- [x] All TypeScript files compile without errors
- [x] ESLint passes with no warnings
- [x] All unit and integration tests pass (112/112)
- [ ] Docker running to test migration locally
- [ ] Migration tested in development environment

### After Deployment

Execute the following verification steps:

#### 1. Migration Success
```sql
-- Verify column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings' AND column_name = 'service';

-- Verify all bookings have service assigned
SELECT COUNT(*) as total,
       COUNT(service) as with_service,
       COUNT(*) - COUNT(service) as missing
FROM bookings;

-- Verify constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'bookings_service_check';

-- Verify index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bookings' AND indexname = 'idx_bookings_service';

-- Verify trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_booking_service';
```

#### 2. Trigger Functionality
```sql
-- Test INSERT with morning time (should be 'midi')
INSERT INTO bookings (restaurant_id, guest_name, phone, booking_date, booking_time, party_size, status)
VALUES ('<restaurant_id>', 'Test Midi', '+33612345678', '2026-03-20', '12:00', 2, 'pending');

-- Verify service = 'midi'
SELECT guest_name, booking_time, service FROM bookings WHERE guest_name = 'Test Midi';

-- Test INSERT with evening time (should be 'soir')
INSERT INTO bookings (restaurant_id, guest_name, phone, booking_date, booking_time, party_size, status)
VALUES ('<restaurant_id>', 'Test Soir', '+33612345678', '2026-03-20', '19:00', 2, 'pending');

-- Verify service = 'soir'
SELECT guest_name, booking_time, service FROM bookings WHERE guest_name = 'Test Soir';

-- Test UPDATE crossing cutoff (12:00 → 19:00)
UPDATE bookings SET booking_time = '19:00' WHERE guest_name = 'Test Midi';

-- Verify service changed to 'soir'
SELECT guest_name, booking_time, service FROM bookings WHERE guest_name = 'Test Midi';

-- Cleanup
DELETE FROM bookings WHERE guest_name IN ('Test Midi', 'Test Soir');
```

#### 3. UI Functionality Tests

1. **Manual Booking Creation:**
   - Create booking at 12:00 → should appear in "Midi" section
   - Create booking at 19:00 → should appear in "Soir" section

2. **CSV Import:**
   - Import CSV with varied times (10:00, 12:30, 16:45, 17:00, 20:00)
   - Verify correct distribution between Midi/Soir sections

3. **Recap Email Filtering:**
   - Send "Midi" recap → verify only bookings < 17:00 included
   - Send "Soir" recap → verify only bookings ≥ 17:00 included

4. **Edge Cases:**
   - Booking at 16:59:59 → should be 'midi'
   - Booking at 17:00:00 → should be 'soir'

#### 4. Performance Verification
```sql
-- Verify index is being used
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE restaurant_id = '<restaurant_id>'
  AND booking_date = '2026-03-20'
  AND service = 'soir';

-- Should show "Index Scan using idx_bookings_service"
```

## Rollback Plan

If issues occur after deployment:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_set_booking_service ON bookings;

-- Drop function
DROP FUNCTION IF EXISTS set_booking_service();

-- Drop index
DROP INDEX IF EXISTS idx_bookings_service;

-- Drop constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_check;

-- Drop column
ALTER TABLE bookings DROP COLUMN IF EXISTS service;
```

Then revert the following code changes:
- Restore time-based filtering in `bookings-table.tsx`, `recap-preview.tsx`, `api/recap/send/route.ts`
- Restore `SOIR_CUTOFF` imports
- Remove `service` field from all interfaces
- Restore `constants.ts` to `SOIR_CUTOFF = '15:00'`

## Benefits

✅ **Single Source of Truth:** Service is stored in database, not calculated at runtime
✅ **Consistent Logic:** Trigger ensures all bookings have correct service assignment
✅ **Better Performance:** Indexed column enables efficient filtering at database level
✅ **Maintainability:** Service cutoff rule only exists in one place (trigger function)
✅ **Flexibility:** Easy to add service-based features in future (statistics, reporting, etc.)

## Notes

- The cutoff time was changed from 15:00 to 17:00 as specified in the plan
- All existing bookings were backfilled during migration
- The trigger automatically handles both new inserts and updates to booking_time
- No changes required to booking creation logic (forms, CSV import, etc.)
