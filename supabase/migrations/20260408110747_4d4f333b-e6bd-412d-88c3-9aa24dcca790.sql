
-- Banned users table for temporary bans
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all bans" ON public.user_bans
  FOR SELECT TO authenticated
  USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert bans" ON public.user_bans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete bans" ON public.user_bans
  FOR DELETE TO authenticated
  USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Users can view own bans" ON public.user_bans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Banned/restricted words table (for username/name filtering)
CREATE TABLE public.banned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view banned words" ON public.banned_words
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert banned words" ON public.banned_words
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete banned words" ON public.banned_words
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Highlights table
CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Highlight',
  cover_image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlights viewable by everyone" ON public.highlights
  FOR SELECT USING (true);

CREATE POLICY "Users can create own highlights" ON public.highlights
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights" ON public.highlights
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights" ON public.highlights
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Highlight items table
CREATE TABLE public.highlight_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES public.highlights(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.highlight_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlight items viewable by everyone" ON public.highlight_items
  FOR SELECT USING (true);

CREATE POLICY "Users can add items to own highlights" ON public.highlight_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.highlights WHERE id = highlight_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from own highlights" ON public.highlight_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.highlights WHERE id = highlight_id AND user_id = auth.uid()
  ));

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = _user_id
      AND expires_at > now()
  )
$$;
