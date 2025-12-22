/*
  # Use Role Keys for Course Upload Permissions

  ## Overview
  Updates the `can_upload_courses_to_server` function to use stable role keys
  instead of power levels or global roles.

  ## Changes Made

  1. **Removed Global Role Override**
     - No longer checks global_rank or power_level
     - All permission checks are now server-specific

  2. **Single Source of Truth**
     - Allowed uploader role keys: ["the_head", "admins", "app_developers"]
     - Permission granted if user's server role_key matches any allowed key

  3. **Simplified Logic**
     - Direct role_key comparison
     - No rank thresholds or power level calculations
     - Explicit and maintainable

  ## Permission Flow

  1. Check if user is a member of the target server
  2. Get user's role_key in that server
  3. Check if role_key is in allowed list: ["the_head", "admins", "app_developers"]
  4. Return true if match found, false otherwise

  ## Benefits
  - ✅ Server-specific: No cross-server permission leakage
  - ✅ Explicit: Clear list of allowed role keys
  - ✅ Stable: Uses role_key instead of display names
  - ✅ Maintainable: Single source of truth for allowed roles
*/

-- Drop and recreate the function with new logic
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
  allowed_keys text[] := ARRAY['the_head', 'admins', 'app_developers'];
BEGIN
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
