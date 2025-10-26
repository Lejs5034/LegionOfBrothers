/*
  # Add Auto-Create Profile Trigger

  1. Changes
    - Add a database trigger to automatically create a profile when a new user signs up
    - This ensures every authenticated user has a corresponding profile record
    - Profile is created with username derived from email and default 'user' role

  2. Security
    - Trigger runs with SECURITY DEFINER to bypass RLS during profile creation
    - Only creates profile if one doesn't already exist
    - Uses user's email to generate initial username
*/

-- Function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to call the function after user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
