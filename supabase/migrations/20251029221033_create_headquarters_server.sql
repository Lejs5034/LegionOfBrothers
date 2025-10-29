/*
  # Create Headquarters Server

  1. New Server
    - Creates "Headquarters" server as the main collaboration hub
    - Public server for all members to discuss achievements and ideas
    - Positioned as the central place for cross-skill collaboration

  2. Channels
    - announcements: Official updates and important information
    - achievements: Share wins and milestones
    - collaboration: Discuss business ideas and partnerships
    - general: General discussion and networking
    - resources: Share valuable tools and materials

  3. Purpose
    - Central hub where members with different skills unite
    - Platform for discussing how students can build businesses together
    - Space for sharing achievements and fostering collaboration
*/

-- Insert the Headquarters server
INSERT INTO servers (name, slug, description, is_public, created_by)
VALUES (
  'Headquarters',
  'headquarters',
  'The main hub where all members unite to share achievements and build business ideas together',
  true,
  (SELECT id FROM profiles LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- Create channels for Headquarters
DO $$
DECLARE
  hq_server_id uuid;
  channel_exists integer;
BEGIN
  -- Get the Headquarters server ID
  SELECT id INTO hq_server_id FROM servers WHERE slug = 'headquarters';

  -- Check and create announcements channel
  SELECT COUNT(*) INTO channel_exists FROM channels WHERE server_id = hq_server_id AND name = 'announcements';
  IF channel_exists = 0 THEN
    INSERT INTO channels (server_id, name, type, sort_order) VALUES (hq_server_id, 'announcements', 'text', 1);
  END IF;

  -- Check and create achievements channel
  SELECT COUNT(*) INTO channel_exists FROM channels WHERE server_id = hq_server_id AND name = 'achievements';
  IF channel_exists = 0 THEN
    INSERT INTO channels (server_id, name, type, sort_order) VALUES (hq_server_id, 'achievements', 'text', 2);
  END IF;

  -- Check and create collaboration channel
  SELECT COUNT(*) INTO channel_exists FROM channels WHERE server_id = hq_server_id AND name = 'collaboration';
  IF channel_exists = 0 THEN
    INSERT INTO channels (server_id, name, type, sort_order) VALUES (hq_server_id, 'collaboration', 'text', 3);
  END IF;

  -- Check and create general channel
  SELECT COUNT(*) INTO channel_exists FROM channels WHERE server_id = hq_server_id AND name = 'general';
  IF channel_exists = 0 THEN
    INSERT INTO channels (server_id, name, type, sort_order) VALUES (hq_server_id, 'general', 'text', 4);
  END IF;

  -- Check and create resources channel
  SELECT COUNT(*) INTO channel_exists FROM channels WHERE server_id = hq_server_id AND name = 'resources';
  IF channel_exists = 0 THEN
    INSERT INTO channels (server_id, name, type, sort_order) VALUES (hq_server_id, 'resources', 'text', 5);
  END IF;
END $$;