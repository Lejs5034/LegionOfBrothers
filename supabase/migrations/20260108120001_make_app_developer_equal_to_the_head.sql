/*
  # Make App Developer Equal to THE HEAD

  1. Changes
    - Update `change_user_rank` function to give both `the_head` and `app_developer` rank_order of 100
    - Both ranks now have exactly the same power and capabilities
    - App Developers can promote users to any rank including THE HEAD and App Developer
    - THE HEAD and App Developers can manage each other (except changing their own rank)
  
  2. Security
    - Maintains security checks preventing self-promotion
    - Both ranks have full administrative capabilities
    - No hidden checks that treat THE HEAD differently from App Developers
*/

CREATE OR REPLACE FUNCTION change_user_rank(
  target_user_id uuid,
  new_rank global_rank
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_user_id uuid;
  caller_rank global_rank;
  target_rank global_rank;
  caller_rank_order integer;
  target_rank_order integer;
  new_rank_order integer;
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
      'error', 'You cannot change your own rank'
    );
  END IF;
  
  SELECT global_rank INTO caller_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  SELECT global_rank INTO target_rank
  FROM profiles
  WHERE id = target_user_id;
  
  IF target_rank IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user not found'
    );
  END IF;
  
  -- Internal rank order mapping (higher = stronger)
  -- THE HEAD and App Developer both have rank_order 100 (equal power)
  caller_rank_order := CASE caller_rank
    WHEN 'the_head' THEN 100
    WHEN 'app_developer' THEN 100
    WHEN 'admin' THEN 70
    WHEN 'business_mastery_professor' THEN 40
    WHEN 'crypto_trading_professor' THEN 40
    WHEN 'copywriting_professor' THEN 40
    WHEN 'fitness_professor' THEN 40
    WHEN 'business_mentor' THEN 30
    WHEN 'crypto_trading_mentor' THEN 30
    WHEN 'copywriting_mentor' THEN 30
    WHEN 'coach' THEN 20
    ELSE 10
  END;
  
  target_rank_order := CASE target_rank
    WHEN 'the_head' THEN 100
    WHEN 'app_developer' THEN 100
    WHEN 'admin' THEN 70
    WHEN 'business_mastery_professor' THEN 40
    WHEN 'crypto_trading_professor' THEN 40
    WHEN 'copywriting_professor' THEN 40
    WHEN 'fitness_professor' THEN 40
    WHEN 'business_mentor' THEN 30
    WHEN 'crypto_trading_mentor' THEN 30
    WHEN 'copywriting_mentor' THEN 30
    WHEN 'coach' THEN 20
    ELSE 10
  END;
  
  new_rank_order := CASE new_rank
    WHEN 'the_head' THEN 100
    WHEN 'app_developer' THEN 100
    WHEN 'admin' THEN 70
    WHEN 'business_mastery_professor' THEN 40
    WHEN 'crypto_trading_professor' THEN 40
    WHEN 'copywriting_professor' THEN 40
    WHEN 'fitness_professor' THEN 40
    WHEN 'business_mentor' THEN 30
    WHEN 'crypto_trading_mentor' THEN 30
    WHEN 'copywriting_mentor' THEN 30
    WHEN 'coach' THEN 20
    ELSE 10
  END;
  
  -- Permission check: caller must have higher rank order than target
  -- With THE HEAD and App Developer both at 100, they can manage each other
  IF caller_rank_order < target_rank_order THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to change this user''s rank'
    );
  END IF;
  
  -- Permission check: caller must have rank order >= new rank
  -- Changed from > to >= so rank 100 can assign rank 100
  IF caller_rank_order < new_rank_order THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot assign a rank higher than your own'
    );
  END IF;
  
  -- Update the user's rank
  UPDATE profiles
  SET global_rank = new_rank
  WHERE id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Rank updated successfully'
  );
END;
$$;

-- Update promote_user_to_the_head to allow both THE HEAD and App Developer to use it
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
  
  SELECT global_rank INTO caller_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  -- Both THE HEAD and App Developers can use this function
  IF caller_rank NOT IN ('app_developer', 'the_head') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only THE HEAD or App Developers can promote users to The Head'
    );
  END IF;
  
  SELECT id INTO headquarters_server_id
  FROM servers
  WHERE slug = 'headquarters';
  
  IF headquarters_server_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Headquarters server not found'
    );
  END IF;
  
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
  
  SELECT id INTO the_head_role_id
  FROM server_roles
  WHERE server_id = headquarters_server_id
  AND role_key = 'the_head';
  
  UPDATE profiles
  SET global_rank = 'the_head'
  WHERE id = target_user_id;
  
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