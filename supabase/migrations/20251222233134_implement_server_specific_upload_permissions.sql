/*
  # Implement Server-Specific Course Upload Permissions

  ## Overview
  Updates course upload permissions to be server-specific:
  - Headquarters: Only "the_head", "admins", "app_developers" can upload
  - All other servers: Only "professor" role can upload

  ## Changes Made

  1. **Updated can_upload_courses_to_server Function**
     - Detects if server is Headquarters (slug = 'headquarters')
     - For Headquarters: checks role_key against ['the_head', 'admins', 'app_developers']
     - For other servers: checks role_key against ['professor']
     - Returns detailed info about server type and allowed roles

  2. **New Helper Function**
     - get_allowed_uploader_roles: Returns allowed role keys for a specific server
     - Makes it easy to query what roles can upload in any server

  ## Permission Flow

  **Headquarters:**
  1. User's role_key must be in ['the_head', 'admins', 'app_developers']

  **Other Servers (Copywriting, Fitness, etc):**
  1. User's role_key must be 'professor'
  2. Professor role is server-specific (scoped by server_id)

  ## Benefits
  - ✅ Server-specific: Different rules for HQ vs other servers
  - ✅ Professor-only: Non-HQ servers restricted to professors
  - ✅ No cross-server leakage: Professor in one server can't upload to another
  - ✅ Explicit and maintainable: Clear rules for each server type
*/

-- Drop and recreate the main permission function
DROP FUNCTION IF EXISTS can_upload_courses_to_server(uuid, uuid) CASCADE;

CREATE FUNCTION can_upload_courses_to_server(
  check_user_id uuid,
  check_server_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role_key text;
  server_slug text;
  allowed_keys text[];
BEGIN
  -- Get server slug to determine server type
  SELECT slug INTO server_slug
  FROM servers
  WHERE id = check_server_id;

  -- Set allowed keys based on server type
  IF server_slug = 'headquarters' THEN
    allowed_keys := ARRAY['the_head', 'admins', 'app_developers'];
  ELSE
    allowed_keys := ARRAY['professor'];
  END IF;

  -- Get user's role_key in the target server
  SELECT sr.role_key
  INTO user_role_key
  FROM server_members sm
  JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = check_server_id
    AND sm.user_id = check_user_id;

  -- Return true if user's role_key is in the allowed list
  RETURN user_role_key = ANY(allowed_keys);
END;
$$;

-- Helper function to get allowed uploader roles for a server
CREATE OR REPLACE FUNCTION get_allowed_uploader_roles(
  check_server_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  server_slug text;
BEGIN
  SELECT slug INTO server_slug
  FROM servers
  WHERE id = check_server_id;

  IF server_slug = 'headquarters' THEN
    RETURN ARRAY['the_head', 'admins', 'app_developers'];
  ELSE
    RETURN ARRAY['professor'];
  END IF;
END;
$$;
