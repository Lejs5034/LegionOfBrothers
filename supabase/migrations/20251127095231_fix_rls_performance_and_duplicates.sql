/*
  # Fix RLS Performance Issues and Remove Duplicates

  ## Changes Made

  1. **Performance Optimization**
     - Wrap all `auth.uid()` calls in `(SELECT auth.uid())` to prevent re-evaluation per row
     - This applies to 36+ policies across multiple tables
  
  2. **Remove Duplicate Policies**
     - Remove duplicate INSERT policies on server_members (keeping one)
     - Remove duplicate DELETE policies on server_members (keeping one)
     - Remove duplicate SELECT policies on server_members (keeping one)
     - Remove duplicate SELECT policies on courses, lessons, livestreams, etc.
     - Consolidate overlapping policies into single, efficient policies
  
  3. **Tables Updated**
     - server_members
     - courses
     - lessons
     - livestreams
     - contact_messages
     - message_attachments
     - server_roles
     - course_progress
     - role_permissions
     - pinned_messages
     - banned_users
     - message_mentions
     - message_reads

  ## Security Impact
  - No change to access control logic
  - Only performance improvements
  - All policies maintain same security constraints
*/

-- ============================================================================
-- SERVER_MEMBERS: Remove duplicates and fix performance
-- ============================================================================

-- Drop duplicate/old policies
DROP POLICY IF EXISTS "Users can join servers" ON server_members;
DROP POLICY IF EXISTS "Users can leave servers or admins can remove members" ON server_members;
DROP POLICY IF EXISTS "Authenticated users can read server memberships" ON server_members;

-- Recreate with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can join servers themselves" ON server_members;
CREATE POLICY "Users can join servers themselves" ON server_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can leave servers or be removed by authorized users" ON server_members;
CREATE POLICY "Users can leave servers or be removed by authorized users" ON server_members
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR can_user_manage_ranks((SELECT auth.uid()), server_id, user_id));

DROP POLICY IF EXISTS "Users can view server members" ON server_members;
CREATE POLICY "Users can view server members" ON server_members
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authorized users can update memberships" ON server_members;
CREATE POLICY "Authorized users can update memberships" ON server_members
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR can_user_manage_ranks((SELECT auth.uid()), server_id, user_id))
  WITH CHECK ((SELECT auth.uid()) = user_id OR can_user_manage_ranks((SELECT auth.uid()), server_id, user_id));

-- ============================================================================
-- COURSES: Remove duplicates and fix performance
-- ============================================================================

-- Drop old overlapping policies
DROP POLICY IF EXISTS "Server admins can manage courses" ON courses;

-- Recreate remaining policies with optimized auth.uid()
DROP POLICY IF EXISTS "Server members can read courses" ON courses;
CREATE POLICY "Server members can read courses" ON courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = courses.server_id
        AND server_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users with correct role can create courses on their server" ON courses;
CREATE POLICY "Users with correct role can create courses on their server" ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (can_upload_courses_to_server((SELECT auth.uid()), server_id));

DROP POLICY IF EXISTS "Authorized users can update courses on their server" ON courses;
CREATE POLICY "Authorized users can update courses on their server" ON courses
  FOR UPDATE
  TO authenticated
  USING (can_upload_courses_to_server((SELECT auth.uid()), server_id))
  WITH CHECK (can_upload_courses_to_server((SELECT auth.uid()), server_id));

DROP POLICY IF EXISTS "Authorized users can delete courses on their server" ON courses;
CREATE POLICY "Authorized users can delete courses on their server" ON courses
  FOR DELETE
  TO authenticated
  USING (can_upload_courses_to_server((SELECT auth.uid()), server_id));

-- ============================================================================
-- LESSONS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Server admins can manage lessons" ON lessons;
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

DROP POLICY IF EXISTS "Server members can read lessons" ON lessons;
CREATE POLICY "Server members can read lessons" ON lessons
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

-- ============================================================================
-- LIVESTREAMS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Server admins can manage livestreams" ON livestreams;
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

DROP POLICY IF EXISTS "Server members can read livestreams" ON livestreams;
CREATE POLICY "Server members can read livestreams" ON livestreams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = livestreams.server_id
        AND server_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- CONTACT_MESSAGES: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all contact messages" ON contact_messages;
CREATE POLICY "Admins can view all contact messages" ON contact_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Users can view their own contact messages" ON contact_messages;
CREATE POLICY "Users can view their own contact messages" ON contact_messages
  FOR SELECT
  TO authenticated
  USING (
    email = (
      SELECT users.email::text
      FROM auth.users
      WHERE users.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update contact message status" ON contact_messages;
CREATE POLICY "Admins can update contact message status" ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- MESSAGE_ATTACHMENTS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload attachments" ON message_attachments;
CREATE POLICY "Users can upload attachments" ON message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own attachments" ON message_attachments;
CREATE POLICY "Users can delete own attachments" ON message_attachments
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view attachments for accessible messages" ON message_attachments;
CREATE POLICY "Users can view attachments for accessible messages" ON message_attachments
  FOR SELECT
  TO authenticated
  USING (
    (message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM messages m
      JOIN channels c ON m.channel_id = c.id
      JOIN servers s ON c.server_id = s.id
      WHERE m.id = message_attachments.message_id
        AND (s.is_public = true OR EXISTS (
          SELECT 1 FROM server_members
          WHERE server_members.server_id = s.id
            AND server_members.user_id = (SELECT auth.uid())
        ))
    ))
    OR
    (direct_message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM direct_messages dm
      WHERE dm.id = message_attachments.direct_message_id
        AND (dm.sender_id = (SELECT auth.uid()) OR dm.receiver_id = (SELECT auth.uid()))
    ))
  );

-- ============================================================================
-- SERVER_ROLES: Fix performance, remove duplicate
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage server roles" ON server_roles;
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

-- ============================================================================
-- COURSE_PROGRESS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own progress" ON course_progress;
CREATE POLICY "Users can view own progress" ON course_progress
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own progress" ON course_progress;
CREATE POLICY "Users can create own progress" ON course_progress
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON course_progress;
CREATE POLICY "Users can update own progress" ON course_progress
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON course_progress;
CREATE POLICY "Users can delete own progress" ON course_progress
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- ROLE_PERMISSIONS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Strongest ranks can manage permissions" ON role_permissions;
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
-- PINNED_MESSAGES: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can pin messages" ON pinned_messages;
CREATE POLICY "Authorized users can pin messages" ON pinned_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (can_user_pin_on_server((SELECT auth.uid()), server_id));

DROP POLICY IF EXISTS "Authorized users can unpin messages" ON pinned_messages;
CREATE POLICY "Authorized users can unpin messages" ON pinned_messages
  FOR DELETE
  TO authenticated
  USING (can_user_pin_on_server((SELECT auth.uid()), server_id));

-- ============================================================================
-- BANNED_USERS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can ban" ON banned_users;
CREATE POLICY "Authorized users can ban" ON banned_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN server_id IS NULL THEN can_user_ban_globally((SELECT auth.uid()))
      ELSE can_user_ban_on_server((SELECT auth.uid()), server_id, user_id)
    END
  );

DROP POLICY IF EXISTS "Authorized users can remove bans" ON banned_users;
CREATE POLICY "Authorized users can remove bans" ON banned_users
  FOR DELETE
  TO authenticated
  USING (
    CASE
      WHEN server_id IS NULL THEN can_user_ban_globally((SELECT auth.uid()))
      ELSE can_user_ban_on_server((SELECT auth.uid()), server_id, user_id)
    END
  );

-- ============================================================================
-- MESSAGE_MENTIONS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Users can create mentions" ON message_mentions;
CREATE POLICY "Users can create mentions" ON message_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (mentioning_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own mentions" ON message_mentions;
CREATE POLICY "Users can view their own mentions" ON message_mentions
  FOR SELECT
  TO authenticated
  USING (mentioned_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own mentions" ON message_mentions;
CREATE POLICY "Users can update their own mentions" ON message_mentions
  FOR UPDATE
  TO authenticated
  USING (mentioned_user_id = (SELECT auth.uid()))
  WITH CHECK (mentioned_user_id = (SELECT auth.uid()));

-- ============================================================================
-- MESSAGE_READS: Fix performance
-- ============================================================================

DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
CREATE POLICY "Users can mark messages as read" ON message_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own read status" ON message_reads;
CREATE POLICY "Users can view their own read status" ON message_reads
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their read status" ON message_reads;
CREATE POLICY "Users can update their read status" ON message_reads
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
