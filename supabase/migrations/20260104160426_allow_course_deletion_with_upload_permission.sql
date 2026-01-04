/*
  # Allow Course Deletion Based on Upload Permission

  ## Overview
  This migration updates the course deletion policy so that any user who can upload
  courses to a server can also delete courses from that server.

  Previously, only the course creator could delete their courses. Now, deletion is
  based on the same permission system as uploads.

  ## Changes Made

  ### 1. Course DELETE Policy
  - Drop existing policy that checks `created_by = auth.uid()`
  - Create new policy that uses `can_upload_courses_to_server()` function
  - Users with upload permission can delete any course in their authorized servers

  ## Permission Matrix

  | User Global Rank | Server Role | Can Delete Courses? |
  |------------------|-------------|---------------------|
  | the_head         | Any         | ✅ All servers      |
  | app_developer    | Any         | ✅ All servers      |
  | Any              | professor   | ✅ Their server     |
  | Other            | Any         | ❌ No               |

  ## Security Impact
  - ✅ Maintains authorization through existing permission function
  - ✅ RLS enforced server-side
  - ✅ Consistent with upload permission model
  - ✅ Platform ban restrictions still apply (via restrictive policies)
*/

-- ============================================================================
-- Update Course DELETE Policy
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Course creators can delete their courses" ON courses;

-- Create new policy based on upload permission
-- Any user who can upload to a server can delete courses from that server
CREATE POLICY "Users with upload permission can delete courses"
  ON courses
  FOR DELETE
  TO authenticated
  USING (
    can_upload_courses_to_server((select auth.uid()), server_id)
  );
