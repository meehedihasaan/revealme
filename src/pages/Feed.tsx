import { useState, useEffect, useCallback } from "react";
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


const STORY_GRADIENT = "gradient-story-ring";

interface StoryUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  hasSeen: boolean;
}

const tabs = ["For you", "Following", "Favourites"];

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

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("pull-to-refresh", handler);
    return () => window.removeEventListener("pull-to-refresh", handler);
  }, [refetch]);

  useEffect(() => {
    const fetchStories = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("id, user_id")
        .gte("created_at", since);
      if (!data) return;

      // Get viewed story IDs
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

      // Only show stories from users the current user follows
      const otherIds = uniqueIds.filter(id => id !== user?.id && followingIds.has(id));
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", otherIds);

        // For each user, check if ALL their stories are seen
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-reveal text-2xl text-foreground">Reveal.</h1>
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
      <div className="flex gap-2 px-4 pb-3">
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

      <PullToRefresh onRefresh={handleRefresh}>
        {/* Stories */}
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
          {/* Your story */}
          <div className="flex shrink-0 flex-col items-center gap-1 relative">
            <button
              onClick={() => userHasStory ? navigate(`/story?user=${user?.id}`) : navigate("/create-story")}
            >
            <div className={`rounded-[22px] p-[2.5px] ${userHasStory ? STORY_GRADIENT : ""}`}>
                <div className="rounded-[19px] border-[2.5px] border-background overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="You" className="h-[64px] w-[64px] rounded-[17px] object-cover block" />
                  ) : (
                    <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[17px] bg-secondary">
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
              <div className={`rounded-[22px] p-[2.5px] ${su.hasSeen ? "bg-muted-foreground/30" : STORY_GRADIENT}`}>
                <div className="rounded-[19px] border-[2.5px] border-background overflow-hidden">
                  {su.avatar_url ? (
                    <img src={su.avatar_url} alt={su.username} className="h-[64px] w-[64px] rounded-[17px] object-cover block" />
                  ) : (
                    <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[17px] bg-secondary">
                      <PuffyIcon name="user" size={28} />
                    </div>
                  )}
                </div>
              </div>
              <span className="max-w-[72px] truncate text-xs text-foreground">{su.username}</span>
            </button>
          ))}
        </div>

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
              forYouPosts.map((post) => (
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
                  showFollowButton={post.user_id !== user?.id && !followingIds.has(post.user_id)}
                  isFollowing={followingIds.has(post.user_id)}
                  onFollowChange={handleFollowChange}
                />
              ))
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
              followingPosts.map((post) => (
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
                />
              ))
            )
          )}
          {activeTab === "Favourites" && (
            isDataLoading ? (
              <FeedShimmer />
            ) : savedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <PuffyIcon name="bookmark" size={48} className="opacity-30 mb-3" />
                <p className="text-sm">Your saved posts will appear here</p>
              </div>
            ) : (
              savedPosts.map((post) => (
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
                />
              ))
            )
          )}
        </div>
      </PullToRefresh>

      <BottomNav />
    </div>
  );
};

export default Feed;
