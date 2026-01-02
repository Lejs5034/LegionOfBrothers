/*
  # Replace power level system with internal rank order

  1. Changes
    - Replace `change_user_rank` function to use internal rank order mapping
    - Remove dependency on `power_level` from `rank_hierarchy` table
    - Implement new hierarchy:
      * the_head = 100 (strongest)
      * app_developer = 90
      * admin = 70
      * professors (all equal) = 40
      * member = 10 (weakest)
    
  2. Security
    - Users can only assign ranks with lower rank order than their own
    - Maintains all previous security rules
    - Backend-only enforcement (no UI exposure)
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
  -- Get the caller's user ID
  caller_user_id := auth.uid();
  
  IF caller_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;
  
  -- Check if trying to change own rank
  IF caller_user_id = target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot change your own rank'
    );
  END IF;
  
  -- Get caller's rank
  SELECT global_rank INTO caller_rank
  FROM profiles
  WHERE id = caller_user_id;
  
  -- Get target user's current rank
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
  caller_rank_order := CASE caller_rank
    WHEN 'the_head' THEN 100
    WHEN 'app_developer' THEN 90
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
    WHEN 'app_developer' THEN 90
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
    WHEN 'app_developer' THEN 90
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
  IF caller_rank_order <= target_rank_order THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to change this user''s rank'
    );
  END IF;
  
  -- Permission check: caller must have higher rank order than the new rank
  IF caller_rank_order <= new_rank_order THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot assign a rank equal to or higher than your own'
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