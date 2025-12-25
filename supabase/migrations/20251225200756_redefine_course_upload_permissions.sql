/*
  # Redefine Course Upload Permissions

  ## Overview
  This migration implements new course upload permission rules:
  1. Global roles "the_head" and "app_developer" can upload to ANY server
  2. Server-specific role "professor" can upload ONLY to their assigned server
  3. Upload permission is granted if ANY of these rules are satisfied

  ## Changes Made

  ### 1. Course Upload Permission Function
  - Rewrote `can_upload_courses_to_server` to check global roles first
  - "the_head" and "app_developer" bypass membership requirements
  - "professor" role requires membership in the specific server
  - Returns true if any valid role is found

  ### 2. Course INSERT Policy
  - Updated to remove redundant membership check
  - Global role users can upload without being members
  - Professor role users must be members (enforced by function)

  ## Permission Matrix

  | User Global Rank | Server Role | Can Upload to Any Server? | Requires Membership? |
  |------------------|-------------|---------------------------|---------------------|
  | the_head         | Any         | ✅ Yes                    | ❌ No               |
  | app_developer    | Any         | ✅ Yes                    | ❌ No               |
  | Any              | professor   | ❌ Only their server      | ✅ Yes              |
  | Other            | Any         | ❌ No                     | N/A                 |
*/

-- =====================================================
-- 1. Rewrite course upload permission function
-- =====================================================

CREATE OR REPLACE FUNCTION can_upload_courses_to_server(check_user_id uuid, check_server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_global_rank text;
  user_server_role_key text;
BEGIN
  -- FIRST: Check if user has global permission roles
  SELECT global_rank INTO user_global_rank
  FROM profiles
  WHERE id = check_user_id;
  
  -- Global roles that can upload to ANY server (no membership required)
  IF user_global_rank IN ('the_head', 'app_developer') THEN
    RETURN true;
  END IF;
  
  -- SECOND: Check if user has professor role in the SPECIFIC server
  SELECT sr.role_key INTO user_server_role_key
  FROM server_members sm
  JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = check_server_id
    AND sm.user_id = check_user_id;
  
  -- Professor role allows upload only to their assigned server
  IF user_server_role_key = 'professor' THEN
    RETURN true;
  END IF;
  
  -- No valid role found
  RETURN false;
END;
$$;

-- =====================================================
-- 2. Update courses INSERT policy
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Members can upload courses with permission" ON courses;

-- Recreate with updated logic
-- Note: Membership check removed because global roles don't require membership
CREATE POLICY "Users can upload courses with permission"
  ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND can_upload_courses_to_server(auth.uid(), server_id)
  );

-- =====================================================
-- 3. Update courses UPDATE policy for consistency
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Course creators can update their courses" ON courses;

-- Recreate: Only course creators can update
-- Membership not required for global roles
CREATE POLICY "Course creators can update their courses"
  ON courses
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- =====================================================
-- 4. Update courses DELETE policy for consistency
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Course creators can delete their courses" ON courses;

-- Recreate: Only course creators can delete
-- Membership not required for global roles
CREATE POLICY "Course creators can delete their courses"
  ON courses
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
