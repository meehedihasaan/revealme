
CREATE OR REPLACE FUNCTION public.get_all_blocked_ids(p_user_id uuid)
RETURNS TABLE(blocked_user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Users I blocked
  SELECT blocked_id AS blocked_user_id FROM blocked_users WHERE blocker_id = p_user_id
  UNION
  -- Users who blocked me
  SELECT blocker_id AS blocked_user_id FROM blocked_users WHERE blocked_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_blocked_ids(uuid) TO authenticated;
