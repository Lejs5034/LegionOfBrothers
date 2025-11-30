/*
  # Remove Unused Index on profiles.global_rank

  ## Overview
  Removes the unused index idx_profiles_global_rank to reduce storage overhead
  and improve write performance on the profiles table.

  ## Reason for Removal
  - Index has not been used in any queries
  - Reduces storage consumption
  - Improves INSERT/UPDATE/DELETE performance on profiles table
  - Can be recreated later if needed

  ## Impact
  - Positive: Faster writes to profiles table
  - Positive: Reduced storage usage
  - Neutral: No query performance impact (index wasn't being used)
*/

DROP INDEX IF EXISTS idx_profiles_global_rank;
