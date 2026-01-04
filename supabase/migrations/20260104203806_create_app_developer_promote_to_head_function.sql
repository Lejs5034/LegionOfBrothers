/*
  # Create App Developer Promotion Function

  1. New Function
    - `promote_user_to_the_head(target_user_id uuid)` 
      - Allows users with 'app_developer' global rank to promote other users to 'the_head'
      - Restricted to Headquarters server members only
      - Caller must be an App Developer
      - Target user must be a member of Headquarters
      - Updates global rank to 'the_head'
      - Updates server role to 'The Head' in Headquarters
      - Cannot promote yourself
      - Returns success/error JSON response
  
  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Manual permission checks ensure only App Developers can use it
    - Validates server membership for both caller and target
*/

CREATE OR REPLACE FUNCTION promote_user_to_the_head(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_user_id uuid;
  caller_rank global_rank;
  headquarters_server_id uuid;
  the_head_role_id uuid;
  caller_is_member boolean;
  target_is_member boolean;
BEGIN
  -- Get the caller's user ID
  caller_user_id := auth.uid();
  
  IF caller_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Check if trying to promote yourself
  IF caller_user_id = target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot promote yourself'
    );
  END IF;
  
  -- Get caller's global rank
  SELECT global_rank INTO caller_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  -- Only App Developers can use this function
  IF caller_rank != 'app_developer' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only App Developers can promote users to The Head'
    );
  END IF;
  
  -- Get Headquarters server ID
  SELECT id INTO headquarters_server_id
  FROM servers
  WHERE slug = 'headquarters';
  
  IF headquarters_server_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Headquarters server not found'
    );
  END IF;
  
  -- Check if caller is a member of Headquarters
  SELECT EXISTS(
    SELECT 1 FROM server_members
    WHERE server_id = headquarters_server_id
    AND user_id = caller_user_id
  ) INTO caller_is_member;
  
  IF NOT caller_is_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must be a member of Headquarters to use this function'
    );
  END IF;
  
  -- Check if target user exists and is a member of Headquarters
  SELECT EXISTS(
    SELECT 1 FROM server_members
    WHERE server_id = headquarters_server_id
    AND user_id = target_user_id
  ) INTO target_is_member;
  
  IF NOT target_is_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user must be a member of Headquarters'
    );
  END IF;
  
  -- Get The Head role ID for Headquarters
  SELECT id INTO the_head_role_id
  FROM server_roles
  WHERE server_id = headquarters_server_id
  AND role_key = 'the_head';
  
  -- Update user's global rank to the_head
  UPDATE profiles
  SET global_rank = 'the_head'
  WHERE id = target_user_id;
  
  -- Update user's server role to The Head in Headquarters
  UPDATE server_members
  SET role_id = the_head_role_id
  WHERE server_id = headquarters_server_id
  AND user_id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User successfully promoted to The Head'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION promote_user_to_the_head(uuid) TO authenticated;