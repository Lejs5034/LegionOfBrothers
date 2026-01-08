/*
  # Update assign_server_role to Use Unified Authority System

  1. Changes
    - Replace server role rank checks with global authority checks
    - Use get_user_authority() for consistent authority comparison
    - Allow equal-authority users to manage each other (except themselves)
    - Add detailed logging for debugging authority decisions

  2. Security Rules
    - Users cannot change their own role
    - Actor must have authority >= target's authority
    - Only supreme authority users (100), admins (70+) can assign roles
    - Role must belong to the target server

  3. Logging
    - Logs authority levels and decisions (dev/staging only via RAISE NOTICE)
    - Shows: actor_authority, target_authority, decision reason
*/

CREATE OR REPLACE FUNCTION assign_server_role(
  target_user_id uuid,
  server_slug text,
  new_role_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_user_id uuid;
  target_server_id uuid;
  role_server_id uuid;
  caller_authority integer;
  target_authority integer;
  caller_global_rank text;
  target_global_rank text;
BEGIN
  caller_user_id := auth.uid();
  
  -- Log entry (dev debugging)
  RAISE NOTICE '[assign_server_role] Starting - caller: %, target: %, server: %', 
    caller_user_id, target_user_id, server_slug;
  
  IF caller_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Check self-assignment
  IF caller_user_id = target_user_id THEN
    RAISE NOTICE '[assign_server_role] BLOCKED: Self-assignment attempt';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot change your own role'
    );
  END IF;
  
  -- Verify server exists
  SELECT id INTO target_server_id
  FROM servers
  WHERE slug = server_slug;
  
  IF target_server_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Server not found'
    );
  END IF;
  
  -- Verify role exists and belongs to server
  SELECT server_id INTO role_server_id
  FROM server_roles
  WHERE id = new_role_id;
  
  IF role_server_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Role not found'
    );
  END IF;
  
  IF role_server_id != target_server_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Role does not belong to this server'
    );
  END IF;
  
  -- Get global ranks for logging
  SELECT global_rank INTO caller_global_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  SELECT global_rank INTO target_global_rank
  FROM profiles
  WHERE id = target_user_id;
  
  -- Get unified authority levels
  caller_authority := get_user_authority(caller_user_id);
  target_authority := get_user_authority(target_user_id);
  
  RAISE NOTICE '[assign_server_role] Authority check - Caller: % (% = authority %), Target: % (% = authority %)',
    caller_user_id, caller_global_rank, caller_authority,
    target_user_id, target_global_rank, target_authority;
  
  -- Check if caller has minimum authority to assign roles
  IF caller_authority < 70 THEN
    RAISE NOTICE '[assign_server_role] BLOCKED: Insufficient authority (need 70+, have %)', caller_authority;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to assign roles'
    );
  END IF;
  
  -- Check if caller can manage target user
  -- Caller must have authority >= target authority
  IF caller_authority < target_authority THEN
    RAISE NOTICE '[assign_server_role] BLOCKED: Cannot manage higher authority user (caller: %, target: %)',
      caller_authority, target_authority;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot change the role of someone with higher authority'
    );
  END IF;
  
  -- Check if both users are members of the server
  IF NOT EXISTS (
    SELECT 1 FROM server_members
    WHERE server_id = target_server_id AND user_id = caller_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not a member of this server'
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM server_members
    WHERE server_id = target_server_id AND user_id = target_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user is not a member of this server'
    );
  END IF;
  
  -- All checks passed, assign the role
  RAISE NOTICE '[assign_server_role] ALLOWED: Assigning role % to user %', new_role_id, target_user_id;
  
  UPDATE server_members
  SET role_id = new_role_id
  WHERE server_id = target_server_id
  AND user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update user role'
    );
  END IF;
  
  RAISE NOTICE '[assign_server_role] SUCCESS: Role assigned successfully';
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully',
    'debug', jsonb_build_object(
      'caller_authority', caller_authority,
      'target_authority', target_authority,
      'caller_rank', caller_global_rank,
      'target_rank', target_global_rank
    )
  );
END;
$$;