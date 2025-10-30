/*
  # Create Mentions and Notifications System

  1. New Tables
    - `message_mentions`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `mentioned_user_id` (uuid, foreign key to profiles)
      - `mentioning_user_id` (uuid, foreign key to profiles)
      - `read` (boolean)
      - `created_at` (timestamptz)

    - `message_reads`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `user_id` (uuid, foreign key to profiles)
      - `read_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view their own mentions
    - Users can mark their own mentions as read

  3. Notes
    - Track when users are mentioned in messages
    - Track when users have read messages
    - Support jump-to-mentions functionality
*/

-- Create message_mentions table
CREATE TABLE IF NOT EXISTS message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mentioning_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(message_id, mentioned_user_id)
);

-- Create message_reads table
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user ON message_mentions(mentioned_user_id, read);
CREATE INDEX IF NOT EXISTS idx_message_mentions_message ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- Enable RLS
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policies for message_mentions
CREATE POLICY "Users can view their own mentions"
  ON message_mentions FOR SELECT
  TO authenticated
  USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users can create mentions"
  ON message_mentions FOR INSERT
  TO authenticated
  WITH CHECK (mentioning_user_id = auth.uid());

CREATE POLICY "Users can update their own mentions"
  ON message_mentions FOR UPDATE
  TO authenticated
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Policies for message_reads
CREATE POLICY "Users can view their own read status"
  ON message_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their read status"
  ON message_reads FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
