/*
  # Create Permission Check Functions

  1. Helper Functions
    - `get_user_power_level(user_id, server_id)` - Returns user's power level on a server
    - `can_user_ban_globally(user_id)` - Check if user can ban globally
    - `can_user_pin_globally(user_id)` - Check if user can pin globally
    - `can_user_ban_on_server(user_id, server_id, target_user_id)` - Check ban permission
    - `can_user_pin_on_server(user_id, server_id)` - Check pin permission
    - `can_user_create_channel(user_id, server_id)` - Check channel creation
    - `can_user_delete_channel(user_id, server_id)` - Check channel deletion
    - `can_user_manage_ranks(user_id, server_id, target_user_id)` - Check rank management

  2. Security
    - All functions use SECURITY DEFINER
    - Functions return boolean for easy RLS integration
*/

-- Get user's power level on a server
CREATE OR REPLACE FUNCTION get_user_power_level(user_id uuid, server_id uuid)
RETURNS text AS $$
DECLARE
  power text;
BEGIN
  SELECT rp.power_level INTO power
  FROM server_members sm
  JOIN role_permissions rp ON sm.role_id = rp.role_id
  WHERE sm.user_id = get_user_power_level.user_id
    AND sm.server_id = get_user_power_level.server_id;
  
  RETURN COALESCE(power, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can ban globally
CREATE OR REPLACE FUNCTION can_user_ban_globally(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM server_members sm
    JOIN role_permissions rp ON sm.role_id = rp.role_id
    WHERE sm.user_id = can_user_ban_globally.user_id
      AND rp.can_ban_globally = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can pin globally
CREATE OR REPLACE FUNCTION can_user_pin_globally(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM server_members sm
    JOIN role_permissions rp ON sm.role_id = rp.role_id
    WHERE sm.user_id = can_user_pin_globally.user_id
      AND rp.can_pin_globally = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can ban on a specific server
CREATE OR REPLACE FUNCTION can_user_ban_on_server(
  user_id uuid,
  server_id uuid,
  target_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  user_power text;
  target_power text;
BEGIN
  -- Get powers
  user_power := get_user_power_level(can_user_ban_on_server.user_id, can_user_ban_on_server.server_id);
  target_power := get_user_power_level(can_user_ban_on_server.target_user_id, can_user_ban_on_server.server_id);
  
  -- Strongest can ban globally
  IF user_power = 'strongest' THEN
    RETURN true;
  END IF;
  
  -- Medium can ban globally
  IF user_power = 'medium' THEN
    RETURN true;
  END IF;
  
  -- Weakest can only ban users with lower power on their own server
  IF user_power = 'weakest' THEN
    RETURN target_power = 'none' OR target_power = 'weakest';
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can pin on a specific server
CREATE OR REPLACE FUNCTION can_user_pin_on_server(
  user_id uuid,
  server_id uuid
)
RETURNS boolean AS $$
DECLARE
  user_power text;
BEGIN
  user_power := get_user_power_level(can_user_pin_on_server.user_id, can_user_pin_on_server.server_id);
  
  -- Strongest and Medium can pin globally
  IF user_power IN ('strongest', 'medium') THEN
    RETURN true;
  END IF;
  
  -- Weakest can pin on their own server
  IF user_power = 'weakest' THEN
    RETURN EXISTS (
      SELECT 1 FROM server_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      WHERE sm.user_id = can_user_pin_on_server.user_id
        AND sm.server_id = can_user_pin_on_server.server_id
        AND rp.can_pin_own_server = true
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can create channels on a server
CREATE OR REPLACE FUNCTION can_user_create_channel(
  user_id uuid,
  server_id uuid
)
RETURNS boolean AS $$
DECLARE
  user_power text;
BEGIN
  user_power := get_user_power_level(can_user_create_channel.user_id, can_user_create_channel.server_id);
  
  -- Strongest have access to everything
  IF user_power = 'strongest' THEN
    RETURN true;
  END IF;
  
  -- Medium can create on their own server
  IF user_power = 'medium' THEN
    RETURN EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.user_id = can_user_create_channel.user_id
        AND sm.server_id = can_user_create_channel.server_id
    );
  END IF;
  
  -- Weakest can create on their own server
  IF user_power = 'weakest' THEN
    RETURN EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.user_id = can_user_create_channel.user_id
        AND sm.server_id = can_user_create_channel.server_id
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can delete channels on a server
CREATE OR REPLACE FUNCTION can_user_delete_channel(
  user_id uuid,
  server_id uuid
)
RETURNS boolean AS $$
DECLARE
  user_power text;
BEGIN
  user_power := get_user_power_level(can_user_delete_channel.user_id, can_user_delete_channel.server_id);
  
  -- Strongest have access to everything
  IF user_power = 'strongest' THEN
    RETURN true;
  END IF;
  
  -- Medium can delete on their own server
  IF user_power = 'medium' THEN
    RETURN EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.user_id = can_user_delete_channel.user_id
        AND sm.server_id = can_user_delete_channel.server_id
    );
  END IF;
  
  -- Weakest cannot delete channels
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage ranks (give/remove) on a server
CREATE OR REPLACE FUNCTION can_user_manage_ranks(
  user_id uuid,
  server_id uuid,
  target_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  user_power text;
  target_power text;
BEGIN
  user_power := get_user_power_level(can_user_manage_ranks.user_id, can_user_manage_ranks.server_id);
  target_power := get_user_power_level(can_user_manage_ranks.target_user_id, can_user_manage_ranks.server_id);
  
  -- Strongest have access to everything
  IF user_power = 'strongest' THEN
    RETURN true;
  END IF;
  
  -- Medium can manage ranks below them on their own server
  IF user_power = 'medium' THEN
    RETURN EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.user_id = can_user_manage_ranks.user_id
        AND sm.server_id = can_user_manage_ranks.server_id
    ) AND target_power IN ('weakest', 'none');
  END IF;
  
  -- Weakest cannot manage ranks
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
