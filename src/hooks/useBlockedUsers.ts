import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setBlockedIds(new Set()); setLoading(false); return; }
    const [{ data: blocked }, { data: blockedBy }] = await Promise.all([
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
      supabase.from("blocked_users").select("blocker_id").eq("blocked_id", user.id),
    ]);
    const ids = new Set<string>();
    (blocked || []).forEach(b => ids.add(b.blocked_id));
    (blockedBy || []).forEach(b => ids.add(b.blocker_id));
    setBlockedIds(ids);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { blockedIds, loading, refetch: fetch };
};
