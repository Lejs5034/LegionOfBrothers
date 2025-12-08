/*
  # Add Login Streak System

  1. Changes
    - Add `login_streak` column to profiles table (tracks consecutive login days)
    - Add `last_login_at` column to profiles table (tracks last login timestamp)
    - Create function `update_login_streak()` to automatically update streak on login
    
  2. Login Streak Logic
    - If last login was within the previous 24 hours: increase streak by 1
    - If last login was more than 48 hours ago: reset streak to 1
    - If between 24-48 hours: don't increase, but next login after 48h resets to 1
    
  3. Notes
    - login_streak defaults to 0 (will be set to 1 on first login)
    - last_login_at defaults to NULL (will be set on first login)
    - Function is called automatically when user authenticates
*/

-- Add login streak columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'login_streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN login_streak integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

-- Create function to update login streak
CREATE OR REPLACE FUNCTION update_login_streak(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  current_streak integer;
  last_login timestamptz;
  hours_since_last_login numeric;
BEGIN
  -- Get current streak and last login
  SELECT login_streak, last_login_at
  INTO current_streak, last_login
  FROM profiles
  WHERE id = user_id;

  -- If this is the first login (last_login is NULL)
  IF last_login IS NULL THEN
    UPDATE profiles
    SET login_streak = 1,
        last_login_at = now()
    WHERE id = user_id;
    RETURN;
  END IF;

  -- Calculate hours since last login
  hours_since_last_login := EXTRACT(EPOCH FROM (now() - last_login)) / 3600;

  -- Update streak based on time since last login
  IF hours_since_last_login <= 24 THEN
    -- Within 24 hours: increase streak
    UPDATE profiles
    SET login_streak = current_streak + 1,
        last_login_at = now()
    WHERE id = user_id;
  ELSIF hours_since_last_login > 48 THEN
    -- More than 48 hours: reset streak to 1
    UPDATE profiles
    SET login_streak = 1,
        last_login_at = now()
    WHERE id = user_id;
  ELSE
    -- Between 24-48 hours: don't increase, just update timestamp
    -- The streak will reset on the next login after 48h
    UPDATE profiles
    SET last_login_at = now()
    WHERE id = user_id;
  END IF;
END;
$$;

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);
