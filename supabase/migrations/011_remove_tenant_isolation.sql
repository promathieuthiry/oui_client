-- Migration 011: Remove tenant isolation
-- Replace per-tenant RLS with simple authenticated access.
-- Active restaurant is now tracked via cookie, not profiles table.

-- 1. Drop all tenant_isolation policies
DROP POLICY IF EXISTS "tenant_isolation" ON restaurants;
DROP POLICY IF EXISTS "tenant_isolation" ON bookings;
DROP POLICY IF EXISTS "tenant_isolation" ON sms_sends;
DROP POLICY IF EXISTS "tenant_isolation" ON sms_replies;
DROP POLICY IF EXISTS "tenant_isolation" ON recaps;

-- 2. Drop own_profile policy on profiles
DROP POLICY IF EXISTS "own_profile" ON profiles;

-- 3. Drop auth_restaurant_id() function
DROP FUNCTION IF EXISTS auth_restaurant_id();

-- 4. Drop profiles table (and its index)
DROP INDEX IF EXISTS idx_profiles_restaurant_id;
DROP TABLE IF EXISTS profiles;

-- 5. Create simple authenticated access policies
CREATE POLICY "authenticated_access" ON restaurants
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_access" ON bookings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_access" ON sms_sends
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_access" ON sms_replies
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_access" ON recaps
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
