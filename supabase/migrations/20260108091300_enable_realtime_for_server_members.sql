/*
  # Enable Realtime for Server Members Table

  ## Purpose
  Enable Supabase Realtime for the server_members table so that when users
  join or leave servers, or their server-specific roles change, all connected
  clients receive instant updates.

  ## Changes
  1. Add server_members table to supabase_realtime publication
  2. This allows real-time subscriptions to receive INSERT, UPDATE, DELETE events
  3. Member lists will automatically refresh when membership changes

  ## Impact
  - New members joining a server will appear instantly in the Members list
  - Members leaving a server will be removed instantly from the Members list
  - Server-specific role changes will be visible immediately
  - All changes persist after refresh and are visible on other clients
*/

-- Enable Realtime for server_members table to support instant membership updates
ALTER PUBLICATION supabase_realtime ADD TABLE server_members;