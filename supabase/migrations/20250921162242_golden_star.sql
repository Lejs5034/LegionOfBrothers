@@ .. @@
 ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-CREATE POLICY "Users can read all profiles"
+CREATE POLICY "Users can read own profile"
   ON profiles
   FOR SELECT
   TO authenticated
-  USING (true);
+  USING (auth.uid() = id);

-CREATE POLICY "Users can update own profile"
+CREATE POLICY "Allow insert for own profile"
+  ON profiles
+  FOR INSERT
+  TO authenticated
+  WITH CHECK (auth.uid() = id);
+
+CREATE POLICY "Allow update own profile"
   ON profiles
   FOR UPDATE
   TO authenticated
   USING (auth.uid() = id);

-CREATE POLICY "Users can insert own profile"
-  ON profiles
-  FOR INSERT
-  TO authenticated
-  WITH CHECK (auth.uid() = id);