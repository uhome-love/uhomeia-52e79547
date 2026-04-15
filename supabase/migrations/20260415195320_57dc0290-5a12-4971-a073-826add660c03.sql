INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access on whatsapp-media" ON storage.objects FOR SELECT USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Allow service role upload on whatsapp-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'whatsapp-media');
