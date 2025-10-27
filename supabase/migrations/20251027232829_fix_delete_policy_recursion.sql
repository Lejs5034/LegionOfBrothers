/*
  # Fix DELETE Policy Recursion in server_members

  ## Problem
  The DELETE policy on server_members also has recursion - it queries server_members
  within the server_members policy.

  ## Solution
  Since we now allow all authenticated users to read server_members (previous fix),
  we need to ensure DELETE doesn't create recursion. We'll use a subquery that
  relies on the simplified SELECT policy.

  ## Changes
  1. Drop and recreate the DELETE policy without recursion
*/

-- Drop the problematic DELETE policy
DROP POLICY IF EXISTS "Users can leave servers or server admins can remove members" ON server_members;

-- Recreate without causing recursion issues
-- Users can delete their own membership
-- Admins can delete any membership in their servers (the subquery now works because SELECT is non-recursive)
CREATE POLICY "Users can leave servers or admins can remove members"
  ON server_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 
      FROM server_members sm
      WHERE sm.server_id = server_members.server_id 
      AND sm.user_id = auth.uid() 
      AND sm.role_in_server = 'admin'
    )
  );