CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  found_conversation_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF other_user_id IS NULL OR other_user_id = current_user_id THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  SELECT cp1.conversation_id
  INTO found_conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = other_user_id
  LIMIT 1;

  IF found_conversation_id IS NOT NULL THEN
    RETURN found_conversation_id;
  END IF;

  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO found_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (found_conversation_id, current_user_id),
    (found_conversation_id, other_user_id);

  RETURN found_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(UUID) TO authenticated;