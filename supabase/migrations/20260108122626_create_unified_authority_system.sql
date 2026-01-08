/*
  # Create Unified Authority System

  1. Purpose
    - Consolidate all authority checks into a single, consistent system
    - Use one metric (authority level) across all database functions
    - Make App Developers and THE HEAD truly equal (authority = 100)

  2. Changes
    - Create `get_user_authority(user_id)` function that returns authority level
    - Authority levels match the rank_order used in frontend:
      * the_head = 100
      * app_developer = 100
      * admin = 70
      * professors = 40
      * mentors = 30
      * coach = 20
      * user = 10

  3. Benefits
    - Single source of truth for authority
    - No conflicts between power_level, rank_order, and server role rank
    - Frontend and backend use identical authority values
*/

-- Create unified authority function
CREATE OR REPLACE FUNCTION get_user_authority(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_rank global_rank;
  authority_level integer;
BEGIN
  SELECT global_rank INTO user_rank
  FROM profiles
  WHERE id = check_user_id;
  
  -- Return authority level based on global rank
  -- Higher number = higher authority
  -- THE HEAD and App Developer both have maximum authority (100)
  authority_level := CASE user_rank
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
  
  RETURN authority_level;
END;
$$;

-- Helper function to check if user can manage another user
-- Returns true if actor has authority >= target (can manage equals, except self)
CREATE OR REPLACE FUNCTION can_user_manage_user(
  actor_user_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_authority integer;
  target_authority integer;
BEGIN
  -- Cannot manage yourself
  IF actor_user_id = target_user_id THEN
    RETURN false;
  END IF;
  
  actor_authority := get_user_authority(actor_user_id);
  target_authority := get_user_authority(target_user_id);
  
  -- Can manage if authority is greater than or equal to target
  -- This allows THE HEAD and App Developer (both 100) to manage each other
  RETURN actor_authority >= target_authority;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_authority(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_manage_user(uuid, uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_user_authority(uuid) IS 
  'Returns unified authority level for a user. THE HEAD and App Developer both return 100 (highest authority). Use this function consistently across all permission checks.';