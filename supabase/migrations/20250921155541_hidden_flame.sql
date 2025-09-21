/*
  # Create Core Schema for The Legion of Brothers

  1. New Tables
    - `profiles` - User profiles linked to auth.users
    - `servers` - Community servers/groups
    - `server_members` - Server membership with roles
    - `channels` - Communication channels within servers
    - `messages` - Messages in channels
    - `courses` - Educational courses within servers
    - `lessons` - Individual lessons within courses
    - `livestreams` - Live streaming events

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for each table based on user roles and membership
    - Ensure data isolation and proper access control

  3. Enums
    - user_role: user, admin, superadmin
    - server_member_role: member, admin
    - channel_type: text, voice, announcements
    - course_level: beginner, intermediate, advanced
    - livestream_status: scheduled, live, ended
*/

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
CREATE TYPE server_member_role AS ENUM ('member', 'admin');
CREATE TYPE channel_type AS ENUM ('text', 'voice', 'announcements');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE livestream_status AS ENUM ('scheduled', 'live', 'ended');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  username text UNIQUE NOT NULL,
  avatar_url text,
  role user_role DEFAULT 'user' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  is_public boolean DEFAULT false NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Server members table
CREATE TABLE IF NOT EXISTS server_members (
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_server server_member_role DEFAULT 'member' NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (server_id, user_id)
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  type channel_type DEFAULT 'text' NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  level course_level DEFAULT 'beginner' NOT NULL,
  thumbnail_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text,
  duration_sec integer DEFAULT 0 NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Livestreams table
CREATE TABLE IF NOT EXISTS livestreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  title text NOT NULL,
  status livestream_status DEFAULT 'scheduled' NOT NULL,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Servers policies
CREATE POLICY "Anyone can read public servers"
  ON servers
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    OR EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_id = servers.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins and superadmins can create servers"
  ON servers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Only admins and superadmins can update servers"
  ON servers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- Server members policies
CREATE POLICY "Members can read server membership"
  ON server_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = server_members.server_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join servers themselves"
  ON server_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave servers or server admins can remove members"
  ON server_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM server_members sm
      WHERE sm.server_id = server_members.server_id
      AND sm.user_id = auth.uid()
      AND sm.role_in_server = 'admin'
    )
  );

-- Channels policies
CREATE POLICY "Server members can read channels"
  ON channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = channels.server_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Server admins can manage channels"
  ON channels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = channels.server_id
      AND user_id = auth.uid()
      AND role_in_server = 'admin'
    )
  );

-- Messages policies
CREATE POLICY "Server members can read messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Server members can send messages to text channels"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
      AND sm.user_id = auth.uid()
      AND (
        c.type != 'announcements'
        OR sm.role_in_server = 'admin'
      )
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages or server admins can delete any"
  ON messages
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM channels c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = messages.channel_id
      AND sm.user_id = auth.uid()
      AND sm.role_in_server = 'admin'
    )
  );

-- Courses policies
CREATE POLICY "Server members can read courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = courses.server_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Server admins can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = courses.server_id
      AND user_id = auth.uid()
      AND role_in_server = 'admin'
    )
  );

-- Lessons policies
CREATE POLICY "Server members can read lessons"
  ON lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = lessons.course_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Server admins can manage lessons"
  ON lessons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN server_members sm ON c.server_id = sm.server_id
      WHERE c.id = lessons.course_id
      AND sm.user_id = auth.uid()
      AND sm.role_in_server = 'admin'
    )
  );

-- Livestreams policies
CREATE POLICY "Server members can read livestreams"
  ON livestreams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = livestreams.server_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Server admins can manage livestreams"
  ON livestreams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = livestreams.server_id
      AND user_id = auth.uid()
      AND role_in_server = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_servers_slug ON servers(slug);
CREATE INDEX IF NOT EXISTS idx_servers_is_public ON servers(is_public);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON server_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_server_id ON channels(server_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_server_id ON courses(server_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_livestreams_server_id ON livestreams(server_id);
CREATE INDEX IF NOT EXISTS idx_livestreams_status ON livestreams(status);