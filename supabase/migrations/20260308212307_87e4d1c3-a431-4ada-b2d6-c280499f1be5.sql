
CREATE TABLE public.post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_user_id uuid NOT NULL,
  x_position numeric NOT NULL DEFAULT 50,
  y_position numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, tagged_user_id)
);

ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post tags are viewable by everyone"
  ON public.post_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can tag in their own posts"
  ON public.post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can remove tags from their posts"
  ON public.post_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
    OR tagged_user_id = auth.uid()
  );
