/*
  # Create friend_requests table

  1. New Tables
    - friend_requests table with the following columns:
      - id (uuid, primary key) - Unique identifier for each friend request
      - sender_id (uuid, foreign key to profiles) - User who sent the request
      - receiver_id (uuid, foreign key to profiles) - User who received the request
      - status (enum: pending, accepted, rejected) - Status of the friend request
      - created_at (timestamptz) - When the request was sent
      - updated_at (timestamptz) - When the status was last updated

  2. Security
    - Enable RLS on friend_requests table
    - Add policy for users to view their own sent and received friend requests
    - Add policy for senders to create friend requests
    - Add policy for receivers to update friend request status
    - Add policy for users to delete their own sent or received requests

  3. Constraints
    - Unique constraint to prevent duplicate friend requests
    - Check constraint to prevent self-friend requests
*/

-- Create friend request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_request_status') THEN
    CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
END $$;

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friend_request CHECK (sender_id != receiver_id),
  CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view friend requests they sent or received
CREATE POLICY "Users can view own friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Receivers can update friend request status
CREATE POLICY "Receivers can update friend request status"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Policy: Users can delete their own sent or received requests
CREATE POLICY "Users can delete own friend requests"
  ON friend_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friend_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_request_updated_at();