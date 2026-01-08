/*
  # Enable Realtime for Server Roles Table

  ## Purpose
  Enable Supabase Realtime for the server_roles table so that when roles are
  created, updated, or deleted, all connected clients receive instant updates.

  ## Changes
  1. Add server_roles table to supabase_realtime publication
  2. This allows real-time subscriptions to receive events on the server_roles table
  3. Role management UIs will automatically refresh when roles change

  ## Impact
  - New roles will appear instantly in role selection dropdowns
  - Role updates (name, color, icon changes) will be visible immediately
  - Role deletions will update UIs instantly
  - All changes persist after refresh and are visible on other clients
*/

-- Enable Realtime for server_roles table to support instant role management
ALTER PUBLICATION supabase_realtime ADD TABLE server_roles;