/*
  # Create Role Permission System

  1. New Tables
    - `role_permissions`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key to server_roles)
      - `power_level` (text: 'strongest', 'medium', 'weakest')
      - `can_ban_globally` (boolean)
      - `can_pin_globally` (boolean)
      - `can_upload_courses_own_server` (boolean)
      - `can_manage_ranks_own_server` (boolean)
      - `can_manage_channels_own_server` (boolean)
      - `can_create_channels_own_server` (boolean)
      - `can_delete_channels_own_server` (boolean)
      - `can_ban_own_server` (boolean)
      - `can_pin_own_server` (boolean)

  2. Initial Data
    - Set up permissions for each role according to the power levels:
      * Strongest: The Head, App Developers
      * Medium: All Professors
      * Weakest: Admins, Mentors, Coach

  3. Security
    - Enable RLS on role_permissions
    - Anyone can view permissions (needed for permission checks)
    - Only strongest ranks can modify permissions
*/

-- Create role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES server_roles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  power_level text NOT NULL CHECK (power_level IN ('strongest', 'medium', 'weakest')),
  can_ban_globally boolean DEFAULT false NOT NULL,
  can_pin_globally boolean DEFAULT false NOT NULL,
  can_upload_courses_own_server boolean DEFAULT false NOT NULL,
  can_manage_ranks_own_server boolean DEFAULT false NOT NULL,
  can_manage_channels_own_server boolean DEFAULT false NOT NULL,
  can_create_channels_own_server boolean DEFAULT false NOT NULL,
  can_delete_channels_own_server boolean DEFAULT false NOT NULL,
  can_ban_own_server boolean DEFAULT false NOT NULL,
  can_pin_own_server boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only strongest ranks can modify permissions
CREATE POLICY "Strongest ranks can manage permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      WHERE sm.user_id = auth.uid()
        AND rp.power_level = 'strongest'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN role_permissions rp ON sm.role_id = rp.role_id
      WHERE sm.user_id = auth.uid()
        AND rp.power_level = 'strongest'
    )
  );

-- Insert permissions for all roles
DO $$
DECLARE
  role_record RECORD;
BEGIN
  -- Strongest Ranks
  FOR role_record IN
    SELECT id FROM server_roles WHERE name IN ('The Head', 'App Developers')
  LOOP
    INSERT INTO role_permissions (
      role_id,
      power_level,
      can_ban_globally,
      can_pin_globally,
      can_upload_courses_own_server,
      can_manage_ranks_own_server,
      can_manage_channels_own_server,
      can_create_channels_own_server,
      can_delete_channels_own_server,
      can_ban_own_server,
      can_pin_own_server
    ) VALUES (
      role_record.id,
      'strongest',
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true
    ) ON CONFLICT (role_id) DO UPDATE SET
      power_level = 'strongest',
      can_ban_globally = true,
      can_pin_globally = true,
      can_upload_courses_own_server = true,
      can_manage_ranks_own_server = true,
      can_manage_channels_own_server = true,
      can_create_channels_own_server = true,
      can_delete_channels_own_server = true,
      can_ban_own_server = true,
      can_pin_own_server = true;
  END LOOP;

  -- Medium Ranks (Professors)
  FOR role_record IN
    SELECT id FROM server_roles WHERE name IN (
      'Business Mastery Professor',
      'Crypto Trading Professor',
      'Copywriting Professor',
      'Fitness Professor'
    )
  LOOP
    INSERT INTO role_permissions (
      role_id,
      power_level,
      can_ban_globally,
      can_pin_globally,
      can_upload_courses_own_server,
      can_manage_ranks_own_server,
      can_manage_channels_own_server,
      can_create_channels_own_server,
      can_delete_channels_own_server,
      can_ban_own_server,
      can_pin_own_server
    ) VALUES (
      role_record.id,
      'medium',
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false
    ) ON CONFLICT (role_id) DO UPDATE SET
      power_level = 'medium',
      can_ban_globally = true,
      can_pin_globally = true,
      can_upload_courses_own_server = true,
      can_manage_ranks_own_server = true,
      can_manage_channels_own_server = true,
      can_create_channels_own_server = true,
      can_delete_channels_own_server = true,
      can_ban_own_server = false,
      can_pin_own_server = false;
  END LOOP;

  -- Weakest Ranks
  FOR role_record IN
    SELECT id FROM server_roles WHERE name IN (
      'Admins',
      'Business Mentor',
      'Crypto Trading Mentor',
      'Copywriting Mentor',
      'Coach'
    )
  LOOP
    INSERT INTO role_permissions (
      role_id,
      power_level,
      can_ban_globally,
      can_pin_globally,
      can_upload_courses_own_server,
      can_manage_ranks_own_server,
      can_manage_channels_own_server,
      can_create_channels_own_server,
      can_delete_channels_own_server,
      can_ban_own_server,
      can_pin_own_server
    ) VALUES (
      role_record.id,
      'weakest',
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      true,
      true
    ) ON CONFLICT (role_id) DO UPDATE SET
      power_level = 'weakest',
      can_ban_globally = false,
      can_pin_globally = false,
      can_upload_courses_own_server = false,
      can_manage_ranks_own_server = false,
      can_manage_channels_own_server = false,
      can_create_channels_own_server = true,
      can_delete_channels_own_server = false,
      can_ban_own_server = true,
      can_pin_own_server = true;
  END LOOP;
END $$;
