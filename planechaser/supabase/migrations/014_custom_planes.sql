-- Custom planes table
CREATE TABLE IF NOT EXISTS custom_planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  type_line TEXT NOT NULL DEFAULT 'Plane — Custom',
  oracle_text TEXT NOT NULL DEFAULT '',
  chaos_text TEXT NOT NULL DEFAULT '',
  flavor_text TEXT,
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom planes"
  ON custom_planes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create custom planes"
  ON custom_planes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom planes"
  ON custom_planes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom planes"
  ON custom_planes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for custom plane images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-plane-images',
  'custom-plane-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Users can upload custom plane images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'custom-plane-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own custom plane images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'custom-plane-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own custom plane images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'custom-plane-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view custom plane images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'custom-plane-images');
