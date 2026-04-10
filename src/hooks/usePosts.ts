import { useEffect, useState, useCallback, useRef } from "react";
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
  post_type: string;
}

export const usePosts = (filterUserId?: string) => {
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const fetchPosts = useCallback(async () => {
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }

    let query = supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (filterUserId) query = query.eq("user_id", filterUserId);

    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      hasLoadedOnce.current = true;
      setLoading(false);
      return;
    }

    const filteredPosts = postsData.filter((post) => !blockedIds.has(post.user_id));
    if (filteredPosts.length === 0) {
      setPosts([]);
      hasLoadedOnce.current = true;
      setLoading(false);
      return;
    }

    const userIds = [...new Set(filteredPosts.map((post) => post.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, is_verified, is_private")
      .in("user_id", userIds);

    const profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.user_id, profile]));

    const postIds = filteredPosts.map((post) => post.id);
    const { data: likesData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
    const likesCount: Record<string, number> = {};
    (likesData || []).forEach((like) => {
      likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
    });

    let userLikes = new Set<string>();
    let userSaves = new Set<string>();

    if (user?.id) {
      const { data: myLikes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      userLikes = new Set((myLikes || []).map((like) => like.post_id));

      const { data: mySaves } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      userSaves = new Set((mySaves || []).map((saved) => saved.post_id));
    }

    let followingSet = new Set<string>();
    if (user?.id) {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      followingSet = new Set((follows || []).map((follow) => follow.following_id));
    }

    const allPosts = filteredPosts.map((post) => ({
      id: post.id,
      image_url: post.image_url,
      caption: post.caption || "",
      location: post.location || "",
      created_at: post.created_at,
      user_id: post.user_id,
      username: profileMap[post.user_id]?.username || "user",
      display_name: profileMap[post.user_id]?.display_name || profileMap[post.user_id]?.username || "User",
      avatar_url: profileMap[post.user_id]?.avatar_url || null,
      is_verified: profileMap[post.user_id]?.is_verified || false,
      is_private: profileMap[post.user_id]?.is_private || false,
      likesCount: likesCount[post.id] || 0,
      isLiked: userLikes.has(post.id),
      isSaved: userSaves.has(post.id),
      timeAgo: formatDistanceToNow(new Date(post.created_at), { addSuffix: true }),
      post_type: (post as any).post_type || "post",
    }));

    const visiblePosts = allPosts.filter((post) => {
      if (post.user_id === user?.id) return true;
      if (post.is_private && !followingSet.has(post.user_id)) return false;
      return true;
    });

    setPosts(visiblePosts);
    hasLoadedOnce.current = true;
    setLoading(false);
  }, [blockedIds, filterUserId, user?.id]);

  useEffect(() => {
    hasLoadedOnce.current = false;
    setPosts([]);
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchPosts();
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
};
