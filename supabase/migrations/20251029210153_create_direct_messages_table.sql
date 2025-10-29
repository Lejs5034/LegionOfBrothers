/*
  # Create direct messages table

  1. New Tables
    - direct_messages table for storing one-on-one messages between friends:
      - id (uuid, primary key) - Unique identifier for each message
      - sender_id (uuid, foreign key to profiles) - User who sent the message
      - receiver_id (uuid, foreign key to profiles) - User who received the message
      - content (text) - Message content
      - read (boolean) - Whether the message has been read
      - created_at (timestamptz) - When the message was sent

  2. Security
    - Enable RLS on direct_messages table
    - Add policy for users to view messages they sent or received
    - Add policy for users to send direct messages to their friends
    - Add policy for users to update read status on messages they received
    - Add policy for users to delete their own sent messages

  3. Indexes
    - Index on sender_id and receiver_id for efficient querying
    - Index on created_at for message ordering

  4. Constraints
    - Ensure messages are only between friends (via function check)
*/

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(sender_id, receiver_id, created_at);

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages they sent or received
CREATE POLICY "Users can view own direct messages"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can send direct messages to their friends
CREATE POLICY "Users can send direct messages to friends"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM friend_requests
      WHERE status = 'accepted'
      AND (
        (friend_requests.sender_id = auth.uid() AND friend_requests.receiver_id = direct_messages.receiver_id)
        OR (friend_requests.receiver_id = auth.uid() AND friend_requests.sender_id = direct_messages.receiver_id)
      )
    )
  );

-- Policy: Users can update read status on messages they received
CREATE POLICY "Users can mark received messages as read"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Policy: Users can delete their own sent messages
CREATE POLICY "Users can delete own sent messages"
  ON direct_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);