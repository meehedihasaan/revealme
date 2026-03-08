
-- Fix overly permissive conversation policies
DROP POLICY "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "Authenticated users can add participants" ON public.conversation_participants;
CREATE POLICY "Authenticated users can add participants" ON public.conversation_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
