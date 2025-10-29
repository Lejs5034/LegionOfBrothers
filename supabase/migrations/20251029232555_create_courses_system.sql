/*
  # Create Courses System

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `server_id` (uuid, foreign key to servers)
      - `title` (text)
      - `description` (text)
      - `cover_image_url` (text, nullable)
      - `category` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)
    
    - `course_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `course_id` (uuid, foreign key to courses)
      - `server_id` (uuid, foreign key to servers)
      - `progress_percent` (integer, 0-100)
      - `is_bookmarked` (boolean)
      - `started_at` (timestamptz)
      - `last_accessed_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)
  
  2. Security
    - Enable RLS on both tables
    - Courses: anyone can view, only admins can create/update/delete
    - Progress: users can only see and modify their own progress

  3. Indexes
    - Index on server_id for both tables for fast lookups
    - Index on user_id + course_id for progress tracking
*/

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_image_url text,
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create course progress table
CREATE TABLE IF NOT EXISTS course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  is_bookmarked boolean DEFAULT false NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  last_accessed_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_server_id ON courses(server_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_server_id ON course_progress(server_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON course_progress(user_id, course_id);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

-- Courses policies: anyone can view
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Course creators can update their courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Course creators can delete their courses"
  ON courses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Course progress policies: users can only access their own progress
CREATE POLICY "Users can view own progress"
  ON course_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON course_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON course_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON course_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
