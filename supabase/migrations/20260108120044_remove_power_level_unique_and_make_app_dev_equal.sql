/*
  # Remove Power Level Uniqueness and Make App Developer Equal to THE HEAD

  1. Changes
    - Drop unique constraint on power_level (allows multiple ranks to share same power)
    - Update App Developer's power_level to 1 (same as THE HEAD)
    - Both ranks now have identical power_level
    - Both ranks can ban each other's accounts
    - Both ranks have full platform-wide administrative capabilities
  
  2. Security
    - Maintains all security checks
    - No self-banning allowed
    - Both ranks treated as supreme authority
    - Other permission functions already use rank_order comparison which we've updated
*/

-- Drop the unique constraint on power_level
ALTER TABLE rank_hierarchy DROP CONSTRAINT IF EXISTS rank_hierarchy_power_level_key;

-- Update App Developer power level to match THE HEAD
UPDATE rank_hierarchy
SET power_level = 1
WHERE rank = 'app_developer';

-- Verify the change
DO $$
DECLARE
  the_head_power integer;
  app_dev_power integer;
BEGIN
  SELECT power_level INTO the_head_power
  FROM rank_hierarchy
  WHERE rank = 'the_head';
  
  SELECT power_level INTO app_dev_power
  FROM rank_hierarchy
  WHERE rank = 'app_developer';
  
  IF the_head_power != app_dev_power THEN
    RAISE EXCEPTION 'Power levels do not match: THE HEAD=%, App Developer=%', the_head_power, app_dev_power;
  END IF;
  
  RAISE NOTICE 'App Developer power level successfully updated to match THE HEAD (power_level=%)', app_dev_power;
END $$;