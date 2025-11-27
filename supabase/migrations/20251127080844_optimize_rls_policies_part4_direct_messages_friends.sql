/*
  # Optimize RLS Policies - Part 4: Direct Messages and Friends

  1. Performance Improvements
    - Optimize direct_messages table policies
    - Optimize friend_requests table policies
    - Remove duplicate policies
*/

-- Direct messages policies
DROP POLICY IF EXISTS "Users can view own direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send direct messages to friends" ON direct_messages;
DROP POLICY IF EXISTS "Users can mark received messages as read" ON direct_messages;
DROP POLICY IF EXISTS "Users can update own direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can delete own sent messages" ON direct_messages;

CREATE POLICY "Users can view own direct messages"
  ON direct_messages FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id);

CREATE POLICY "Users can update own direct messages"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id)
  WITH CHECK ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "Users can delete own sent messages"
  ON direct_messages FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id);

-- Friend requests policies
DROP POLICY IF EXISTS "Users can view own friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Receivers can update friend request status" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete own friend requests" ON friend_requests;

CREATE POLICY "Users can view own friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id);

CREATE POLICY "Users can update friend requests"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = receiver_id)
  WITH CHECK ((SELECT auth.uid()) = receiver_id);

CREATE POLICY "Users can delete own friend requests"
  ON friend_requests FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);
