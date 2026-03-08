-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recaps ENABLE ROW LEVEL SECURITY;

-- Restaurants: tenant isolation via profiles
CREATE POLICY "tenant_isolation" ON restaurants
  FOR ALL TO authenticated
  USING (id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- Profiles: users can only see their own profile
CREATE POLICY "own_profile" ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Bookings: tenant isolation via profiles
CREATE POLICY "tenant_isolation" ON bookings
  FOR ALL TO authenticated
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));

-- SMS Sends: tenant isolation via bookings join
CREATE POLICY "tenant_isolation" ON sms_sends
  FOR ALL TO authenticated
  USING (booking_id IN (
    SELECT id FROM bookings
    WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ))
  WITH CHECK (booking_id IN (
    SELECT id FROM bookings
    WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

-- SMS Replies: tenant isolation via bookings join
CREATE POLICY "tenant_isolation" ON sms_replies
  FOR ALL TO authenticated
  USING (booking_id IN (
    SELECT id FROM bookings
    WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ))
  WITH CHECK (booking_id IN (
    SELECT id FROM bookings
    WHERE restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  ));

-- Recaps: tenant isolation via profiles
CREATE POLICY "tenant_isolation" ON recaps
  FOR ALL TO authenticated
  USING (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (restaurant_id = (SELECT restaurant_id FROM profiles WHERE id = auth.uid()));
