import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { formatDistanceToNow } from "date-fns";

export interface PostWithDetails {
  id: string;
  image_url: string;
  caption: string;
  location: string;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_private: boolean;
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  timeAgo: string;
}

export const usePosts = (filterUserId?: string) => {
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (filterUserId) query = query.eq("user_id", filterUserId);
    const { data: postsData } = await query;
    if (!postsData || postsData.length === 0) { setPosts([]); setLoading(false); return; }

    // Filter out blocked users' posts
    const filteredPosts = postsData.filter(p => !blockedIds.has(p.user_id));
    if (filteredPosts.length === 0) { setPosts([]); setLoading(false); return; }

    const userIds = [...new Set(filteredPosts.map(p => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url, is_verified, is_private").in("user_id", userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    const postIds = filteredPosts.map(p => p.id);
    const { data: likesData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
    const likesCount: Record<string, number> = {};
    (likesData || []).forEach(l => { likesCount[l.post_id] = (likesCount[l.post_id] || 0) + 1; });

    let userLikes: Set<string> = new Set();
    let userSaves: Set<string> = new Set();
    if (user) {
      const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      userLikes = new Set((myLikes || []).map(l => l.post_id));
      const { data: mySaves } = await supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      userSaves = new Set((mySaves || []).map(s => s.post_id));
    }

    // Get who the user follows (for private profile filtering)
    let followingSet = new Set<string>();
    if (user) {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
      followingSet = new Set((follows || []).map(f => f.following_id));
    }

    const allPosts = filteredPosts.map(p => ({
      id: p.id,
      image_url: p.image_url,
      caption: p.caption || "",
      location: p.location || "",
      created_at: p.created_at,
      user_id: p.user_id,
      username: profileMap[p.user_id]?.username || "user",
      avatar_url: profileMap[p.user_id]?.avatar_url || null,
      is_verified: profileMap[p.user_id]?.is_verified || false,
      is_private: profileMap[p.user_id]?.is_private || false,
      likesCount: likesCount[p.id] || 0,
      isLiked: userLikes.has(p.id),
      isSaved: userSaves.has(p.id),
      timeAgo: formatDistanceToNow(new Date(p.created_at), { addSuffix: true }),
    }));

    // Filter out private profiles' posts unless it's your own or you follow them
    const visiblePosts = allPosts.filter(p => {
      if (p.user_id === user?.id) return true;
      if (p.is_private && !followingSet.has(p.user_id)) return false;
      return true;
    });

    setPosts(visiblePosts);
    setLoading(false);
  }, [user, filterUserId, blockedIds]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    const onFocus = () => { fetchPosts(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
};
