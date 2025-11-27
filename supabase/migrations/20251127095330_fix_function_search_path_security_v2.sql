/*
  # Fix Function Search Path Security

  ## Changes Made

  1. **Set Immutable Search Paths**
     - Drop and recreate all affected functions with explicit search_path
     - Add `SET search_path = public, pg_temp` to prevent manipulation attacks
     - Ensures functions always use the correct schema
  
  2. **Functions Updated**
     - update_contact_message_updated_at
     - update_friend_request_updated_at
     - can_upload_courses_to_server
     - get_user_power_level
     - can_user_ban_globally
     - can_user_pin_globally
     - can_user_ban_on_server
     - can_user_pin_on_server
     - can_user_create_channel
     - can_user_delete_channel
     - can_user_manage_ranks

  ## Security Impact
  - Prevents privilege escalation via search_path manipulation
  - No functional changes to the logic
*/

-- ============================================================================
-- TIMESTAMP UPDATE FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS update_contact_message_updated_at() CASCADE;
CREATE FUNCTION update_contact_message_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS update_friend_request_updated_at() CASCADE;
CREATE FUNCTION update_friend_request_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PERMISSION CHECK FUNCTIONS
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
  user_rank integer;
  required_rank integer := 2;
BEGIN
  SELECT COALESCE(sr.rank, 999)
  INTO user_rank
  FROM server_members sm
  LEFT JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = check_server_id
    AND sm.user_id = check_user_id;

  RETURN user_rank <= required_rank;
END;
$$;

DROP FUNCTION IF EXISTS get_user_power_level(uuid, uuid) CASCADE;
CREATE FUNCTION get_user_power_level(
  check_user_id uuid,
  check_server_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  power_level integer;
BEGIN
  SELECT COALESCE(sr.rank, 999)
  INTO power_level
  FROM server_members sm
  LEFT JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = check_server_id
    AND sm.user_id = check_user_id;

  RETURN COALESCE(power_level, 999);
END;
$$;

DROP FUNCTION IF EXISTS can_user_ban_globally(uuid) CASCADE;
CREATE FUNCTION can_user_ban_globally(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = check_user_id
      AND role IN ('admin', 'superadmin')
  );
END;
$$;

DROP FUNCTION IF EXISTS can_user_pin_globally(uuid) CASCADE;
CREATE FUNCTION can_user_pin_globally(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = check_user_id
      AND role IN ('admin', 'superadmin')
  );
END;
$$;

DROP FUNCTION IF EXISTS can_user_ban_on_server(uuid, uuid, uuid) CASCADE;
CREATE FUNCTION can_user_ban_on_server(
  check_user_id uuid,
  check_server_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power integer;
  target_power integer;
BEGIN
  user_power := get_user_power_level(check_user_id, check_server_id);
  target_power := get_user_power_level(target_user_id, check_server_id);
  
  RETURN user_power <= 2 AND user_power < target_power;
END;
$$;

DROP FUNCTION IF EXISTS can_user_pin_on_server(uuid, uuid) CASCADE;
CREATE FUNCTION can_user_pin_on_server(
  check_user_id uuid,
  check_server_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power integer;
BEGIN
  user_power := get_user_power_level(check_user_id, check_server_id);
  RETURN user_power <= 3;
END;
$$;

DROP FUNCTION IF EXISTS can_user_create_channel(uuid, uuid) CASCADE;
CREATE FUNCTION can_user_create_channel(
  check_user_id uuid,
  check_server_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power integer;
BEGIN
  user_power := get_user_power_level(check_user_id, check_server_id);
  RETURN user_power <= 2;
END;
$$;

DROP FUNCTION IF EXISTS can_user_delete_channel(uuid, uuid) CASCADE;
CREATE FUNCTION can_user_delete_channel(
  check_user_id uuid,
  check_server_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power integer;
BEGIN
  user_power := get_user_power_level(check_user_id, check_server_id);
  RETURN user_power <= 1;
END;
$$;

DROP FUNCTION IF EXISTS can_user_manage_ranks(uuid, uuid, uuid) CASCADE;
CREATE FUNCTION can_user_manage_ranks(
  check_user_id uuid,
  check_server_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power integer;
  target_power integer;
BEGIN
  user_power := get_user_power_level(check_user_id, check_server_id);
  target_power := get_user_power_level(target_user_id, check_server_id);
  
  RETURN user_power <= 2 AND user_power < target_power;
END;
$$;

-- Recreate triggers if needed
DROP TRIGGER IF EXISTS update_contact_message_updated_at_trigger ON contact_messages;
CREATE TRIGGER update_contact_message_updated_at_trigger
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_message_updated_at();

DROP TRIGGER IF EXISTS update_friend_request_updated_at_trigger ON friend_requests;
CREATE TRIGGER update_friend_request_updated_at_trigger
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_request_updated_at();
