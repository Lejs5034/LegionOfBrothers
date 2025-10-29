/*
  # Enforce Server-Scoped Course Upload Permissions

  1. Changes
    - Drop existing course creation policies
    - Create new policies that check if user has the correct role on the specific server
    - Only these roles can upload courses on their respective servers:
      * Headquarters: The Head, Admins, App Developers
      * Business Mastery: Business Mastery Professor
      * Crypto Trading: Crypto Trading Professor
      * Copywriting: Copywriting Professor
      * Fitness: Fitness Professor

  2. Security
    - Server-scoped: users can only upload to servers where they have the appropriate role
    - Role-based: only specific high-rank roles can create courses
    - Prevents cross-server uploads by professors
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create courses" ON courses;
DROP POLICY IF EXISTS "Course creators can update their courses" ON courses;
DROP POLICY IF EXISTS "Course creators can delete their courses" ON courses;

-- Create helper function to check if user can upload courses on a server
CREATE OR REPLACE FUNCTION can_upload_courses_to_server(user_id uuid, target_server_id uuid)
RETURNS boolean AS $$
DECLARE
  user_role_name text;
  server_slug text;
BEGIN
  -- Get the server slug
  SELECT slug INTO server_slug
  FROM servers
  WHERE id = target_server_id;

  -- Get user's role name on this server
  SELECT sr.name INTO user_role_name
  FROM server_members sm
  JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.user_id = can_upload_courses_to_server.user_id
    AND sm.server_id = target_server_id;

  -- Check if the role is allowed to upload on this server
  IF server_slug = 'headquarters' THEN
    RETURN user_role_name IN ('The Head', 'Admins', 'App Developers');
  ELSIF server_slug = 'business-mastery' THEN
    RETURN user_role_name = 'Business Mastery Professor';
  ELSIF server_slug = 'crypto-trading' THEN
    RETURN user_role_name = 'Crypto Trading Professor';
  ELSIF server_slug = 'copywriting' THEN
    RETURN user_role_name = 'Copywriting Professor';
  ELSIF server_slug = 'fitness' THEN
    RETURN user_role_name = 'Fitness Professor';
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Users can create courses only if they have the correct role on that server
CREATE POLICY "Users with correct role can create courses on their server"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (can_upload_courses_to_server(auth.uid(), server_id));

-- Policy: Course creators can update their courses only if they still have permission on that server
CREATE POLICY "Authorized users can update courses on their server"
  ON courses FOR UPDATE
  TO authenticated
  USING (can_upload_courses_to_server(auth.uid(), server_id))
  WITH CHECK (can_upload_courses_to_server(auth.uid(), server_id));

-- Policy: Course creators can delete their courses only if they still have permission on that server
CREATE POLICY "Authorized users can delete courses on their server"
  ON courses FOR DELETE
  TO authenticated
  USING (can_upload_courses_to_server(auth.uid(), server_id));
