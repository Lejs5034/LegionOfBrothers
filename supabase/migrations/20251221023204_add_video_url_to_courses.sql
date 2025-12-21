/*
  # Add Video URL to Courses
  
  1. Changes
    - Add video_url column to courses table to store uploaded video file URLs
    - Make video_url optional (nullable) as courses might not always have videos
  
  2. Purpose
    - Enable video course uploads for Learning Center
    - Support video file storage via Supabase Storage
    - Allow courses to reference their video content
*/

-- Add video_url column to courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN video_url text;
  END IF;
END $$;
