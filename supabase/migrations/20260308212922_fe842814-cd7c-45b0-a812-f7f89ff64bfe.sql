
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story views are viewable by story owner"
  ON public.story_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
    OR viewer_id = auth.uid()
  );

CREATE POLICY "Users can mark stories as viewed"
  ON public.story_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);
