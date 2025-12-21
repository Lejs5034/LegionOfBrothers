/*
  # Update Course Upload Permissions: Global Role Override

  ## Overview
  Updates course upload permissions to prioritize global roles over server-scoped roles.

  ## Changes Made

  1. **Updated Function**: `can_upload_courses_to_server`
     - First checks user's global rank (from profiles table)
     - The Head (power level 1) and App Developers (power level 2) can upload to ANY server
     - If not a global role, falls back to server-specific role checks
     - Server-specific roles only apply to non-global users (Professors, Moderators, etc.)

  ## Permission Rules

  ### Global Roles (No Server Membership Required)
  - The Head (power level 1): Can upload to any server
  - App Developers (power level 2): Can upload to any server

  ### Server-Scoped Roles (Requires Server Membership)
  - Server roles with rank <= 2 (e.g., Professors): Can upload to their specific server
  - All other roles: Cannot upload

  ## Security Impact
  - No changes to security model
  - Clarifies permission hierarchy: global roles > server roles
  - Removes requirement for The Head and App Developers to have server membership
*/

-- ============================================================================
-- UPDATE COURSE UPLOAD PERMISSION FUNCTION
-- ============================================================================

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
  server_role_rank integer;
  required_rank integer := 2;
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

  -- Otherwise, check server-specific role
  SELECT COALESCE(sr.rank, 999)
  INTO server_role_rank
  FROM server_members sm
  LEFT JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = check_server_id
    AND sm.user_id = check_user_id;

  -- Server role must have rank <= 2 to upload
  RETURN server_role_rank <= required_rank;
END;
$$;
