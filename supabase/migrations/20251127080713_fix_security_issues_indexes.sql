/*
  # Fix Security Issues - Add Missing Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - Improves query performance for JOIN operations
    - Prevents full table scans on foreign key lookups

  2. Indexes Added
    - banned_users: banned_by, server_id
    - course_progress: course_id
    - courses: created_by
    - livestreams: created_by
    - message_mentions: mentioning_user_id
    - messages: user_id
    - pinned_messages: channel_id, pinned_by, server_id
    - server_members: role_id
    - server_roles: server_id
    - servers: created_by
*/

-- Banned users indexes
CREATE INDEX IF NOT EXISTS idx_banned_users_banned_by ON banned_users(banned_by);
CREATE INDEX IF NOT EXISTS idx_banned_users_server_id ON banned_users(server_id);

-- Course progress indexes
CREATE INDEX IF NOT EXISTS idx_course_progress_course_id ON course_progress(course_id);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);

-- Livestreams indexes
CREATE INDEX IF NOT EXISTS idx_livestreams_created_by ON livestreams(created_by);

-- Message mentions indexes
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioning_user_id ON message_mentions(mentioning_user_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Pinned messages indexes
CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel_id ON pinned_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_pinned_by ON pinned_messages(pinned_by);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_server_id ON pinned_messages(server_id);

-- Server members indexes
CREATE INDEX IF NOT EXISTS idx_server_members_role_id ON server_members(role_id);

-- Server roles indexes
CREATE INDEX IF NOT EXISTS idx_server_roles_server_id ON server_roles(server_id);

-- Servers indexes
CREATE INDEX IF NOT EXISTS idx_servers_created_by ON servers(created_by);
