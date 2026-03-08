
-- Fix conversation_participants SELECT policy (infinite recursion)
DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;
CREATE POLICY "Users can view their participations"
ON public.conversation_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix conversations SELECT policy (was referencing conversation_participants.id instead of conversations.id)
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversation_participants
  WHERE conversation_participants.conversation_id = conversations.id
  AND conversation_participants.user_id = auth.uid()
));
