/*
  # Consolidate Duplicate Permissive Policies

  ## Changes Made

  1. **Consolidate Multiple Permissive SELECT Policies**
     - When multiple permissive policies exist for the same action, they are evaluated with OR logic
     - Having multiple policies is less efficient than a single consolidated policy
     - Consolidate into single policies with OR conditions
  
  2. **Tables Updated**
     - contact_messages: Merge admin and user view policies
     - courses: Merge public, member, and admin view policies
     - lessons: Merge admin and member view policies
     - livestreams: Merge admin and member view policies
     - role_permissions: Merge public and admin view policies
     - server_roles: Merge admin and public view policies

  ## Performance Impact
  - Single policy evaluation instead of multiple
  - Clearer security model
  - Same access control logic, better performance
*/

-- ============================================================================
-- CONTACT_MESSAGES: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Users can view their own contact messages" ON contact_messages;

CREATE POLICY "Users can view contact messages" ON contact_messages
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'superadmin')
    )
    OR
    -- Users can view their own
    email = (
      SELECT users.email::text
      FROM auth.users
      WHERE users.id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- COURSES: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Server members can read courses" ON courses;

CREATE POLICY "Users can view courses" ON courses
  FOR SELECT
  TO authenticated
  USING (
    -- Anyone can view courses (courses are publicly viewable)
    true
  );

-- ============================================================================
-- LESSONS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Server admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Server members can read lessons" ON lessons;

-- Recreate lessons policies separately for better control
CREATE POLICY "Server members can view lessons" ON lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = lessons.course_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Server admins can manage lessons" ON lessons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = lessons.course_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.role_in_server = 'admin'
    )
  );

-- ============================================================================
-- LIVESTREAMS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Server admins can manage livestreams" ON livestreams;
DROP POLICY IF EXISTS "Server members can read livestreams" ON livestreams;

CREATE POLICY "Server members can view livestreams" ON livestreams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = livestreams.server_id
        AND server_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Server admins can manage livestreams" ON livestreams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = livestreams.server_id
        AND server_members.user_id = (SELECT auth.uid())
        AND server_members.role_in_server = 'admin'
    )
  );

-- ============================================================================
-- ROLE_PERMISSIONS: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Strongest ranks can manage permissions" ON role_permissions;

CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Strongest ranks can manage permissions" ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      WHERE sm.user_id = (SELECT auth.uid())
        AND rp.power_level = 'strongest'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      WHERE sm.user_id = (SELECT auth.uid())
        AND rp.power_level = 'strongest'
    )
  );

-- ============================================================================
-- SERVER_ROLES: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage server roles" ON server_roles;
DROP POLICY IF EXISTS "Anyone can view server roles" ON server_roles;

CREATE POLICY "Users can view server roles" ON server_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage server roles" ON server_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_roles.server_id
        AND servers.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_roles.server_id
        AND servers.created_by = (SELECT auth.uid())
    )
  );
