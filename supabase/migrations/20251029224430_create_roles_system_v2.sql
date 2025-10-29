/*
  # Create Role System (Version 2)

  1. New Tables
    - `server_roles`
      - `id` (uuid, primary key)
      - `server_id` (uuid, foreign key to servers)
      - `name` (text) - Role name
      - `rank` (integer) - Hierarchy level (lower = higher rank)
      - `color` (text) - Hex color code
      - `icon` (text) - Emoji icon
      - `created_at` (timestamptz)

  2. Modifications to Existing Tables
    - Add `role_id` column to existing `server_members` table

  3. Security
    - Enable RLS on server_roles
    - Allow authenticated users to read roles

  4. Initial Data
    - Create roles for all servers with proper hierarchy
*/

-- Create server_roles table
CREATE TABLE IF NOT EXISTS server_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  rank integer NOT NULL DEFAULT 999,
  color text NOT NULL DEFAULT '#ffffff',
  icon text NOT NULL DEFAULT '👤',
  created_at timestamptz DEFAULT now()
);

-- Add role_id to server_members if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'server_members' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE server_members ADD COLUMN role_id uuid REFERENCES server_roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on server_roles
ALTER TABLE server_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for server_roles
DROP POLICY IF EXISTS "Anyone can view server roles" ON server_roles;
CREATE POLICY "Anyone can view server roles"
  ON server_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage server roles" ON server_roles;
CREATE POLICY "Admins can manage server roles"
  ON server_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_roles.server_id
      AND servers.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_roles.server_id
      AND servers.created_by = auth.uid()
    )
  );

-- Insert roles for Headquarters
DO $$
DECLARE
  hq_id uuid;
  role_exists integer;
BEGIN
  SELECT id INTO hq_id FROM servers WHERE slug = 'headquarters';
  
  IF hq_id IS NOT NULL THEN
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = hq_id AND name = 'The Head';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (hq_id, 'The Head', 1, '#fbbf24', '🏆');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = hq_id AND name = 'Admins';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (hq_id, 'Admins', 2, '#a855f7', '⚙️');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = hq_id AND name = 'App Developers';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (hq_id, 'App Developers', 3, '#6b7280', '💻');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = hq_id AND name = 'Member';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (hq_id, 'Member', 999, '#e5e7eb', '👤');
    END IF;
  END IF;
END $$;

-- Insert roles for Business Mastery
DO $$
DECLARE
  bm_id uuid;
  role_exists integer;
BEGIN
  SELECT id INTO bm_id FROM servers WHERE slug = 'business-mastery';
  
  IF bm_id IS NOT NULL THEN
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = bm_id AND name = 'Business Mastery Professor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (bm_id, 'Business Mastery Professor', 1, '#fbbf24', '🎓');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = bm_id AND name = 'Business Mentor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (bm_id, 'Business Mentor', 2, '#06b6d4', '🧭');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = bm_id AND name = 'Member';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (bm_id, 'Member', 999, '#e5e7eb', '👤');
    END IF;
  END IF;
END $$;

-- Insert roles for Crypto Trading
DO $$
DECLARE
  ct_id uuid;
  role_exists integer;
BEGIN
  SELECT id INTO ct_id FROM servers WHERE slug = 'crypto-trading';
  
  IF ct_id IS NOT NULL THEN
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = ct_id AND name = 'Crypto Trading Professor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (ct_id, 'Crypto Trading Professor', 1, '#fbbf24', '🎓');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = ct_id AND name = 'Crypto Trading Mentor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (ct_id, 'Crypto Trading Mentor', 2, '#06b6d4', '🧭');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = ct_id AND name = 'Member';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (ct_id, 'Member', 999, '#e5e7eb', '👤');
    END IF;
  END IF;
END $$;

-- Insert roles for Copywriting
DO $$
DECLARE
  cw_id uuid;
  role_exists integer;
BEGIN
  SELECT id INTO cw_id FROM servers WHERE slug = 'copywriting';
  
  IF cw_id IS NOT NULL THEN
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = cw_id AND name = 'Copywriting Professor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (cw_id, 'Copywriting Professor', 1, '#fbbf24', '🎓');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = cw_id AND name = 'Copywriting Mentor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (cw_id, 'Copywriting Mentor', 2, '#06b6d4', '🧭');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = cw_id AND name = 'Member';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (cw_id, 'Member', 999, '#e5e7eb', '👤');
    END IF;
  END IF;
END $$;

-- Insert roles for Fitness
DO $$
DECLARE
  fit_id uuid;
  role_exists integer;
BEGIN
  SELECT id INTO fit_id FROM servers WHERE slug = 'fitness';
  
  IF fit_id IS NOT NULL THEN
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = fit_id AND name = 'Fitness Professor';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (fit_id, 'Fitness Professor', 1, '#fbbf24', '🎓');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = fit_id AND name = 'Coach';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (fit_id, 'Coach', 2, '#06b6d4', '🏋️');
    END IF;
    
    SELECT COUNT(*) INTO role_exists FROM server_roles WHERE server_id = fit_id AND name = 'Member';
    IF role_exists = 0 THEN
      INSERT INTO server_roles (server_id, name, rank, color, icon) VALUES (fit_id, 'Member', 999, '#e5e7eb', '👤');
    END IF;
  END IF;
END $$;

-- Assign default Member role to all existing server members
DO $$
DECLARE
  member_record RECORD;
  default_role_id uuid;
BEGIN
  FOR member_record IN 
    SELECT sm.server_id, sm.user_id 
    FROM server_members sm 
    WHERE sm.role_id IS NULL 
  LOOP
    SELECT id INTO default_role_id 
    FROM server_roles 
    WHERE server_id = member_record.server_id AND rank = 999 
    LIMIT 1;
    
    IF default_role_id IS NOT NULL THEN
      UPDATE server_members 
      SET role_id = default_role_id 
      WHERE server_id = member_record.server_id 
      AND user_id = member_record.user_id;
    END IF;
  END LOOP;
END $$;