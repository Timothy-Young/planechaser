-- Drop the unique constraint on display_name to allow multiple users with the same name
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_display_name_key;
