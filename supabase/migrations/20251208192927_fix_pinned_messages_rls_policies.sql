/*
  # Fix Pinned Messages RLS Policies

  1. Changes
    - Add INSERT policy for pinned_messages allowing only strongest and middle ranks (power_level <= 6)
      - The Head (power_level = 1)
      - App Developers (power_level = 2)
      - Business Mastery Professor (power_level = 3)
      - Crypto Trading Professor (power_level = 4)
      - Copywriting Professor (power_level = 5)
      - Fitness Professor (power_level = 6)
    
    - Add DELETE policy for pinned_messages allowing the same roles
    
    - UPDATE policy for completeness (though not used in current implementation)
  
  2. Security
    - Only users with power_level <= 6 can pin (INSERT) messages
    - Only users with power_level <= 6 can unpin (DELETE) messages
    - All authenticated users can view (SELECT) pinned messages (existing policy)
*/

-- Create INSERT policy for pinning messages
CREATE POLICY "Only strongest and middle ranks can pin messages"
  ON pinned_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles_with_ban_status
      WHERE profiles_with_ban_status.id = auth.uid()
      AND profiles_with_ban_status.power_level <= 6
      AND NOT profiles_with_ban_status.is_banned
    )
  );

-- Create DELETE policy for unpinning messages
CREATE POLICY "Only strongest and middle ranks can unpin messages"
  ON pinned_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles_with_ban_status
      WHERE profiles_with_ban_status.id = auth.uid()
      AND profiles_with_ban_status.power_level <= 6
      AND NOT profiles_with_ban_status.is_banned
    )
  );

-- Create UPDATE policy for completeness (not currently used)
CREATE POLICY "Only strongest and middle ranks can update pinned messages"
  ON pinned_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles_with_ban_status
      WHERE profiles_with_ban_status.id = auth.uid()
      AND profiles_with_ban_status.power_level <= 6
      AND NOT profiles_with_ban_status.is_banned
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles_with_ban_status
      WHERE profiles_with_ban_status.id = auth.uid()
      AND profiles_with_ban_status.power_level <= 6
      AND NOT profiles_with_ban_status.is_banned
    )
  );
