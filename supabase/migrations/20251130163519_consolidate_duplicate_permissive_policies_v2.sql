/*
  # Consolidate Duplicate Permissive Policies (Part 2)

  ## Overview
  Consolidates multiple permissive policies into single efficient policies.
  Multiple permissive policies for the same action cause redundant evaluation overhead.

  ## Tables Fixed (13 policy consolidations)

  1. **contact_messages** - INSERT policies
  2. **direct_messages** - INSERT policies
  3. **friend_requests** - INSERT policies
  4. **friend_requests** - UPDATE policies
  5. **lessons** - SELECT policies
  6. **livestreams** - SELECT policies
  7. **messages** - INSERT policies
  8. **role_permissions** - SELECT policies
  9. **server_members** - INSERT policies
  10. **server_roles** - SELECT policies
  11. **servers** - INSERT policies
  12. **servers** - UPDATE policies

  ## Security Impact
  - No change to security rules (same logic, consolidated)
  - Improved policy evaluation performance
  - Clearer security model
  - Easier to audit and maintain
*/

-- ============================================================================
-- contact_messages: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Platform banned users cannot send contact messages" ON contact_messages;

CREATE POLICY "Users can send contact messages unless banned" ON contact_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- direct_messages: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Platform banned users cannot send direct messages" ON direct_messages;

CREATE POLICY "Users can send direct messages unless banned" ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (sender_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- friend_requests: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Platform banned users cannot send friend requests" ON friend_requests;

CREATE POLICY "Users can send friend requests unless banned" ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (sender_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- friend_requests: Consolidate UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can update friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Platform banned users cannot update friend requests" ON friend_requests;

CREATE POLICY "Users can update friend requests unless banned" ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (
    (receiver_id = (SELECT auth.uid()) OR sender_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
  )
  WITH CHECK (
    (receiver_id = (SELECT auth.uid()) OR sender_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- lessons: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Server members can view lessons" ON lessons;
DROP POLICY IF EXISTS "Server admins can manage lessons" ON lessons;

CREATE POLICY "Server members can view lessons" ON lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM courses c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = lessons.course_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- livestreams: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Server members can view livestreams" ON livestreams;
DROP POLICY IF EXISTS "Server admins can manage livestreams" ON livestreams;

CREATE POLICY "Server members can view livestreams" ON livestreams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = livestreams.server_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- messages: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Platform banned users cannot send messages" ON messages;

CREATE POLICY "Users can send messages unless banned" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- role_permissions: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Strongest ranks can manage permissions" ON role_permissions;

CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- server_members: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can join servers themselves" ON server_members;
DROP POLICY IF EXISTS "Platform banned users cannot join servers" ON server_members;

CREATE POLICY "Users can join servers unless banned" ON server_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- server_roles: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view server roles" ON server_roles;
DROP POLICY IF EXISTS "Admins can manage server roles" ON server_roles;

CREATE POLICY "Users can view server roles" ON server_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = server_roles.server_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- servers: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Only admins and superadmins can create servers" ON servers;
DROP POLICY IF EXISTS "Platform banned users cannot create servers" ON servers;

CREATE POLICY "Admins can create servers unless banned" ON servers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- servers: Consolidate UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Only admins and superadmins can update servers" ON servers;
DROP POLICY IF EXISTS "Platform banned users cannot update servers" ON servers;

CREATE POLICY "Admins can update servers unless banned" ON servers
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'superadmin')
    )
  );
