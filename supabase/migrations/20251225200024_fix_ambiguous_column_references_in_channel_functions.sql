/*
  # Fix Ambiguous Column References in Channel Functions

  ## Overview
  Fixes parameter naming conflicts in channel permission functions
  that were causing ambiguous column reference errors.

  ## Changes Made
  - Dropped old functions and dependent policies
  - Recreated functions with prefixed parameters (check_user_id, check_server_id)
  - Recreated all dependent RLS policies
  - Ensures no ambiguity between parameter names and column names
*/

-- Drop the old functions with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS can_user_create_channel(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS can_user_delete_channel(uuid, uuid) CASCADE;

-- Recreate with unambiguous parameter names
CREATE FUNCTION can_user_create_channel(check_user_id uuid, check_server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  is_member boolean;
  user_power_level integer;
BEGIN
  -- FIRST: Check if user is a member of the server
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    WHERE sm.server_id = check_server_id
      AND sm.user_id = check_user_id
  ) INTO is_member;
  
  -- If not a member, deny immediately
  IF NOT is_member THEN
    RETURN false;
  END IF;
  
  -- SECOND: Check if user has sufficient power within the server
  user_power_level := get_user_power_level(check_user_id, check_server_id);
  
  -- Only strongest and middle ranks can create channels (power_level <= 6)
  RETURN user_power_level <= 6;
END;
$$;

CREATE FUNCTION can_user_delete_channel(check_user_id uuid, check_server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  is_member boolean;
  user_power_level integer;
BEGIN
  -- FIRST: Check if user is a member of the server
  SELECT EXISTS (
    SELECT 1 FROM server_members sm
    WHERE sm.server_id = check_server_id
      AND sm.user_id = check_user_id
  ) INTO is_member;
  
  -- If not a member, deny immediately
  IF NOT is_member THEN
    RETURN false;
  END IF;
  
  -- SECOND: Check if user has sufficient power within the server
  user_power_level := get_user_power_level(check_user_id, check_server_id);
  
  -- Only strongest and middle ranks can delete channels (power_level <= 6)
  RETURN user_power_level <= 6;
END;
$$;

-- Recreate the RLS policies that were dropped
CREATE POLICY "Authorized users can create channels"
  ON channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_user_create_channel(auth.uid(), server_id)
  );

CREATE POLICY "Authorized users can update channels"
  ON channels
  FOR UPDATE
  TO authenticated
  USING (
    can_user_create_channel(auth.uid(), server_id)
  )
  WITH CHECK (
    can_user_create_channel(auth.uid(), server_id)
  );

CREATE POLICY "Authorized users can delete channels"
  ON channels
  FOR DELETE
  TO authenticated
  USING (
    can_user_delete_channel(auth.uid(), server_id)
  );
