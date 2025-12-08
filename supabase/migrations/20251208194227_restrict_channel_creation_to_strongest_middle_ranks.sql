/*
  # Restrict Channel Creation to Strongest and Middle Ranks Only

  ## Summary
  Updates channel creation permissions to only allow strongest and middle ranks to create channels.
  Regular Admins, Mentors, Coaches, and Members can no longer create channels.

  ## Changes
  1. **Updated Function**: `can_user_create_channel`
     - Now uses numeric power levels from global rank hierarchy
     - Only allows users with power_level <= 6:
       - The Head (power_level = 1)
       - App Developers (power_level = 2)
       - Business Mastery Professor (power_level = 3)
       - Crypto Trading Professor (power_level = 4)
       - Copywriting Professor (power_level = 5)
       - Fitness Professor (power_level = 6)
     - Blocks:
       - Admins (power_level = 7)
       - All Mentors (power_level = 8-10)
       - Coaches (power_level = 11)
       - Regular Members (power_level = 999)

  2. **Updated Function**: `can_user_delete_channel`
     - Same restriction as create (only power_level <= 6)

  ## Security
  - Uses global rank hierarchy for consistent permission checks
  - Prevents unauthorized channel creation via API
  - Only strongest and middle ranks can manage channels
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS can_user_create_channel(uuid, uuid);
DROP FUNCTION IF EXISTS can_user_delete_channel(uuid, uuid);

-- Recreate channel creation permission function
CREATE FUNCTION can_user_create_channel(
  user_id uuid,
  server_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power_level integer;
BEGIN
  -- Get user's global power level
  user_power_level := get_user_rank_power(user_id);
  
  -- Only strongest and middle ranks can create channels (power_level <= 6)
  -- This includes:
  -- 1: The Head
  -- 2: App Developers
  -- 3: Business Mastery Professor
  -- 4: Crypto Trading Professor
  -- 5: Copywriting Professor
  -- 6: Fitness Professor
  RETURN user_power_level <= 6;
END;
$$;

-- Recreate channel deletion permission function
CREATE FUNCTION can_user_delete_channel(
  user_id uuid,
  server_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_power_level integer;
BEGIN
  -- Get user's global power level
  user_power_level := get_user_rank_power(user_id);
  
  -- Only strongest and middle ranks can delete channels (power_level <= 6)
  RETURN user_power_level <= 6;
END;
$$;
