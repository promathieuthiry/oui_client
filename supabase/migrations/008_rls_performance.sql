-- Migration 008: RLS performance improvements
-- Based on Supabase best practices (security-rls-performance.md)

-- 1. Add missing index on profiles.restaurant_id (FK index best practice)
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_id ON profiles (restaurant_id);

-- 2. Create a security definer function to cache restaurant_id lookup
-- This avoids per-row subquery evaluation in RLS policies
CREATE OR REPLACE FUNCTION auth_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

-- 3. Drop old RLS policies and recreate with optimized versions

-- Restaurants: use cached auth.uid() via (SELECT ...) pattern
DROP POLICY IF EXISTS "tenant_isolation" ON restaurants;
CREATE POLICY "tenant_isolation" ON restaurants
  FOR ALL TO authenticated
  USING (id = auth_restaurant_id())
  WITH CHECK (id = auth_restaurant_id());

-- Profiles: use cached auth.uid()
DROP POLICY IF EXISTS "own_profile" ON profiles;
CREATE POLICY "own_profile" ON profiles
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Bookings: use security definer function instead of subquery
DROP POLICY IF EXISTS "tenant_isolation" ON bookings;
CREATE POLICY "tenant_isolation" ON bookings
  FOR ALL TO authenticated
  USING (restaurant_id = auth_restaurant_id())
  WITH CHECK (restaurant_id = auth_restaurant_id());

-- SMS Sends: use security definer function (avoids IN subquery + nested subquery)
DROP POLICY IF EXISTS "tenant_isolation" ON sms_sends;
CREATE POLICY "tenant_isolation" ON sms_sends
  FOR ALL TO authenticated
  USING (booking_id IN (
    SELECT id FROM bookings WHERE restaurant_id = auth_restaurant_id()
  ))
  WITH CHECK (booking_id IN (
    SELECT id FROM bookings WHERE restaurant_id = auth_restaurant_id()
  ));

-- SMS Replies: same optimization as sms_sends
DROP POLICY IF EXISTS "tenant_isolation" ON sms_replies;
CREATE POLICY "tenant_isolation" ON sms_replies
  FOR ALL TO authenticated
  USING (booking_id IN (
    SELECT id FROM bookings WHERE restaurant_id = auth_restaurant_id()
  ))
  WITH CHECK (booking_id IN (
    SELECT id FROM bookings WHERE restaurant_id = auth_restaurant_id()
  ));

-- Recaps: use security definer function
DROP POLICY IF EXISTS "tenant_isolation" ON recaps;
CREATE POLICY "tenant_isolation" ON recaps
  FOR ALL TO authenticated
  USING (restaurant_id = auth_restaurant_id())
  WITH CHECK (restaurant_id = auth_restaurant_id());
