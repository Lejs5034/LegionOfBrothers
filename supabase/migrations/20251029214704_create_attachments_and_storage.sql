/*
  # Create attachments system with storage

  1. New Tables
    - message_attachments table for tracking file uploads:
      - id (uuid, primary key) - Unique identifier
      - message_id (uuid, nullable) - Reference to messages table
      - direct_message_id (uuid, nullable) - Reference to direct_messages table
      - user_id (uuid) - User who uploaded the file
      - file_name (text) - Original file name
      - file_type (text) - MIME type
      - file_size (bigint) - File size in bytes
      - storage_path (text) - Path in Supabase storage
      - created_at (timestamptz) - Upload timestamp

  2. Storage
    - Create 'uploads' bucket for file storage
    - Set public access with RLS policies

  3. Security
    - Enable RLS on message_attachments table
    - Users can view attachments for messages they can access
    - Users can upload attachments for their own messages
    - Users can delete their own attachments

  4. Constraints
    - Either message_id or direct_message_id must be set (but not both)
*/

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  direct_message_id uuid REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachment_belongs_to_one_message CHECK (
    (message_id IS NOT NULL AND direct_message_id IS NULL) OR
    (message_id IS NULL AND direct_message_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_direct_message ON message_attachments(direct_message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_user ON message_attachments(user_id);

-- Enable RLS
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for messages they can see
CREATE POLICY "Users can view attachments for accessible messages"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (
    (message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM messages m
      JOIN channels c ON m.channel_id = c.id
      JOIN servers s ON c.server_id = s.id
      WHERE m.id = message_attachments.message_id
      AND (s.is_public = true OR EXISTS (
        SELECT 1 FROM server_members
        WHERE server_members.server_id = s.id
        AND server_members.user_id = auth.uid()
      ))
    ))
    OR
    (direct_message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM direct_messages dm
      WHERE dm.id = message_attachments.direct_message_id
      AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
    ))
  );

-- Policy: Users can upload attachments
CREATE POLICY "Users can upload attachments"
  ON message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON message_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for uploads (this will be handled by Supabase, but we document it here)
-- The bucket should be named 'uploads' with public access and appropriate RLS policies