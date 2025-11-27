/*
  # Remove Unused Indexes

  ## Changes Made

  1. **Remove Unused Indexes**
     - Drop 31 unused indexes that consume storage without providing query performance benefits
     - Indexes were created in anticipation of features but are not currently used
     - Can be recreated later if specific queries need them
  
  2. **Indexes Removed**
     - Server-related: is_public, created_by
     - Message-related: created_at, user_id
     - Lesson-related: course_id, order_index
     - Livestream-related: server_id, status, created_by
     - Friend request-related: status
     - Mention-related: mentioned_user, message, mentioning_user_id
     - Read status-related: user
     - Direct message-related: sender, receiver, created_at
     - Course progress-related: server_id, course_id
     - Attachment-related: user
     - Contact message-related: created_at, email, status
     - Ban-related: banned_by, server_id
     - Pin-related: channel_id, pinned_by, server_id
     - Role-related: role_id, server_id

  ## Performance Impact
  - Reduces storage overhead
  - Speeds up INSERT/UPDATE/DELETE operations
  - No negative impact on SELECT queries (indexes weren't being used)
  - Indexes can be recreated if specific queries need them
*/

-- ============================================================================
-- SERVERS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_servers_is_public;
DROP INDEX IF EXISTS idx_servers_created_by;

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_user_id;

-- ============================================================================
-- LESSONS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_lessons_course_id;
DROP INDEX IF EXISTS idx_lessons_order_index;

-- ============================================================================
-- LIVESTREAMS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_livestreams_server_id;
DROP INDEX IF EXISTS idx_livestreams_status;
DROP INDEX IF EXISTS idx_livestreams_created_by;

-- ============================================================================
-- FRIEND_REQUESTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_friend_requests_status;

-- ============================================================================
-- MESSAGE_MENTIONS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_message_mentions_mentioned_user;
DROP INDEX IF EXISTS idx_message_mentions_message;
DROP INDEX IF EXISTS idx_message_mentions_mentioning_user_id;

-- ============================================================================
-- MESSAGE_READS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_message_reads_user;

-- ============================================================================
-- DIRECT_MESSAGES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_direct_messages_sender;
DROP INDEX IF EXISTS idx_direct_messages_receiver;
DROP INDEX IF EXISTS idx_direct_messages_created_at;

-- ============================================================================
-- COURSE_PROGRESS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_course_progress_server_id;
DROP INDEX IF EXISTS idx_course_progress_course_id;

-- ============================================================================
-- MESSAGE_ATTACHMENTS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_message_attachments_user;

-- ============================================================================
-- CONTACT_MESSAGES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_contact_messages_created_at;
DROP INDEX IF EXISTS idx_contact_messages_email;
DROP INDEX IF EXISTS idx_contact_messages_status;

-- ============================================================================
-- BANNED_USERS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_banned_users_banned_by;
DROP INDEX IF EXISTS idx_banned_users_server_id;

-- ============================================================================
-- COURSES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_courses_created_by;

-- ============================================================================
-- PINNED_MESSAGES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_pinned_messages_channel_id;
DROP INDEX IF EXISTS idx_pinned_messages_pinned_by;
DROP INDEX IF EXISTS idx_pinned_messages_server_id;

-- ============================================================================
-- SERVER_MEMBERS TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_server_members_role_id;

-- ============================================================================
-- SERVER_ROLES TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_server_roles_server_id;
