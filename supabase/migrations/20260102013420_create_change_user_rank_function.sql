/*
  # Create function to change user ranks

  1. Function
    - `change_user_rank` - Securely changes a user's global rank
    
  2. Security Rules
    - Current user must have higher rank (lower power_level) than target user
    - Current user must have higher or equal rank to the new rank being assigned
    - Users cannot change their own rank
    - The Head can change anyone's rank
    - Admins can change ranks below Admin (power_level > 7)
    - App Developers can change ranks below App Developer (power_level > 2)
    - Regular members cannot change ranks
    
  3. Returns
    - Success: true/false
    - Error message if operation fails
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
  caller_power_level integer;
  target_power_level integer;
  new_rank_power_level integer;
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
  
  -- Get caller's power level
  SELECT COALESCE(rh.power_level, 999)
  INTO caller_power_level
  FROM profiles p
  LEFT JOIN rank_hierarchy rh ON p.global_rank = rh.rank
  WHERE p.id = caller_user_id;
  
  -- Get target user's current power level
  SELECT COALESCE(rh.power_level, 999)
  INTO target_power_level
  FROM profiles p
  LEFT JOIN rank_hierarchy rh ON p.global_rank = rh.rank
  WHERE p.id = target_user_id;
  
  IF target_power_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target user not found'
    );
  END IF;
  
  -- Get new rank's power level
  SELECT power_level
  INTO new_rank_power_level
  FROM rank_hierarchy
  WHERE rank = new_rank;
  
  IF new_rank_power_level IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid rank specified'
    );
  END IF;
  
  -- Permission check: caller must have higher rank than target
  IF caller_power_level >= target_power_level THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to change this user''s rank'
    );
  END IF;
  
  -- Permission check: caller must have equal or higher rank than the new rank
  IF caller_power_level > new_rank_power_level THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You cannot assign a rank higher than or equal to your own'
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