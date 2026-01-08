/*
  # Auto-assign default Member role to new server members

  ## Purpose
  Automatically assign the default "Member" role (rank 999) to users when they
  join a server if no role is explicitly assigned.

  ## Changes
  1. Create trigger function to assign default role
  2. Trigger runs on INSERT to server_members table
  3. Only assigns role if role_id is NULL

  ## Impact
  - New members automatically get the Member role
  - Ensures all members always have a role assigned
  - Member list displays all users correctly from the start
*/

CREATE OR REPLACE FUNCTION auto_assign_default_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  IF NEW.role_id IS NULL THEN
    SELECT id INTO default_role_id
    FROM server_roles
    WHERE server_id = NEW.server_id
    AND rank = 999
    LIMIT 1;
    
    IF default_role_id IS NOT NULL THEN
      NEW.role_id := default_role_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_assign_default_member_role_trigger ON server_members;
CREATE TRIGGER auto_assign_default_member_role_trigger
  BEFORE INSERT ON server_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_default_member_role();