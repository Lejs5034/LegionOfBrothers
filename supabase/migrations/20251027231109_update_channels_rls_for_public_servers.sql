/*
  # Update Channels RLS Policy for Public Servers

  1. Changes
    - Add a new RLS policy to allow authenticated users to view channels in public servers
    - This allows users to browse and join public servers without being members first
  
  2. Security
    - Only applies to SELECT operations
    - Only applies to public servers (is_public = true)
    - Still requires authentication
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Server members can read channels" ON channels;

-- Create new policy that allows viewing channels in public servers
CREATE POLICY "Users can read channels in public servers"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers 
      WHERE servers.id = channels.server_id 
      AND servers.is_public = true
    )
  );

-- Keep the policy for server members to read channels in private servers
CREATE POLICY "Server members can read all channels"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = channels.server_id
      AND server_members.user_id = auth.uid()
    )
  );
