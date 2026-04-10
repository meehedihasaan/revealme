
-- Create reel_views table for tracking real view counts
CREATE TABLE public.reel_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reel view counts"
ON public.reel_views FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can record views"
ON public.reel_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

-- Index for fast count queries
CREATE INDEX idx_reel_views_post_id ON public.reel_views(post_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_views;
