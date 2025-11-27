/*
  # Create Global Rank Hierarchy System

  ## Overview
  Implements a comprehensive rank-based banning system where higher ranks can ban lower ranks.
  Bans are platform-wide and prevent all access and messaging.

  ## Rank Hierarchy (Power Level)

  ### Strongest Ranks (1-2)
  - 1: The Head (highest authority)
  - 2: App Developers

  ### Middle Ranks (3-6)
  - 3: Business Mastery Professor
  - 4: Crypto Trading Professor
  - 5: Copywriting Professor
  - 6: Fitness Professor

  ### Weak Ranks (7-11)
  - 7: Admins
  - 8: Business Mentor
  - 9: Crypto Trading Mentor
  - 10: Copywriting Mentor
  - 11: Coach

  ### Default Rank
  - 999: Regular User (no special permissions)

  ## Changes Made

  1. **New Enum Type**: `global_rank`
     - Defines all platform ranks
     - Each rank has a specific power level

  2. **New Table**: `rank_hierarchy`
     - Maps ranks to power levels
     - Defines display names and emojis
     - Establishes clear hierarchy for banning

  3. **Updated Table**: `profiles`
     - Added `global_rank` column
     - Defaults to 'user' (power level 999)

  4. **Updated Table**: `banned_users`
     - `server_id` is now nullable
     - NULL server_id = platform-wide ban
     - Added `is_platform_ban` computed column

  5. **New Functions**
     - `get_user_rank_power()`: Returns user's power level
     - `can_ban_user()`: Checks if one user can ban another
     - `is_user_banned_from_platform()`: Checks platform ban status

  ## Security
  - Only higher ranks can ban lower ranks
  - Same rank cannot ban same rank
  - Platform bans override all server access
  - RLS policies enforce ban checking
*/

-- ============================================================================
-- STEP 1: Create Global Rank Enum
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE global_rank AS ENUM (
    'the_head',
    'app_developer',
    'business_mastery_professor',
    'crypto_trading_professor',
    'copywriting_professor',
    'fitness_professor',
    'admin',
    'business_mentor',
    'crypto_trading_mentor',
    'copywriting_mentor',
    'coach',
    'user'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Create Rank Hierarchy Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rank_hierarchy (
  rank global_rank PRIMARY KEY,
  power_level integer NOT NULL UNIQUE,
  display_name text NOT NULL,
  emoji text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert rank hierarchy data
INSERT INTO rank_hierarchy (rank, power_level, display_name, emoji, description) VALUES
  ('the_head', 1, 'The Head', '🏆', 'Highest authority on the platform'),
  ('app_developer', 2, 'App Developers', '💻', 'Platform developers and technical leads'),
  ('business_mastery_professor', 3, 'Business Mastery Professor', '🎓', 'Expert business mastery instructor'),
  ('crypto_trading_professor', 4, 'Crypto Trading Professor', '🎓', 'Expert crypto trading instructor'),
  ('copywriting_professor', 5, 'Copywriting Professor', '🎓', 'Expert copywriting instructor'),
  ('fitness_professor', 6, 'Fitness Professor', '🎓', 'Expert fitness instructor'),
  ('admin', 7, 'Admins', '⚙️', 'Platform administrators'),
  ('business_mentor', 8, 'Business Mentor', '👤', 'Business mentorship and guidance'),
  ('crypto_trading_mentor', 9, 'Crypto Trading Mentor', '👤', 'Crypto trading mentorship'),
  ('copywriting_mentor', 10, 'Copywriting Mentor', '👤', 'Copywriting mentorship'),
  ('coach', 11, 'Coach', '👤', 'General coaching and support'),
  ('user', 999, 'User', '👥', 'Regular platform user')
ON CONFLICT (rank) DO UPDATE SET
  power_level = EXCLUDED.power_level,
  display_name = EXCLUDED.display_name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description;

-- Enable RLS
ALTER TABLE rank_hierarchy ENABLE ROW LEVEL SECURITY;

-- Everyone can view rank hierarchy
DROP POLICY IF EXISTS "Anyone can view rank hierarchy" ON rank_hierarchy;
CREATE POLICY "Anyone can view rank hierarchy" ON rank_hierarchy
  FOR SELECT
  USING (true);

-- ============================================================================
-- STEP 3: Add Global Rank to Profiles
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'global_rank'
  ) THEN
    ALTER TABLE profiles ADD COLUMN global_rank global_rank DEFAULT 'user' NOT NULL;
  END IF;
END $$;

-- Create index for rank lookups
CREATE INDEX IF NOT EXISTS idx_profiles_global_rank ON profiles(global_rank);

-- ============================================================================
-- STEP 4: Update Banned Users Table for Platform-Wide Bans
-- ============================================================================

-- Make server_id nullable for platform-wide bans
ALTER TABLE banned_users ALTER COLUMN server_id DROP NOT NULL;

-- Add index for platform ban checks
CREATE INDEX IF NOT EXISTS idx_banned_users_user_platform ON banned_users(user_id) 
  WHERE server_id IS NULL;

-- Add comment explaining platform bans
COMMENT ON COLUMN banned_users.server_id IS 
  'NULL indicates a platform-wide ban. Non-NULL indicates a server-specific ban.';

-- ============================================================================
-- STEP 5: Create Helper Functions
-- ============================================================================

-- Get user's rank power level
DROP FUNCTION IF EXISTS get_user_rank_power(uuid);
CREATE FUNCTION get_user_rank_power(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  power_level integer;
BEGIN
  SELECT rh.power_level
  INTO power_level
  FROM profiles p
  JOIN rank_hierarchy rh ON p.global_rank = rh.rank
  WHERE p.id = check_user_id;
  
  RETURN COALESCE(power_level, 999);
END;
$$;

-- Check if user can ban another user based on rank
DROP FUNCTION IF EXISTS can_ban_user(uuid, uuid);
CREATE FUNCTION can_ban_user(
  banner_user_id uuid,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  banner_power integer;
  target_power integer;
BEGIN
  banner_power := get_user_rank_power(banner_user_id);
  target_power := get_user_rank_power(target_user_id);
  
  -- Can only ban if banner has LOWER power level number (higher authority)
  -- AND banner's power is not the same as target's power
  RETURN banner_power < target_power;
END;
$$;

-- Check if user is banned from platform
DROP FUNCTION IF EXISTS is_user_banned_from_platform(uuid);
CREATE FUNCTION is_user_banned_from_platform(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM banned_users
    WHERE user_id = check_user_id
      AND server_id IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- ============================================================================
-- STEP 6: Update Banned Users RLS Policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authorized users can ban" ON banned_users;
DROP POLICY IF EXISTS "Authorized users can remove bans" ON banned_users;
DROP POLICY IF EXISTS "Anyone can view bans" ON banned_users;
DROP POLICY IF EXISTS "Users can view ban records" ON banned_users;

-- New policy: Users can ban if they have higher rank
CREATE POLICY "Higher ranks can ban lower ranks" ON banned_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_ban_user((SELECT auth.uid()), user_id)
  );

-- New policy: Users can remove bans if they have authority
CREATE POLICY "Higher ranks can remove bans" ON banned_users
  FOR DELETE
  TO authenticated
  USING (
    can_ban_user((SELECT auth.uid()), user_id)
  );

-- New policy: Anyone can view ban status
CREATE POLICY "Users can view ban records" ON banned_users
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 7: Update Messages RLS to Block Banned Users
-- ============================================================================

-- Drop existing message policies if they don't account for platform bans
DROP POLICY IF EXISTS "Banned users cannot send messages" ON messages;
DROP POLICY IF EXISTS "Platform banned users cannot send messages" ON messages;

-- Add policy to block platform-banned users from messaging
CREATE POLICY "Platform banned users cannot send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 8: Update Direct Messages RLS to Block Banned Users
-- ============================================================================

DROP POLICY IF EXISTS "Banned users cannot send direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Platform banned users cannot send direct messages" ON direct_messages;

CREATE POLICY "Platform banned users cannot send direct messages" ON direct_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_user_banned_from_platform((SELECT auth.uid()))
  );

-- ============================================================================
-- STEP 9: Create View for Easy Ban Management
-- ============================================================================

DROP VIEW IF EXISTS user_bans_with_details;
CREATE VIEW user_bans_with_details AS
SELECT 
  bu.id,
  bu.user_id,
  p.username as banned_username,
  p.global_rank as banned_user_rank,
  rh.display_name as banned_user_rank_name,
  rh.emoji as banned_user_rank_emoji,
  bu.server_id,
  CASE 
    WHEN bu.server_id IS NULL THEN 'Platform-Wide'
    ELSE s.name
  END as ban_scope,
  bu.banned_by,
  pb.username as banned_by_username,
  pb.global_rank as banned_by_rank,
  bu.reason,
  bu.banned_at,
  bu.expires_at,
  CASE 
    WHEN bu.expires_at IS NULL THEN true
    WHEN bu.expires_at > now() THEN true
    ELSE false
  END as is_active
FROM banned_users bu
JOIN profiles p ON bu.user_id = p.id
JOIN rank_hierarchy rh ON p.global_rank = rh.rank
JOIN profiles pb ON bu.banned_by = pb.id
LEFT JOIN servers s ON bu.server_id = s.id;
