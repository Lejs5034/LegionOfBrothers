/*
  # Fix Messaging Permissions for All Servers

  ## Overview
  Fixes RLS policies to allow users to send messages in any server where they have access,
  not just Headquarters. The current policy requires explicit server_members entries,
  but should allow messaging in public servers OR servers where the user is a member.

  ## Changes
  1. **Messages INSERT Policy**
    - Drop overly restrictive policy that requires server_members for all servers
    - Create new policy that allows messaging in:
      - Public servers (like Headquarters)
      - Private servers where the user is an explicit member
    - Maintains ban checking to prevent banned users from messaging

  ## Security
  - Users must still be authenticated
  - Users must own the message (user_id = auth.uid())
  - Platform-banned users cannot send messages
  - Public servers allow all authenticated users to message
  - Private servers require explicit server_members entry

  ## Affected Behavior
  - Headquarters: Continues to work as before (public server)
  - Learning servers: Now allow messaging if user is a member
  - Private servers: Require explicit membership
  - All servers: Respect platform bans
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can send messages unless banned" ON messages;

-- Create new policy that allows messaging in public servers or member servers
CREATE POLICY "Users can send messages unless banned" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND NOT is_user_banned_from_platform((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN servers s ON c.server_id = s.id
      WHERE c.id = messages.channel_id
      AND (
        -- Allow messaging in public servers
        s.is_public = true
        -- OR allow messaging if user is a member of private server
        OR EXISTS (
          SELECT 1 FROM server_members sm
          WHERE sm.server_id = s.id
          AND sm.user_id = (SELECT auth.uid())
        )
      )
    )
  );
