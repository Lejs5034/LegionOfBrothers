/*
  # Enable Realtime for Messages

  ## Purpose
  Enable Supabase Realtime for the messages table so users can see new messages
  immediately without refreshing the page.

  ## Changes
  1. Add messages table to supabase_realtime publication
  2. This allows the frontend to subscribe to INSERT events on messages
*/

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;