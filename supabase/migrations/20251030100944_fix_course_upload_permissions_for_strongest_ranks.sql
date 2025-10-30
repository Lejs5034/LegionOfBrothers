/*
  # Fix Course Upload Permissions for Strongest Ranks

  1. Changes
    - Update role_permissions to grant global course upload to strongest ranks
    - Update can_upload_courses_to_server function to allow strongest ranks on any server
    - Bypass server-ownership checks for The Head and App Developers

  2. Behavior
    - Strongest ranks (The Head, App Developers) can upload to ANY server
    - Medium ranks (Professors) can only upload to their own server
    - Weakest ranks cannot upload courses

  3. Security
    - Permission checks enforced at database level
    - RLS policies use updated function logic
*/

-- Update role_permissions to reflect global course upload capability
UPDATE role_permissions
SET can_upload_courses_own_server = true
WHERE power_level = 'strongest';

-- Update the course upload function to allow strongest ranks on any server
CREATE OR REPLACE FUNCTION can_upload_courses_to_server(
  user_id uuid,
  target_server_id uuid
)
RETURNS boolean AS $$
DECLARE
  user_power text;
  has_global_strongest boolean;
BEGIN
  -- Check if user has strongest rank on ANY server (global access)
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    JOIN role_permissions rp ON sm.role_id = rp.role_id
    WHERE sm.user_id = can_upload_courses_to_server.user_id
      AND rp.power_level = 'strongest'
  ) INTO has_global_strongest;
  
  -- Strongest ranks can upload to any server
  IF has_global_strongest THEN
    RETURN true;
  END IF;
  
  -- For non-strongest ranks, check server-specific permissions
  user_power := get_user_power_level(can_upload_courses_to_server.user_id, target_server_id);
  
  -- Medium ranks can upload only on their own server
  IF user_power = 'medium' THEN
    RETURN EXISTS (
      SELECT 1 FROM server_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      WHERE sm.user_id = can_upload_courses_to_server.user_id
        AND sm.server_id = target_server_id
        AND rp.can_upload_courses_own_server = true
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
