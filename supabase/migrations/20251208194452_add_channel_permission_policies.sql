/*
  # Add Channel Permission Policies

  ## Summary
  Adds missing RLS policies for channel creation, update, and deletion.
  These policies enforce that only users with power_level <= 6 can manage channels.

  ## Changes
  1. **INSERT Policy**: Only strongest and middle ranks can create channels
  2. **UPDATE Policy**: Only strongest and middle ranks can update channels  
  3. **DELETE Policy**: Only strongest and middle ranks can delete channels

  ## Security
  - Uses `can_user_create_channel` and `can_user_delete_channel` functions
  - These functions check global power level (must be <= 6)
  - Prevents unauthorized channel management via API
*/

-- Add INSERT policy for channel creation
CREATE POLICY "Authorized users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (can_user_create_channel((SELECT auth.uid()), server_id));

-- Add UPDATE policy for channel updates
CREATE POLICY "Authorized users can update channels"
  ON channels FOR UPDATE
  TO authenticated
  USING (can_user_create_channel((SELECT auth.uid()), server_id))
  WITH CHECK (can_user_create_channel((SELECT auth.uid()), server_id));

-- Add DELETE policy for channel deletion
CREATE POLICY "Authorized users can delete channels"
  ON channels FOR DELETE
  TO authenticated
  USING (can_user_delete_channel((SELECT auth.uid()), server_id));
