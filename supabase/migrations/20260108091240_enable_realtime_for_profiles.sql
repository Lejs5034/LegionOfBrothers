/*
  # Enable Realtime for Profiles Table

  ## Purpose
  Enable Supabase Realtime for the profiles table so that when a user's rank
  is changed, all connected clients (including the MemberList component) receive
  the update instantly without needing to refresh the page.

  ## Changes
  1. Add profiles table to supabase_realtime publication
  2. This allows real-time subscriptions to receive UPDATE events on the profiles table
  3. Member lists will automatically refresh when user ranks change

  ## Impact
  - Role promotions will be visible immediately in the Members list
  - The count next to role sections (e.g., "ADMINS — 2") will update instantly
  - Changes persist after refresh and are visible on other clients
  - If a section previously had zero members, it will now display the promoted user
*/

-- Enable Realtime for profiles table to support instant rank change visibility
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;