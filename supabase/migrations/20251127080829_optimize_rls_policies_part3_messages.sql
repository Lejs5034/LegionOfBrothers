/*
  # Optimize RLS Policies - Part 3: Messages

  1. Performance Improvements
    - Optimize messages table policies
    - Remove duplicate policies
*/

-- Messages policies - remove duplicates and optimize
DROP POLICY IF EXISTS "Users can read messages in public servers" ON messages;
DROP POLICY IF EXISTS "Server members can read messages in private servers" ON messages;
DROP POLICY IF EXISTS "Users can send messages in public servers" ON messages;
DROP POLICY IF EXISTS "Server members can send messages in private servers" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages or server admins can delete any" ON messages;

CREATE POLICY "Users can read accessible messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels
      JOIN servers ON servers.id = channels.server_id
      WHERE channels.id = messages.channel_id
      AND (servers.is_public = true OR EXISTS (
        SELECT 1 FROM server_members
        WHERE server_members.server_id = servers.id
        AND server_members.user_id = (SELECT auth.uid())
      ))
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM channels
      JOIN servers ON servers.id = channels.server_id
      WHERE channels.id = messages.channel_id
      AND (servers.is_public = true OR EXISTS (
        SELECT 1 FROM server_members
        WHERE server_members.server_id = servers.id
        AND server_members.user_id = (SELECT auth.uid())
      ))
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
