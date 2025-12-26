/*
  # Add category column to courses table

  1. Changes
    - Add `category` text column to `courses` table
    - Set default value to 'General'
    - Make it NOT NULL with default to ensure data consistency
  
  2. Notes
    - Existing courses will automatically get 'General' as their category
    - New courses can specify a category or default to 'General'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'category'
  ) THEN
    ALTER TABLE courses ADD COLUMN category text NOT NULL DEFAULT 'General';
  END IF;
END $$;
