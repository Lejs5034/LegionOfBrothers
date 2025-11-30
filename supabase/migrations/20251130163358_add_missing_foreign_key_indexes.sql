/*
  # Add Missing Foreign Key Indexes

  ## Overview
  Creates indexes for all foreign keys that don't have covering indexes.
  This significantly improves query performance for JOIN operations and foreign key lookups.

  ## Performance Impact
  - Faster JOINs on related tables
  - Improved query performance for lookups by foreign key
  - Better database constraint checking performance
  - Reduced I/O operations

  ## Indexes Created (20 total)

  ### banned_users table (2 indexes)
  - banned_by foreign key
  - server_id foreign key

  ### course_progress table (2 indexes)
  - course_id foreign key
  - server_id foreign key

  ### courses table (1 index)
  - created_by foreign key

  ### direct_messages table (1 index)
  - receiver_id foreign key

  ### lessons table (1 index)
  - course_id foreign key

  ### livestreams table (2 indexes)
  - created_by foreign key
  - server_id foreign key

  ### message_attachments table (1 index)
  - user_id foreign key

  ### message_mentions table (2 indexes)
  - mentioned_user_id foreign key
  - mentioning_user_id foreign key

  ### message_reads table (1 index)
  - user_id foreign key

  ### messages table (1 index)
  - user_id foreign key

  ### pinned_messages table (3 indexes)
  - channel_id foreign key
  - pinned_by foreign key
  - server_id foreign key

  ### server_members table (1 index)
  - role_id foreign key

  ### server_roles table (1 index)
  - server_id foreign key

  ### servers table (1 index)
  - created_by foreign key
*/

-- ============================================================================
-- banned_users indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_banned_users_banned_by 
ON banned_users(banned_by);

CREATE INDEX IF NOT EXISTS idx_banned_users_server_id 
ON banned_users(server_id);

-- ============================================================================
-- course_progress indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_course_progress_course_id 
ON course_progress(course_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_server_id 
ON course_progress(server_id);

-- ============================================================================
-- courses indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_created_by 
ON courses(created_by);

-- ============================================================================
-- direct_messages indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id 
ON direct_messages(receiver_id);

-- ============================================================================
-- lessons indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lessons_course_id 
ON lessons(course_id);

-- ============================================================================
-- livestreams indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_livestreams_created_by 
ON livestreams(created_by);

CREATE INDEX IF NOT EXISTS idx_livestreams_server_id 
ON livestreams(server_id);

-- ============================================================================
-- message_attachments indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_message_attachments_user_id 
ON message_attachments(user_id);

-- ============================================================================
-- message_mentions indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user_id 
ON message_mentions(mentioned_user_id);

CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioning_user_id 
ON message_mentions(mentioning_user_id);

-- ============================================================================
-- message_reads indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_message_reads_user_id 
ON message_reads(user_id);

-- ============================================================================
-- messages indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_user_id 
ON messages(user_id);

-- ============================================================================
-- pinned_messages indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel_id 
ON pinned_messages(channel_id);

CREATE INDEX IF NOT EXISTS idx_pinned_messages_pinned_by 
ON pinned_messages(pinned_by);

CREATE INDEX IF NOT EXISTS idx_pinned_messages_server_id 
ON pinned_messages(server_id);

-- ============================================================================
-- server_members indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_server_members_role_id 
ON server_members(role_id);

-- ============================================================================
-- server_roles indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_server_roles_server_id 
ON server_roles(server_id);

-- ============================================================================
-- servers indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_servers_created_by 
ON servers(created_by);
