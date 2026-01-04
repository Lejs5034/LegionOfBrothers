/*
  # Add Channel Write Permissions Based on Global Roles

  ## Overview
  This migration adds the ability to restrict which global roles can write messages
  in specific channels. Channel creators define a list of allowed writer roles using
  the GLOBAL role system (not server-scoped roles).

  ## Changes Made

  ### 1. Channels Table
  - Add `allowed_writer_roles` column (text array)
  - Stores global role keys (e.g., 'the_head', 'admin', 'user')
  - NULL or empty array = all roles can write (default behavior)
  - Non-empty array = only specified roles can write

  ### 2. Helper Function
  - `can_write_in_channel(user_id, channel_id)`: Checks if user has permission to write
  - Returns true if user's global rank is in the allowed writer roles list
  - Returns true if allowed_writer_roles is NULL or empty (all roles allowed)

  ### 3. Messages RLS Policy
  - Add restrictive policy to block unauthorized message inserts
  - Uses `can_write_in_channel()` function for enforcement
  - Server-side enforcement even if UI is bypassed

  ## Permission Matrix

  | Channel Setting       | User Global Rank | Can Write? |
  |-----------------------|------------------|------------|
  | All roles (NULL/[])   | Any              | ✅ Yes     |
  | ['the_head']          | the_head         | ✅ Yes     |
  | ['the_head']          | admin            | ❌ No      |
  | ['admin', 'user']     | admin            | ✅ Yes     |
  | ['admin', 'user']     | user             | ✅ Yes     |
  | ['admin', 'user']     | the_head         | ❌ No      |

  ## Default Behavior
  - Existing channels with NULL allowed_writer_roles: Everyone can write
  - New channels should explicitly set allowed_writer_roles during creation
  - Empty array = all roles (to support "All roles" option in UI)

  ## Security Impact
  - ✅ Users can still READ all channels (read permission unchanged)
  - ✅ Write permission is restrictive and role-based
  - ✅ Server-side RLS enforcement prevents bypass
  - ✅ Works across all servers (Headquarters and learning servers)
*/

-- ============================================================================
-- STEP 1: Add allowed_writer_roles Column to Channels
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'channels' AND column_name = 'allowed_writer_roles'
  ) THEN
    ALTER TABLE channels ADD COLUMN allowed_writer_roles text[] DEFAULT NULL;
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN channels.allowed_writer_roles IS
  'Array of global role keys allowed to write in this channel. NULL or empty array = all roles can write. Non-empty array = only specified roles can write.';

-- Create index for write permission checks
CREATE INDEX IF NOT EXISTS idx_channels_allowed_writer_roles
  ON channels USING GIN (allowed_writer_roles);

-- ============================================================================
-- STEP 2: Create Helper Function to Check Write Permission
-- ============================================================================

DROP FUNCTION IF EXISTS can_write_in_channel(uuid, uuid);
CREATE FUNCTION can_write_in_channel(
  check_user_id uuid,
  check_channel_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_global_rank text;
  allowed_roles text[];
BEGIN
  -- Get user's global rank
  SELECT p.global_rank::text
  INTO user_global_rank
  FROM profiles p
  WHERE p.id = check_user_id;

  -- If user not found, deny
  IF user_global_rank IS NULL THEN
    RETURN false;
  END IF;

  -- Get channel's allowed writer roles
  SELECT c.allowed_writer_roles
  INTO allowed_roles
  FROM channels c
  WHERE c.id = check_channel_id;

  -- If channel not found, deny
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- If allowed_writer_roles is NULL or empty array, everyone can write
  IF allowed_roles IS NULL OR array_length(allowed_roles, 1) IS NULL THEN
    RETURN true;
  END IF;

  -- Check if user's global rank is in the allowed list
  RETURN user_global_rank = ANY(allowed_roles);
END;
$$;

-- ============================================================================
-- STEP 3: Add RLS Policy to Enforce Write Permissions on Messages
-- ============================================================================

-- Add restrictive policy to block unauthorized writes
DROP POLICY IF EXISTS "Users can only write in channels they have permission for" ON messages;
CREATE POLICY "Users can only write in channels they have permission for"
  ON messages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_write_in_channel((SELECT auth.uid()), channel_id)
  );

-- ============================================================================
-- STEP 4: Set Default for Existing Channels
-- ============================================================================

-- All existing channels default to "all roles can write" (NULL)
-- No migration needed as new column defaults to NULL
