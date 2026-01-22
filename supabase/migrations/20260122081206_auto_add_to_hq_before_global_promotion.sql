/*
  # Auto-add users to Headquarters before global promotion

  ## Purpose
  When promoting a user to "The Head" globally, automatically add them to the
  Headquarters server if they are not already a member. This eliminates the
  "user must be a member of Headquarters" error.

  ## Changes
  1. Update `promote_user_to_the_head()` function to:
     - Check if target user exists in profiles
     - If not a member of HQ, automatically insert them with default Member role
     - Use INSERT ... ON CONFLICT for idempotency
     - Then perform the global promotion

  ## Permission Rules
  - Only users with global_rank IN ('the_head', 'app_developer') can promote
  - Cannot promote yourself
  - The Head and App Developer are treated as equal top authority
  
  ## Behavior
  - Idempotent: safe to call multiple times
  - Automatically handles non-members by adding them first
  - Returns clear success/error messages
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
  target_rank global_rank;
  headquarters_server_id uuid;
  the_head_role_id uuid;
  default_member_role_id uuid;
  caller_is_member boolean;
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
      'error', 'You cannot promote yourself'
    );
  END IF;
  
  -- Check caller's rank
  SELECT global_rank INTO caller_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  IF caller_rank NOT IN ('app_developer', 'the_head') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only THE HEAD or App Developers can promote users to The Head'
    );
  END IF;
  
  -- Check if target user exists
  SELECT global_rank INTO target_rank
  FROM profiles
  WHERE id = target_user_id;
  
  IF target_rank IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user does not exist'
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
  
  -- Verify caller is a member of HQ
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
  
  -- Get the default Member role (rank 999) for HQ
  SELECT id INTO default_member_role_id
  FROM server_roles
  WHERE server_id = headquarters_server_id
  AND rank = 999
  LIMIT 1;
  
  IF default_member_role_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Default member role not found in Headquarters'
    );
  END IF;
  
  -- Auto-add target user to HQ if not already a member
  -- Use INSERT ... ON CONFLICT to make this idempotent
  INSERT INTO server_members (server_id, user_id, role_id, joined_at)
  VALUES (headquarters_server_id, target_user_id, default_member_role_id, now())
  ON CONFLICT (server_id, user_id) DO NOTHING;
  
  -- Get The Head role ID for HQ server
  SELECT id INTO the_head_role_id
  FROM server_roles
  WHERE server_id = headquarters_server_id
  AND role_key = 'the_head';
  
  IF the_head_role_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'The Head role not found in Headquarters'
    );
  END IF;
  
  -- Update user's global rank
  UPDATE profiles
  SET global_rank = 'the_head'
  WHERE id = target_user_id;
  
  -- Update user's server role in HQ
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

COMMENT ON FUNCTION promote_user_to_the_head IS 
'Promotes a user to The Head global rank. Automatically adds them to Headquarters if not already a member. Only callable by THE HEAD or App Developers.';
