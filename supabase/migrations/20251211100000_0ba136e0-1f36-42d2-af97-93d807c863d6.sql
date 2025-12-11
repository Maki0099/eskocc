-- Create storage bucket for routes (GPX files and cover images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('routes', 'routes', true);

-- RLS: Anyone can view routes files (public bucket)
CREATE POLICY "Anyone can view routes files"
ON storage.objects FOR SELECT
USING (bucket_id = 'routes');

-- RLS: Service role can manage routes files (for edge function import)
CREATE POLICY "Service role can manage routes files"
ON storage.objects FOR ALL
USING (bucket_id = 'routes')
WITH CHECK (bucket_id = 'routes');