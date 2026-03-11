
-- Create message_reactions table for double-tap love reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
  )
);

-- Users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
