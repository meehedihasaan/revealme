import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TagOnPost {
  user_id: string;
  username: string;
  avatar_url: string | null;
  x_position: number;
  y_position: number;
}

export const usePostTags = (postId: string) => {
  const [tags, setTags] = useState<TagOnPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase
      .from("post_tags")
      .select("tagged_user_id, x_position, y_position")
      .eq("post_id", postId);

    if (!data || data.length === 0) { setTags([]); setLoading(false); return; }

    const userIds = data.map(t => t.tagged_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    setTags(data.map(t => ({
      user_id: t.tagged_user_id,
      username: profileMap[t.tagged_user_id]?.username || "user",
      avatar_url: profileMap[t.tagged_user_id]?.avatar_url || null,
      x_position: Number(t.x_position),
      y_position: Number(t.y_position),
    })));
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  return { tags, loading };
};

export const useTaggedPosts = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  const [postIds, setPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("post_tags")
        .select("post_id")
        .eq("tagged_user_id", targetId);
      setPostIds((data || []).map(d => d.post_id));
      setLoading(false);
    };
    fetch();
  }, [targetId]);

  return { postIds, loading };
};
