/*
  # Fix Course Upload RLS Policies

  ## Overview
  Enforces proper authorization for course creation, updates, and deletion using the `can_upload_courses_to_server` function.

  ## Changes Made

  1. **Dropped Existing Policies**
     - Removes weak policies that only checked for platform bans
     - Ensures clean slate for new permission-based policies

  2. **New INSERT Policy**
     - Users can only create courses if `can_upload_courses_to_server` returns true
     - Enforces server scoping and role-based permissions

  3. **New UPDATE Policy**
     - Users can only update courses if `can_upload_courses_to_server` returns true
     - Prevents unauthorized modifications

  4. **New DELETE Policy**
     - Users can only delete courses if `can_upload_courses_to_server` returns true
     - Prevents unauthorized deletions

  ## Security Impact
  - ✅ Closes security hole where any authenticated user could create/modify courses
  - ✅ Enforces role-based permissions at database level
  - ✅ Global roles (The Head, App Developers) can manage courses on any server
  - ✅ Server-scoped roles (Professors, rank ≤ 2) can manage courses on their specific server
  - ✅ Regular users (Members) cannot create, update, or delete courses
*/

-- Drop existing weak policies
DROP POLICY IF EXISTS "Platform banned users cannot create courses" ON courses;
DROP POLICY IF EXISTS "Platform banned users cannot update courses" ON courses;
DROP POLICY IF EXISTS "Platform banned users cannot delete courses" ON courses;

-- Create new permission-based policies
CREATE POLICY "Users with permission can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform(auth.uid()) 
    AND can_upload_courses_to_server(auth.uid(), server_id)
  );

CREATE POLICY "Users with permission can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform(auth.uid()) 
    AND can_upload_courses_to_server(auth.uid(), server_id)
  )
  WITH CHECK (
    NOT is_user_banned_from_platform(auth.uid()) 
    AND can_upload_courses_to_server(auth.uid(), server_id)
  );

CREATE POLICY "Users with permission can delete courses"
  ON courses FOR DELETE
  TO authenticated
  USING (
    NOT is_user_banned_from_platform(auth.uid()) 
    AND can_upload_courses_to_server(auth.uid(), server_id)
  );
