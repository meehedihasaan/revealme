CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, viewer_id)
);

GRANT SELECT, INSERT ON public.post_views TO authenticated;
GRANT SELECT ON public.post_views TO anon;
GRANT ALL ON public.post_views TO service_role;

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read post views" ON public.post_views FOR SELECT USING (true);
CREATE POLICY "Users can record their own views" ON public.post_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON public.post_views(post_id);