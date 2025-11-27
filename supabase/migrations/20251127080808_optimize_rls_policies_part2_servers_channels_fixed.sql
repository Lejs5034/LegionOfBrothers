/*
  # Optimize RLS Policies - Part 2: Servers and Channels (Fixed)

  1. Performance Improvements
    - Optimize servers table policies
    - Optimize channels table policies
    - Remove duplicate policies
*/

-- Servers policies
DROP POLICY IF EXISTS "Anyone can read public servers" ON servers;
DROP POLICY IF EXISTS "Only admins and superadmins can create servers" ON servers;
DROP POLICY IF EXISTS "Only admins and superadmins can update servers" ON servers;

CREATE POLICY "Anyone can read public servers"
  ON servers FOR SELECT
  TO authenticated
  USING (is_public = true OR (SELECT auth.uid()) IN (
    SELECT user_id FROM server_members WHERE server_id = servers.id
  ));

CREATE POLICY "Only admins and superadmins can create servers"
  ON servers FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'superadmin')
  ));

CREATE POLICY "Only admins and superadmins can update servers"
  ON servers FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'superadmin')
  ))
  WITH CHECK ((SELECT auth.uid()) IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'superadmin')
  ));

-- Channels policies - remove duplicates and optimize
DROP POLICY IF EXISTS "Server admins can manage channels" ON channels;
DROP POLICY IF EXISTS "Server members can read all channels" ON channels;
DROP POLICY IF EXISTS "Users can read channels in public servers" ON channels;
DROP POLICY IF EXISTS "Anyone can view channels" ON channels;
DROP POLICY IF EXISTS "Authorized users can create channels" ON channels;
DROP POLICY IF EXISTS "Strongest ranks can update channels" ON channels;
DROP POLICY IF EXISTS "Authorized users can delete channels" ON channels;

CREATE POLICY "Server members can read channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = channels.server_id
      AND (servers.is_public = true OR EXISTS (
        SELECT 1 FROM server_members
        WHERE server_members.server_id = servers.id
        AND server_members.user_id = (SELECT auth.uid())
      ))
    )
  );

CREATE POLICY "Authorized users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (can_user_create_channel((SELECT auth.uid()), server_id));

CREATE POLICY "Authorized users can update channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (can_user_create_channel((SELECT auth.uid()), server_id))
  WITH CHECK (can_user_create_channel((SELECT auth.uid()), server_id));

CREATE POLICY "Authorized users can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (can_user_delete_channel((SELECT auth.uid()), server_id));
