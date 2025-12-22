/*
  # Update Course Upload Function to Use Role Permissions

  ## Overview
  Updates the `can_upload_courses_to_server` function to use the server-specific
  `role_permissions.can_upload_courses_own_server` column instead of hardcoded rank checks.

  ## Changes Made

  1. **Updated Function Logic**
     - Global roles (power level <= 2) can still upload to any server (unchanged)
     - Server-specific permission now checks `can_upload_courses_own_server` from role_permissions
     - No longer uses hardcoded rank threshold (rank <= 2)
     - Each server can now configure which roles have upload permissions

  ## Permission Flow

  1. Check if user has global role (The Head, App Developers) → Allow upload to any server
  2. Check if user's server role has `can_upload_courses_own_server = true` → Allow upload to that server
  3. Otherwise → Deny upload

  ## Benefits
  - ✅ Server-specific: Each server controls which roles can upload courses
  - ✅ Configurable: Admins can change role permissions without code changes
  - ✅ No cross-server leakage: Permissions are checked per-server
  - ✅ Explicit permissions: Uses dedicated permission column instead of rank inference

  ## Security Impact
  - No security regression: Still enforces proper authorization
  - More flexible: Servers can customize upload permissions
  - More explicit: Permission intent is clear from column name
*/

-- Update the course upload permission function to use role_permissions
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
  global_power_level integer;
  has_upload_permission boolean;
BEGIN
  -- First check global rank (The Head and App Developers can upload anywhere)
  SELECT rh.power_level
  INTO global_power_level
  FROM profiles p
  JOIN rank_hierarchy rh ON p.global_rank = rh.rank
  WHERE p.id = check_user_id;

  -- If user has a global role with power level <= 2, they can upload anywhere
  IF global_power_level IS NOT NULL AND global_power_level <= 2 THEN
    RETURN true;
  END IF;

  -- Otherwise, check server-specific role permissions
  SELECT COALESCE(rp.can_upload_courses_own_server, false)
  INTO has_upload_permission
  FROM server_members sm
  LEFT JOIN role_permissions rp ON sm.role_id = rp.role_id
  WHERE sm.server_id = check_server_id
    AND sm.user_id = check_user_id;

  -- Return the permission value (defaults to false if user not in server)
  RETURN COALESCE(has_upload_permission, false);
END;
$$;
