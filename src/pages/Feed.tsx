import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import PullToRefresh from "@/components/PullToRefresh";
import { FeedShimmer } from "@/components/ShimmerLoader";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { supabase } from "@/integrations/supabase/client";
import cameraIcon from "@/assets/icons/camera.png";
import PeopleYouMayKnow from "@/components/PeopleYouMayKnow";

const STORY_GRADIENT = "gradient-story-ring";

interface StoryUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  hasSeen: boolean;
}

const tabs = ["For you", "Following"];

// Highlight Clips component for feed
const HighlightClips = () => {
  const navigate = useNavigate();
  const [clips, setClips] = useState<any[]>([]);

  useEffect(() => {
    const fetchClips = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, user_id, caption")
        .eq("post_type", "reel")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (!data || data.length === 0) return;
      
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      
      setClips(data.map(p => ({
        ...p,
        username: profileMap[p.user_id]?.username || "user",
        avatar_url: profileMap[p.user_id]?.avatar_url || null,
      })));
    };
    fetchClips();
  }, []);

  if (clips.length === 0) return null;

  return (
    <div className="py-3 border-b border-border">
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-sm font-bold text-foreground">Clips</h3>
        <button onClick={() => navigate("/reels")} className="text-xs font-semibold text-primary">
          See all
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {clips.map((clip) => {
          const isVideo = clip.image_url?.match(/\.(mp4|mov|webm|ogg)(\?|$)/i);
          return (
            <button
              key={clip.id}
              onClick={() => navigate("/reels")}
              className="relative shrink-0 w-[100px] aspect-[9/16] rounded-xl overflow-hidden bg-secondary"
            >
              {isVideo ? (
                <video src={clip.image_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={clip.image_url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 right-1.5">
                <div className="flex items-center gap-1">
                  {clip.avatar_url ? (
                    <img src={clip.avatar_url} alt="" className="h-4 w-4 avatar-leaf object-cover border border-white/50" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center">
                      <PuffyIcon name="user" size={8} className="!brightness-0 !invert" />
                    </div>
                  )}
                  <span className="text-white text-[9px] font-semibold truncate">{clip.username}</span>
                </div>
              </div>
              <div className="absolute top-1.5 right-1.5">
                <PuffyIcon name="reels" size={12} className="!brightness-0 !invert opacity-80" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Feed = () => {
  const [activeTab, setActiveTab] = useState("For you");
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { posts, loading, refetch } = usePosts();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [userHasStory, setUserHasStory] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingLoading, setFollowingLoading] = useState(true);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const knownPostIds = useRef<Set<string>>(new Set());

  // Fetch who the current user follows
  const fetchFollowing = useCallback(async () => {
    if (!user) { setFollowingLoading(false); return; }
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    setFollowingIds(new Set((data || []).map(f => f.following_id)));
    setFollowingLoading(false);
  }, [user]);

  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (!participations || participations.length === 0) { setUnreadMsgCount(0); return; }
      const convIds = participations.map(p => p.conversation_id);
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .eq("read", false);
      setUnreadMsgCount(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Track known post IDs to detect new posts via realtime
  useEffect(() => {
    posts.forEach(p => knownPostIds.current.add(p.id));
  }, [posts]);

  // Realtime: detect new posts but don't auto-refetch — show button instead
  useEffect(() => {
    const channel = supabase
      .channel("feed-new-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const newId = (payload.new as any)?.id;
        const newUserId = (payload.new as any)?.user_id;
        if (!newId || knownPostIds.current.has(newId)) return;
        if (newUserId === user?.id) return; // ignore own posts
        knownPostIds.current.add(newId);
        setNewPostsCount((c) => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("pull-to-refresh", handler);
    return () => window.removeEventListener("pull-to-refresh", handler);
  }, [refetch]);

  const handleLoadNewPosts = useCallback(async () => {
    setNewPostsCount(0);
    await refetch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [refetch]);

  useEffect(() => {
    const fetchStories = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("id, user_id")
        .gte("created_at", since);
      if (!data) return;

      let viewedIds = new Set<string>();
      if (user) {
        const { data: views } = await supabase
          .from("story_views")
          .select("story_id")
          .eq("viewer_id", user.id);
        viewedIds = new Set((views || []).map(v => v.story_id));
      }

      const uniqueIds = [...new Set(data.map(s => s.user_id))];
      if (user && uniqueIds.includes(user.id)) setUserHasStory(true);

      const otherIds = uniqueIds.filter(id => id !== user?.id && followingIds.has(id));
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", otherIds);

        const userStories: Record<string, string[]> = {};
        for (const s of data) {
          if (!userStories[s.user_id]) userStories[s.user_id] = [];
          userStories[s.user_id].push(s.id);
        }

        setStoryUsers((profiles || []).map(p => ({
          ...p,
          hasSeen: (userStories[p.user_id] || []).every(sid => viewedIds.has(sid)),
        })));
      }
    };
    fetchStories();
  }, [user, followingIds]);

  // Derived post lists
  const followingPosts = posts.filter(p => followingIds.has(p.user_id));
  const forYouPosts = posts;
  const savedPosts = posts.filter(p => p.isSaved);

  const handleRefresh = async () => {
    await Promise.all([refetch(), fetchFollowing()]);
  };

  const handleFollowChange = (userId: string, isNowFollowing: boolean) => {
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isNowFollowing) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const isDataLoading = loading || followingLoading;

  // Clips never appear in the feed — only posts
  const renderPostsWithClips = (postList: typeof posts, showFollow = false) =>
    postList.map((post) => (
      <PostCard
        key={post.id}
        postId={post.id}
        postUserId={post.user_id}
        username={post.username}
        displayName={post.display_name}
        avatar={post.avatar_url || ""}
        verified={post.is_verified}
        image={post.image_url}
        caption={post.caption}
        likesCount={post.likesCount}
        timeAgo={post.timeAgo}
        location={post.location}
        isLiked={post.isLiked}
        isSaved={post.isSaved}
        onDelete={refetch}
        showFollowButton={showFollow && post.user_id !== user?.id && !followingIds.has(post.user_id)}
        isFollowing={followingIds.has(post.user_id)}
        onFollowChange={handleFollowChange}
        hasStory={storyUsers.some((su) => su.user_id === post.user_id) || (post.user_id === user?.id && userHasStory)}
        postType={post.post_type}
        viewCount={post.viewCount}
        level={post.authorLevel}
      />
    ));


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - mobile only */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <button onClick={() => navigate("/create-post")} className="text-foreground">
          <PuffyIcon name="plus" size={24} />
        </button>
        <h1 className="text-reveal text-2xl text-foreground">Revealme.</h1>
        <div className="flex items-center gap-3">
          <button className="relative text-foreground" onClick={() => navigate("/messages")}>
            <PuffyIcon name="message-circle" size={24} />
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-3 bg-background pt-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* New posts available pill */}
      <AnimatePresence>
        {newPostsCount > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 md:top-28 z-30 flex justify-center px-4 pb-2"
          >
            <button
              onClick={handleLoadNewPosts}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
            >
              <ArrowUp size={14} />
              {newPostsCount} new {newPostsCount === 1 ? "post" : "posts"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PullToRefresh onRefresh={handleRefresh}>
        {/* Stories */}
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
          <div className="flex shrink-0 flex-col items-center gap-1 relative">
            <button
              onClick={() => userHasStory ? navigate(`/story?user=${user?.id}`) : navigate("/create-story")}
            >
            <div className={`avatar-leaf-ring p-[2.5px] ${userHasStory ? STORY_GRADIENT : ""}`}>
                <div className="avatar-leaf border-[2.5px] border-background overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="You" className="h-[64px] w-[64px] avatar-leaf object-cover block" />
                  ) : (
                    <div className="flex h-[64px] w-[64px] items-center justify-center avatar-leaf bg-secondary">
                      <PuffyIcon name="user" size={28} />
                    </div>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/create-story"); }}
              className="absolute bottom-5 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary border-2 border-background text-primary-foreground z-10"
            >
              <img src={cameraIcon} alt="camera" width={11} height={11} className="brightness-0 invert" draggable={false} />
            </button>
            <span className="max-w-[72px] truncate text-xs text-foreground">Your story</span>
          </div>

          {storyUsers.map((su) => (
            <button
              key={su.user_id}
              onClick={() => navigate(`/story?user=${su.user_id}`)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <div className={`avatar-leaf-ring p-[2.5px] ${su.hasSeen ? "bg-muted-foreground/30" : STORY_GRADIENT}`}>
                <div className="avatar-leaf border-[2.5px] border-background overflow-hidden">
                  {su.avatar_url ? (
                    <img src={su.avatar_url} alt={su.username} className="h-[64px] w-[64px] avatar-leaf object-cover block" />
                  ) : (
                    <div className="flex h-[64px] w-[64px] items-center justify-center avatar-leaf bg-secondary">
                      <PuffyIcon name="user" size={28} />
                    </div>
                  )}
                </div>
              </div>
              <span className="max-w-[72px] truncate text-xs text-foreground">{su.username}</span>
            </button>
          ))}
        </div>

        {/* People you may know */}
        {activeTab === "For you" && !isDataLoading && <PeopleYouMayKnow />}

        {/* Posts */}
        <div>
          {activeTab === "For you" && (
            isDataLoading ? (
              <FeedShimmer />
            ) : forYouPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <PuffyIcon name="camera" size={48} className="opacity-30 mb-3" />
                <p className="text-sm">No posts yet. Be the first!</p>
              </div>
            ) : (
              renderPostsWithClips(forYouPosts, true)
            )
          )}
          {activeTab === "Following" && (
            isDataLoading ? (
              <FeedShimmer />
            ) : followingPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <PuffyIcon name="heart" size={48} className="opacity-30 mb-3" />
                <p className="text-sm">Posts from people you follow will appear here</p>
                <button onClick={() => navigate("/following")} className="mt-3 text-sm font-semibold text-primary">
                  Discover people to follow
                </button>
              </div>
            ) : (
              renderPostsWithClips(followingPosts)
            )
          )}
        </div>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default Feed;
