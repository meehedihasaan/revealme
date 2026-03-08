-- Function to get other participants in user's conversations
CREATE OR REPLACE FUNCTION public.get_conversation_other_participants(p_user_id UUID)
RETURNS TABLE(conversation_id UUID, other_user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp2.conversation_id, cp2.user_id AS other_user_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
    AND cp2.user_id != cp1.user_id
  WHERE cp1.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_other_participants(UUID) TO authenticated;

-- Function to get participants for a single conversation
CREATE OR REPLACE FUNCTION public.get_conversation_partner(p_conversation_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.user_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id != auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_partner(UUID) TO authenticated;