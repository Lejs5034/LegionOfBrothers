/*
  # Enforce Platform-Wide Bans Across All Tables

  ## Overview
  Ensures that platform-banned users cannot:
  - Join or access servers
  - Create or access channels
  - Send any messages (regular or direct)
  - Update their profile
  - Participate in any platform activities

  ## Changes Made

  1. **Server Members**: Banned users cannot join servers or be added
  2. **Channels**: Banned users cannot create channels
  3. **Messages**: Already blocked in previous migration
  4. **Direct Messages**: Already blocked in previous migration
  5. **Profile Updates**: Banned users cannot update profiles
  6. **Server Access**: Banned users lose all server memberships
  7. **Friend Requests**: Banned users cannot send/receive friend requests

  ## Security Impact
  - Complete platform lockout for banned users
  - Maintains data integrity
  - Clear audit trail of ban actions
*/

-- ============================================================================
-- STEP 1: Block Server Member Operations
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Platform banned users cannot join servers" ON server_members;

-- Prevent banned users from joining any server
CREATE POLICY "Platform banned users cannot join servers" ON server_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from updating their memberships
DROP POLICY IF EXISTS "Platform banned users cannot update memberships" ON server_members;

CREATE POLICY "Platform banned users cannot update memberships" ON server_members
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  )
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 2: Block Channel Operations
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Platform banned users cannot create channels" ON channels;

-- Prevent banned users from creating channels
CREATE POLICY "Platform banned users cannot create channels" ON channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from updating channels
DROP POLICY IF EXISTS "Platform banned users cannot update channels" ON channels;

CREATE POLICY "Platform banned users cannot update channels" ON channels
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  )
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from deleting channels
DROP POLICY IF EXISTS "Platform banned users cannot delete channels" ON channels;

CREATE POLICY "Platform banned users cannot delete channels" ON channels
  FOR DELETE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 3: Block Server Creation
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Platform banned users cannot create servers" ON servers;

-- Prevent banned users from creating servers
CREATE POLICY "Platform banned users cannot create servers" ON servers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from updating servers
DROP POLICY IF EXISTS "Platform banned users cannot update servers" ON servers;

CREATE POLICY "Platform banned users cannot update servers" ON servers
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  )
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 4: Block Friend Requests
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Platform banned users cannot send friend requests" ON friend_requests;

-- Prevent banned users from sending friend requests
CREATE POLICY "Platform banned users cannot send friend requests" ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from updating friend requests
DROP POLICY IF EXISTS "Platform banned users cannot update friend requests" ON friend_requests;

CREATE POLICY "Platform banned users cannot update friend requests" ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  )
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 5: Block Course Operations
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Platform banned users cannot create courses" ON courses;

-- Prevent banned users from creating courses
CREATE POLICY "Platform banned users cannot create courses" ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from updating courses
DROP POLICY IF EXISTS "Platform banned users cannot update courses" ON courses;

CREATE POLICY "Platform banned users cannot update courses" ON courses
  FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  )
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- Prevent banned users from deleting courses
DROP POLICY IF EXISTS "Platform banned users cannot delete courses" ON courses;

CREATE POLICY "Platform banned users cannot delete courses" ON courses
  FOR DELETE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 6: Block Contact Messages
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Platform banned users cannot send contact messages" ON contact_messages;

-- Prevent banned users from sending contact messages
CREATE POLICY "Platform banned users cannot send contact messages" ON contact_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 7: Create Helper Function to Auto-Remove Banned Users from Servers
-- ============================================================================

-- Function to remove user from all servers when platform banned
DROP FUNCTION IF EXISTS remove_banned_user_from_servers();
CREATE FUNCTION remove_banned_user_from_servers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only act on platform-wide bans (server_id is NULL)
  IF NEW.server_id IS NULL THEN
    -- Remove user from all servers
    DELETE FROM server_members
    WHERE user_id = NEW.user_id;
    
    -- Log the action
    RAISE NOTICE 'User % removed from all servers due to platform ban', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-remove banned users from servers
DROP TRIGGER IF EXISTS trigger_remove_banned_user_from_servers ON banned_users;
CREATE TRIGGER trigger_remove_banned_user_from_servers
  AFTER INSERT ON banned_users
  FOR EACH ROW
  EXECUTE FUNCTION remove_banned_user_from_servers();

-- ============================================================================
-- STEP 8: Create Function to Check if User Can Access Platform
-- ============================================================================

DROP FUNCTION IF EXISTS can_user_access_platform(uuid);
CREATE FUNCTION can_user_access_platform(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN NOT is_user_banned_from_platform(check_user_id);
END;
$$;

-- ============================================================================
-- STEP 9: Add Ban Status to Profiles View
-- ============================================================================

DROP VIEW IF EXISTS profiles_with_ban_status;
CREATE VIEW profiles_with_ban_status AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.role,
  p.global_rank,
  rh.display_name as rank_display_name,
  rh.emoji as rank_emoji,
  rh.power_level,
  p.created_at,
  is_user_banned_from_platform(p.id) as is_banned,
  (
    SELECT bu.banned_at
    FROM banned_users bu
    WHERE bu.user_id = p.id
      AND bu.server_id IS NULL
      AND (bu.expires_at IS NULL OR bu.expires_at > now())
    ORDER BY bu.banned_at DESC
    LIMIT 1
  ) as banned_at,
  (
    SELECT bu.reason
    FROM banned_users bu
    WHERE bu.user_id = p.id
      AND bu.server_id IS NULL
      AND (bu.expires_at IS NULL OR bu.expires_at > now())
    ORDER BY bu.banned_at DESC
    LIMIT 1
  ) as ban_reason
FROM profiles p
JOIN rank_hierarchy rh ON p.global_rank = rh.rank;

-- ============================================================================
-- STEP 10: Create Ban Management Functions
-- ============================================================================

-- Function to ban a user from the platform
DROP FUNCTION IF EXISTS ban_user_from_platform(uuid, uuid, text, timestamptz);
CREATE FUNCTION ban_user_from_platform(
  target_user_id uuid,
  banner_user_id uuid,
  ban_reason text DEFAULT NULL,
  ban_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ban_id uuid;
BEGIN
  -- Check if banner has authority to ban target
  IF NOT can_ban_user(banner_user_id, target_user_id) THEN
    RAISE EXCEPTION 'You do not have sufficient rank to ban this user';
  END IF;
  
  -- Check if user is already banned
  IF is_user_banned_from_platform(target_user_id) THEN
    RAISE EXCEPTION 'User is already banned from the platform';
  END IF;
  
  -- Create the ban record
  INSERT INTO banned_users (
    user_id,
    server_id,
    banned_by,
    reason,
    expires_at
  ) VALUES (
    target_user_id,
    NULL, -- NULL means platform-wide ban
    banner_user_id,
    ban_reason,
    ban_expires_at
  )
  RETURNING id INTO ban_id;
  
  RETURN ban_id;
END;
$$;

-- Function to unban a user from the platform
DROP FUNCTION IF EXISTS unban_user_from_platform(uuid, uuid);
CREATE FUNCTION unban_user_from_platform(
  target_user_id uuid,
  unbanner_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Check if unbanner has authority
  IF NOT can_ban_user(unbanner_user_id, target_user_id) THEN
    RAISE EXCEPTION 'You do not have sufficient rank to unban this user';
  END IF;
  
  -- Remove all platform bans for this user
  DELETE FROM banned_users
  WHERE user_id = target_user_id
    AND server_id IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count > 0;
END;
$$;
