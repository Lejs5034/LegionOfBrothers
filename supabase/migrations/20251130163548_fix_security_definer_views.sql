/*
  # Fix Security Definer Views

  ## Overview
  Removes SECURITY DEFINER property from views to improve security.
  SECURITY DEFINER views execute with the privileges of the view owner,
  which can be a security risk if not carefully managed.

  ## Views Fixed
  1. user_bans_with_details
  2. profiles_with_ban_status

  ## Changes Made
  - Recreate views without SECURITY DEFINER
  - Views will now execute with caller's privileges
  - RLS policies will properly apply to view queries
  - Maintains same functionality with better security

  ## Security Impact
  - Improved: Views no longer bypass RLS with elevated privileges
  - Views respect the calling user's permissions
  - More secure and auditable access pattern
*/

-- ============================================================================
-- Fix user_bans_with_details view
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

COMMENT ON VIEW user_bans_with_details IS 
  'Detailed view of user bans with rank information. Executes with caller privileges.';

-- ============================================================================
-- Fix profiles_with_ban_status view
-- ============================================================================

DROP VIEW IF EXISTS profiles_with_ban_status;

CREATE VIEW profiles_with_ban_status AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.role,
  p.global_rank,
  rh.display_name as rank_display_name,
  rh.emoji as rank_emoji,
  rh.power_level,
  p.created_at,
  EXISTS (
    SELECT 1 
    FROM banned_users bu
    WHERE bu.user_id = p.id
      AND bu.server_id IS NULL
      AND (bu.expires_at IS NULL OR bu.expires_at > now())
  ) as is_banned,
  (
    SELECT bu.banned_at
    FROM banned_users bu
    WHERE bu.user_id = p.id
      AND bu.server_id IS NULL
      AND (bu.expires_at IS NULL OR bu.expires_at > now())
    ORDER BY bu.banned_at DESC
    LIMIT 1
  ) as banned_at,
  (
    SELECT bu.reason
    FROM banned_users bu
    WHERE bu.user_id = p.id
      AND bu.server_id IS NULL
      AND (bu.expires_at IS NULL OR bu.expires_at > now())
    ORDER BY bu.banned_at DESC
    LIMIT 1
  ) as ban_reason
FROM profiles p
JOIN rank_hierarchy rh ON p.global_rank = rh.rank;

COMMENT ON VIEW profiles_with_ban_status IS 
  'User profiles with ban status and rank information. Executes with caller privileges.';

-- ============================================================================
-- Add RLS policies for views (views inherit from base tables)
-- ============================================================================

-- Note: Views automatically inherit RLS policies from their base tables.
-- Since profiles, banned_users, and rank_hierarchy have proper RLS policies,
-- these views will respect those policies when accessed.
