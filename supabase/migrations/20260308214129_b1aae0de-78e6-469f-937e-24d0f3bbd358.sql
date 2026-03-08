
CREATE TABLE public.post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post images are viewable by everyone"
  ON public.post_images FOR SELECT
  USING (true);

CREATE POLICY "Users can insert images for their own posts"
  ON public.post_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete images from their own posts"
  ON public.post_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid()
  ));
