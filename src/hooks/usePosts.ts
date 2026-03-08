import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export interface PostWithDetails {
  id: string;
  image_url: string;
  caption: string;
  location: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  timeAgo: string;
}

export const usePosts = (filterUserId?: string) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (filterUserId) query = query.eq("user_id", filterUserId);
    const { data: postsData } = await query;
    if (!postsData || postsData.length === 0) { setPosts([]); setLoading(false); return; }

    // Get all unique user ids
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Get likes counts
    const postIds = postsData.map(p => p.id);
    const { data: likesData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
    const likesCount: Record<string, number> = {};
    (likesData || []).forEach(l => { likesCount[l.post_id] = (likesCount[l.post_id] || 0) + 1; });

    // Get user's likes
    let userLikes: Set<string> = new Set();
    let userSaves: Set<string> = new Set();
    if (user) {
      const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      userLikes = new Set((myLikes || []).map(l => l.post_id));
      const { data: mySaves } = await supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      userSaves = new Set((mySaves || []).map(s => s.post_id));
    }

    setPosts(postsData.map(p => ({
      id: p.id,
      image_url: p.image_url,
      caption: p.caption || "",
      location: p.location || "",
      created_at: p.created_at,
      user_id: p.user_id,
      username: profileMap[p.user_id]?.username || "user",
      avatar_url: profileMap[p.user_id]?.avatar_url || null,
      likesCount: likesCount[p.id] || 0,
      isLiked: userLikes.has(p.id),
      isSaved: userSaves.has(p.id),
      timeAgo: formatDistanceToNow(new Date(p.created_at), { addSuffix: true }),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [user, filterUserId]);

  return { posts, loading, refetch: fetchPosts };
};
