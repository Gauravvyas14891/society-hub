
-- Add image_url to notices
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS image_url text;

-- Add rulebook_url to rules  
ALTER TABLE public.rules ADD COLUMN IF NOT EXISTS rulebook_url text;

-- Storage bucket for notice photos
INSERT INTO storage.buckets (id, name, public) VALUES ('notice-photos', 'notice-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for rule PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('rule-documents', 'rule-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Notice photos policies
CREATE POLICY "Admins can upload notice photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notice-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view notice photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'notice-photos');

CREATE POLICY "Admins can delete notice photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'notice-photos' AND public.has_role(auth.uid(), 'admin'));

-- Rule documents policies
CREATE POLICY "Admins can upload rule documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'rule-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view rule documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'rule-documents');

CREATE POLICY "Admins can delete rule documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'rule-documents' AND public.has_role(auth.uid(), 'admin'));
