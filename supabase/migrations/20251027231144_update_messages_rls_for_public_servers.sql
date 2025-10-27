/*
  # Update Messages RLS Policy for Public Servers

  1. Changes
    - Update RLS policies to allow authenticated users to read and send messages in public servers
    - Maintain existing policies for private servers (member-only access)
  
  2. Security
    - Users can read messages in public server channels
    - Users can send messages to public server text channels (not announcements)
    - Users can still only edit/delete their own messages
    - Server members still have access to private servers
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Server members can read messages" ON messages;
DROP POLICY IF EXISTS "Server members can send messages to text channels" ON messages;

-- Allow reading messages in public servers
CREATE POLICY "Users can read messages in public servers"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = messages.channel_id
      AND s.is_public = true
    )
  );

-- Allow reading messages in private servers for members
CREATE POLICY "Server members can read messages in private servers"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
      AND sm.user_id = auth.uid()
    )
  );

-- Allow sending messages to public server channels
CREATE POLICY "Users can send messages in public servers"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = messages.channel_id
      AND s.is_public = true
      AND c.type != 'announcements'::channel_type
    )
  );

-- Allow server members to send messages in private servers
CREATE POLICY "Server members can send messages in private servers"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
      AND sm.user_id = auth.uid()
      AND (c.type != 'announcements'::channel_type OR sm.role_in_server = 'admin'::server_member_role)
    )
  );
