/*
  # Update RLS Policies to Use Permission System

  1. Updates
    - Add RLS policies for channels table using permission functions
    - Add pinned_messages table for message pinning
    - Add banned_users table for user bans
    - Policies enforce server-scoped permissions based on power levels

  2. New Tables
    - `pinned_messages`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `channel_id` (uuid, foreign key to channels)
      - `server_id` (uuid, foreign key to servers)
      - `pinned_by` (uuid, foreign key to profiles)
      - `pinned_at` (timestamptz)

    - `banned_users`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `server_id` (uuid, foreign key to servers, nullable for global bans)
      - `banned_by` (uuid, foreign key to profiles)
      - `reason` (text)
      - `banned_at` (timestamptz)
      - `expires_at` (timestamptz, nullable)

  3. Security
    - Enable RLS on all new tables
    - Enforce permission checks for all actions
*/

-- Create pinned_messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  pinned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  pinned_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(message_id)
);

-- Create banned_users table
CREATE TABLE IF NOT EXISTS banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  reason text DEFAULT '' NOT NULL,
  banned_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  UNIQUE(user_id, server_id)
);

-- Enable RLS
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

-- Pinned messages policies
CREATE POLICY "Anyone can view pinned messages"
  ON pinned_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can pin messages"
  ON pinned_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    can_user_pin_on_server(auth.uid(), server_id)
  );

CREATE POLICY "Authorized users can unpin messages"
  ON pinned_messages FOR DELETE
  TO authenticated
  USING (
    can_user_pin_on_server(auth.uid(), server_id)
  );

-- Banned users policies
CREATE POLICY "Anyone can view bans"
  ON banned_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can ban"
  ON banned_users FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN server_id IS NULL THEN can_user_ban_globally(auth.uid())
      ELSE can_user_ban_on_server(auth.uid(), server_id, user_id)
    END
  );

CREATE POLICY "Authorized users can remove bans"
  ON banned_users FOR DELETE
  TO authenticated
  USING (
    CASE
      WHEN server_id IS NULL THEN can_user_ban_globally(auth.uid())
      ELSE can_user_ban_on_server(auth.uid(), server_id, user_id)
    END
  );

-- Update channels policies to use permission system
DROP POLICY IF EXISTS "Anyone can view channels" ON channels;
DROP POLICY IF EXISTS "Authenticated users can create channels" ON channels;
DROP POLICY IF EXISTS "Channel creators can update channels" ON channels;
DROP POLICY IF EXISTS "Channel creators can delete channels" ON channels;

CREATE POLICY "Anyone can view channels"
  ON channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (
    can_user_create_channel(auth.uid(), server_id)
  );

CREATE POLICY "Strongest ranks can update channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (
    get_user_power_level(auth.uid(), server_id) IN ('strongest', 'medium')
  )
  WITH CHECK (
    get_user_power_level(auth.uid(), server_id) IN ('strongest', 'medium')
  );

CREATE POLICY "Authorized users can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (
    can_user_delete_channel(auth.uid(), server_id)
  );

-- Update server_members policies to use permission system for rank management
DROP POLICY IF EXISTS "Users can view server members" ON server_members;
DROP POLICY IF EXISTS "Users can join servers" ON server_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON server_members;
DROP POLICY IF EXISTS "Users can leave servers" ON server_members;

CREATE POLICY "Users can view server members"
  ON server_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join servers"
  ON server_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authorized users can update memberships"
  ON server_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR can_user_manage_ranks(auth.uid(), server_id, user_id)
  )
  WITH CHECK (
    auth.uid() = user_id OR can_user_manage_ranks(auth.uid(), server_id, user_id)
  );

CREATE POLICY "Users can leave servers or be removed by authorized users"
  ON server_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR can_user_manage_ranks(auth.uid(), server_id, user_id)
  );
