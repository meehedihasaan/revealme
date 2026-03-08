import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    if (!user) { setBlockedIds(new Set()); setLoading(false); return; }
    const { data } = await supabase.rpc("get_all_blocked_ids", { p_user_id: user.id });
    const ids = new Set<string>((data || []).map((r: any) => r.blocked_user_id));
    setBlockedIds(ids);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  return { blockedIds, loading, refetch: fetchBlocked };
};
