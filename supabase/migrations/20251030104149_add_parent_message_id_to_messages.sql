/*
  # Add Parent Message ID for Reply Threading

  1. Changes
    - Add parent_message_id column to messages table
    - Add foreign key constraint to ensure parent exists
    - Add index for efficient reply lookups

  2. Notes
    - parent_message_id is nullable (not all messages are replies)
    - Self-referencing foreign key allows message threading
    - Index improves performance for reply count queries
*/

-- Add parent_message_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'parent_message_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN parent_message_id uuid REFERENCES messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for efficient reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);
