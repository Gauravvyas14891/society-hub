
-- Image URL column
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS image_url text;

-- Storage bucket for complaint photos
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-photos', 'complaint-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload complaint photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'complaint-photos');

CREATE POLICY "Anyone can view complaint photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'complaint-photos');

CREATE POLICY "Users can delete own complaint photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'complaint-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
