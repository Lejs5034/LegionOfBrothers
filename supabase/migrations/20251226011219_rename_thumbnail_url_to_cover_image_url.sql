/*
  # Rename thumbnail_url to cover_image_url in courses table

  1. Changes
    - Rename `thumbnail_url` column to `cover_image_url` in `courses` table
    - This aligns the database schema with the frontend upload payload
  
  2. Notes
    - The column remains nullable (optional field)
    - All existing data is preserved
    - Frontend already sends `cover_image_url` in upload requests
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE courses RENAME COLUMN thumbnail_url TO cover_image_url;
  END IF;
END $$;
