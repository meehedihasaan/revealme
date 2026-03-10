
CREATE TABLE public.user_thoughts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  thought TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_thoughts ENABLE ROW LEVEL SECURITY;

-- Anyone can read thoughts
CREATE POLICY "Anyone can view thoughts" ON public.user_thoughts
  FOR SELECT TO authenticated USING (true);

-- Users can manage their own thought
CREATE POLICY "Users can insert own thought" ON public.user_thoughts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own thought" ON public.user_thoughts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own thought" ON public.user_thoughts
  FOR DELETE TO authenticated USING (user_id = auth.uid());
