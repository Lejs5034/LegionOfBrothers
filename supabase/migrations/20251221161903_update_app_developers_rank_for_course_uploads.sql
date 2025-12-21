/*
  # Update App Developers Rank for Course Uploads

  ## Overview
  Updates the "App Developers" server role rank from 3 to 2 to grant course upload permissions.

  ## Changes Made

  1. **Server Role Rank Update**
     - Updates "App Developers" role in Headquarters server from rank 3 to rank 2
     - This allows App Developers to upload courses (permission requires rank <= 2)

  ## Permission Impact
  - ✅ Users with "App Developers" role can now upload courses to Headquarters server
  - ✅ Maintains permission hierarchy (The Head: 1, Admins/App Developers: 2, Members: 999)
  - ✅ Backend RLS policies will now allow App Developers to create/update/delete courses

  ## Security Notes
  - This grants course management permissions to App Developers
  - No changes to other roles or permissions
  - Still enforced by `can_upload_courses_to_server` function
*/

-- Update App Developers rank in Headquarters server
UPDATE server_roles
SET rank = 2
WHERE name = 'App Developers' 
  AND server_id = 'fcfb7ced-ab9c-4047-9a51-02f77b294e84'::uuid;
