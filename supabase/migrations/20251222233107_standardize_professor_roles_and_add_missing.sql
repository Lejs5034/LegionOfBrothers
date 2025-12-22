/*
  # Standardize Professor Roles and Add Missing Roles

  ## Overview
  Standardizes professor role keys across all non-Headquarters servers to use 
  "professor" as the role_key, while keeping server-specific display names.
  Adds Professor role to servers that don't have one.

  ## Changes Made

  1. **Standardize Existing Professor Roles**
     - Update role_key to "professor" for all professor roles in non-HQ servers
     - Keep display names like "Copywriting Professor", "Fitness Professor", etc.
     - Role_key "professor" is unique per server (scoped by server_id)

  2. **Add Missing Professor Roles**
     - Create Professor role for The Legion server
     - Set rank=1 (highest permission level)

  ## Benefits
  - ✅ Consistent role_key across servers
  - ✅ Enables simple permission checks: "professor" in non-HQ servers
  - ✅ Display names remain descriptive and server-specific
  - ✅ All non-Headquarters servers have Professor role
*/

-- Standardize professor role_keys in non-Headquarters servers
UPDATE server_roles
SET role_key = 'professor'
WHERE role_key LIKE '%_professor'
  AND server_id != 'fcfb7ced-ab9c-4047-9a51-02f77b294e84'::uuid;

-- Add Professor role to The Legion if it doesn't exist
DO $$
DECLARE
  legion_server_id uuid;
  professor_role_exists boolean;
BEGIN
  -- Get The Legion server ID
  SELECT id INTO legion_server_id
  FROM servers
  WHERE slug = 'the-legion';

  IF legion_server_id IS NOT NULL THEN
    -- Check if Professor role already exists
    SELECT EXISTS(
      SELECT 1 FROM server_roles 
      WHERE server_id = legion_server_id 
      AND role_key = 'professor'
    ) INTO professor_role_exists;

    IF NOT professor_role_exists THEN
      -- Create Professor role for The Legion
      INSERT INTO server_roles (server_id, name, role_key, rank, color, icon)
      VALUES (
        legion_server_id,
        'The Legion Professor',
        'professor',
        1,
        '#8b5cf6',
        'GraduationCap'
      );
    END IF;

    -- Ensure Member role exists
    IF NOT EXISTS(
      SELECT 1 FROM server_roles 
      WHERE server_id = legion_server_id 
      AND role_key = 'member'
    ) THEN
      INSERT INTO server_roles (server_id, name, role_key, rank, color, icon)
      VALUES (
        legion_server_id,
        'Member',
        'member',
        999,
        '#6b7280',
        'User'
      );
    END IF;
  END IF;
END $$;
