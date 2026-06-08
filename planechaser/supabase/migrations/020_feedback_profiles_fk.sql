-- Add FK from feedback.user_id to profiles.id (in addition to existing auth.users FK)
-- This enables PostgREST join: .select('*, profiles(display_name)')
ALTER TABLE feedback
  ADD CONSTRAINT feedback_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
