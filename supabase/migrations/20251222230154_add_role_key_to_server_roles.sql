/*
  # Add role_key Column to server_roles Table

  ## Overview
  Adds a stable `role_key` column to the `server_roles` table for consistent role identification
  across servers, independent of display names.

  ## Changes Made

  1. **New Column**
     - `role_key` (text, not null): Stable identifier for role type
     - Examples: "the_head", "admins", "app_developers", "member"
     - Generated from role name by lowercasing and replacing spaces with underscores

  2. **Data Population**
     - Automatically populates role_key for existing roles
     - Uses normalized version of role name

  3. **Index**
     - Adds index on (server_id, role_key) for fast lookups

  ## Benefits
  - ✅ Stable role identification across servers
  - ✅ Independent of display name changes
  - ✅ Enables consistent permission checks using keys
  - ✅ Fast lookups with composite index
*/

-- Add role_key column
ALTER TABLE server_roles 
ADD COLUMN IF NOT EXISTS role_key text;

-- Populate role_key from existing names
UPDATE server_roles
SET role_key = lower(replace(name, ' ', '_'))
WHERE role_key IS NULL;

-- Make role_key non-nullable after population
ALTER TABLE server_roles 
ALTER COLUMN role_key SET NOT NULL;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_server_roles_server_id_role_key 
ON server_roles(server_id, role_key);
