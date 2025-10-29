/*
  # Add edited_at column to messages tables

  1. Changes to messages table
    - Add edited_at column to track when messages were last edited
    - Defaults to NULL (not edited)

  2. Changes to direct_messages table
    - Add edited_at column to track when messages were last edited
    - Defaults to NULL (not edited)

  3. Security Updates
    - Update RLS policies to allow users to update their own messages
    - Update RLS policies to allow users to delete their own messages
    - Policies already exist but need to ensure they cover updates/deletes
*/

-- Add edited_at column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at timestamptz;
  END IF;
END $$;

-- Add edited_at column to direct_messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'direct_messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE direct_messages ADD COLUMN edited_at timestamptz;
  END IF;
END $$;

-- Update RLS policies for messages table

-- Policy: Users can update their own messages
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update RLS policies for direct_messages table (update policy already exists)

-- Policy: Users can update their own sent direct messages
DROP POLICY IF EXISTS "Users can update own direct messages" ON direct_messages;
CREATE POLICY "Users can update own direct messages"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Note: Delete policy for direct_messages already exists from previous migration