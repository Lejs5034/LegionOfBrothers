/*
  # Allow All Users to Post in Announcements Channels

  ## Problem
  Currently, the messages INSERT policies prevent users from posting in announcements
  channels unless they are admins. This is overly restrictive.

  ## Solution
  Remove the announcements channel restriction from both INSERT policies, allowing
  all users to post in any channel type (including announcements).

  ## Changes
  1. Drop existing INSERT policies
  2. Recreate them without the announcements restriction
*/

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Server members can send messages in private servers" ON messages;
DROP POLICY IF EXISTS "Users can send messages in public servers" ON messages;

-- Recreate INSERT policy for private servers (without announcements restriction)
CREATE POLICY "Server members can send messages in private servers"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
      AND sm.user_id = auth.uid()
    )
  );

-- Recreate INSERT policy for public servers (without announcements restriction)
CREATE POLICY "Users can send messages in public servers"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM channels c
      JOIN servers s ON s.id = c.server_id
      WHERE c.id = messages.channel_id
      AND s.is_public = true
    )
  );