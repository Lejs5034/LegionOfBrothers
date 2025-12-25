/*
  # Enforce Server Membership for All Permissions

  ## Overview
  This migration ensures that ALL server-specific operations require explicit server membership.
  A user MUST be a member of a server to perform any actions within that server.

  ## Changes Made

  ### 1. Channel Management Functions
  - Updated `can_user_create_channel` to check server membership FIRST
  - Updated `can_user_delete_channel` to check server membership FIRST
  - Users who are not members will be denied regardless of their global rank

  ### 2. Course Management Policies
  - Added INSERT policy requiring server membership AND upload permissions
  - Added UPDATE policy allowing only course creators who are still members
  - Added DELETE policy allowing only course creators who are still members
  - Courses can only be created by members with proper roles

  ### 3. Server Roles Assignment Validation
  - Added trigger to validate role_id matches the server_id
  - Prevents assigning roles from one server to members of another server

  ## Security Impact
  - Non-members can no longer create/delete channels in any server
  - Non-members can no longer upload courses to any server
  - Users who leave a server lose all permissions in that server
  - Role assignments are strictly validated to match the server
*/

-- =====================================================
-- 1. Update channel permission functions to check membership
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_create_channel(user_id uuid, server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  is_member boolean;
  user_power_level integer;
BEGIN
  -- FIRST: Check if user is a member of the server
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    WHERE sm.server_id = server_id
      AND sm.user_id = user_id
  ) INTO is_member;
  
  -- If not a member, deny immediately
  IF NOT is_member THEN
    RETURN false;
  END IF;
  
  -- SECOND: Check if user has sufficient power within the server
  user_power_level := get_user_power_level(user_id, server_id);
  
  -- Only strongest and middle ranks can create channels (power_level <= 6)
  RETURN user_power_level <= 6;
END;
$$;

CREATE OR REPLACE FUNCTION can_user_delete_channel(user_id uuid, server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  is_member boolean;
  user_power_level integer;
BEGIN
  -- FIRST: Check if user is a member of the server
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    WHERE sm.server_id = server_id
      AND sm.user_id = user_id
  ) INTO is_member;
  
  -- If not a member, deny immediately
  IF NOT is_member THEN
    RETURN false;
  END IF;
  
  -- SECOND: Check if user has sufficient power within the server
  user_power_level := get_user_power_level(user_id, server_id);
  
  -- Only strongest and middle ranks can delete channels (power_level <= 6)
  RETURN user_power_level <= 6;
END;
$$;

-- =====================================================
-- 2. Add RLS policies for courses table
-- =====================================================

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Members can upload courses with permission" ON courses;
DROP POLICY IF EXISTS "Course creators can update their courses" ON courses;
DROP POLICY IF EXISTS "Course creators can delete their courses" ON courses;

-- INSERT: Only members with proper permissions can upload courses
CREATE POLICY "Members can upload courses with permission"
  ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND can_upload_courses_to_server(auth.uid(), server_id)
    AND EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = courses.server_id
        AND sm.user_id = auth.uid()
    )
  );

-- UPDATE: Only course creators who are still members can update
CREATE POLICY "Course creators can update their courses"
  ON courses
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = courses.server_id
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = courses.server_id
        AND sm.user_id = auth.uid()
    )
  );

-- DELETE: Only course creators who are still members can delete
CREATE POLICY "Course creators can delete their courses"
  ON courses
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = courses.server_id
        AND sm.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. Add trigger to validate role assignments
-- =====================================================

-- Function to validate role belongs to correct server
CREATE OR REPLACE FUNCTION validate_server_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  role_server_id uuid;
BEGIN
  -- If role_id is NULL, allow it (no role assigned)
  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the server_id of the role
  SELECT server_id INTO role_server_id
  FROM server_roles
  WHERE id = NEW.role_id;
  
  -- Verify role belongs to the same server
  IF role_server_id IS NULL THEN
    RAISE EXCEPTION 'Role does not exist';
  END IF;
  
  IF role_server_id != NEW.server_id THEN
    RAISE EXCEPTION 'Role does not belong to this server';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS validate_server_member_role_trigger ON server_members;
CREATE TRIGGER validate_server_member_role_trigger
  BEFORE INSERT OR UPDATE ON server_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_server_member_role();
