/*
  # Create function to assign server roles

  ## Purpose
  Allows authorized users to assign server-specific roles to members.
  This is separate from global ranks and scoped to individual servers.

  ## Function
  - `assign_server_role` - Assigns a server role to a user

  ## Security Rules
  - Current user must have higher rank in the server than target user
  - Current user must have permission to manage roles in the server
  - Only users with rank <= 2 (The Head, Admins, App Developers, etc.) can assign roles
  - Users cannot change their own role
  - Role must belong to the same server

  ## Returns
  - Success: true/false
  - Error message if operation fails
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
  caller_role_rank integer;
  target_role_rank integer;
  new_role_rank integer;
  caller_global_rank text;
BEGIN
  caller_user_id := auth.uid();
  
  IF caller_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  IF caller_user_id = target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot change your own role'
    );
  END IF;
  
  SELECT id INTO target_server_id
  FROM servers
  WHERE slug = server_slug;
  
  IF target_server_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Server not found'
    );
  END IF;
  
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
  
  SELECT global_rank INTO caller_global_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  IF caller_global_rank NOT IN ('the_head', 'app_developer', 'admin') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to assign roles'
    );
  END IF;
  
  SELECT sr.rank INTO caller_role_rank
  FROM server_members sm
  LEFT JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = target_server_id
  AND sm.user_id = caller_user_id;
  
  SELECT sr.rank INTO target_role_rank
  FROM server_members sm
  LEFT JOIN server_roles sr ON sm.role_id = sr.id
  WHERE sm.server_id = target_server_id
  AND sm.user_id = target_user_id;
  
  SELECT rank INTO new_role_rank
  FROM server_roles
  WHERE id = new_role_id;
  
  IF target_role_rank IS NOT NULL AND caller_role_rank IS NOT NULL THEN
    IF caller_role_rank >= target_role_rank THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You cannot change the role of someone with equal or higher rank'
      );
    END IF;
  END IF;
  
  IF caller_role_rank IS NOT NULL AND new_role_rank < caller_role_rank THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot assign a role higher than your own'
    );
  END IF;
  
  UPDATE server_members
  SET role_id = new_role_id
  WHERE server_id = target_server_id
  AND user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not a member of this server'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
END;
$$;