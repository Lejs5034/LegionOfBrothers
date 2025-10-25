/*
  # Update Profiles RLS Policies

  1. Changes
    - Drop existing permissive profile policies
    - Replace with more restrictive policies:
      - Users can only read their own profile (instead of all profiles)
      - Rename policies for clarity

  2. Security
    - Maintains strict RLS with auth.uid() checks
    - Each user only has access to their own profile data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new restrictive policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow insert for own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
