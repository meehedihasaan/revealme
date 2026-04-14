import { useState, useEffect, useRef } from "react";
import { MapPin, CalendarDays, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { ProfileShimmer, FeedShimmer } from "@/components/ShimmerLoader";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { useTaggedPosts } from "@/hooks/usePostTags";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ThoughtBubble from "@/components/ThoughtBubble";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import PullToRefresh from "@/components/PullToRefresh";


const STORY_GRADIENT = "gradient-story-ring";

const Profile = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { posts, loading, refetch } = usePosts(user?.id);
  const [activeTab, setActiveTab] = useState<"grid" | "clips" | "tagged">("grid");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [hasStory, setHasStory] = useState(false);
  const avatarLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarDidLongPress = useRef(false);
  const upload = useUploadProgress();
  const [clipPosts, setClipPosts] = useState<any[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since)
      .then(({ count }) => setHasStory((count || 0) > 0));
  }, [user]);

  // Fetch clips (reels) with view counts
  useEffect(() => {
    if (!user) return;
    setClipsLoading(true);
    const fetchClips = async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("post_type", "reel")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });
      const clips = data || [];
      if (clips.length > 0) {
        const postIds = clips.map(c => c.id);
        const { data: views } = await supabase.from("reel_views").select("post_id").in("post_id", postIds);
        const viewCounts: Record<string, number> = {};
        (views || []).forEach(v => { viewCounts[v.post_id] = (viewCounts[v.post_id] || 0) + 1; });
        setClipPosts(clips.map(c => ({ ...c, viewCount: viewCounts[c.id] || 0 })));
      } else {
        setClipPosts([]);
      }
      setClipsLoading(false);
    };
    fetchClips();
  }, [user]);

  const { postIds: taggedPostIds, loading: taggedLoading } = useTaggedPosts(user?.id);
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);

  useEffect(() => {
    if (taggedPostIds.length === 0) { setTaggedPosts([]); return; }
    const fetchTagged = async () => {
      const { data } = await supabase.from("posts").select("*").in("id", taggedPostIds);
      if (!data) { setTaggedPosts([]); return; }
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url, is_verified").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      setTaggedPosts(data.map(p => ({
        ...p,
        username: profileMap[p.user_id]?.username || "user",
        avatar_url: profileMap[p.user_id]?.avatar_url,
        is_verified: profileMap[p.user_id]?.is_verified || false,
        likesCount: 0,
        timeAgo: "",
        isLiked: false,
        isSaved: false,
      })));
    };
    fetchTagged();
  }, [taggedPostIds]);

  // Refetch posts when upload finishes
  useEffect(() => {
    if (!upload.isUploading && upload.progress === 100) {
      refetch();
    }
  }, [upload.isUploading, upload.progress]);

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url;

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id);
      const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    };
    fetchCounts();
  }, [user]);

  const joinDate = profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "";

  const headerRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const bottom = headerRef.current.getBoundingClientRect().bottom;
        setShowStickyHeader(bottom < 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ProfileShimmer />
        <BottomNav />
      </div>
    );
  }

  const handleRefresh = async () => {
    await refetch();
    if (user) {
      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id);
      const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky header - appears on scroll */}
      <AnimatePresence>
        {showStickyHeader && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border"
          >
            <div className="flex items-center justify-between px-4 py-2.5 mx-auto max-w-md">
              <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-foreground">
                <PuffyIcon name="arrow-left" size={20} />
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold leading-tight">{profile?.username || "reveal"}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{posts.length} Posts</span>
                </div>
              </button>
              <button onClick={() => navigate("/settings")}>
                <PuffyIcon name="settings" size={22} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between px-4 py-2">
        <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-foreground">
          <PuffyIcon name="arrow-left" size={20} />
          <span className="text-lg font-bold">{profile?.username || "reveal"}</span>
        </button>
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="settings" size={22} />
        </button>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
      {/* Banner */}
      {profile?.cover_url ? (
        <img src={profile.cover_url} alt="Banner" className="h-48 w-full object-cover" />
      ) : (
        <div className="h-48 w-full bg-secondary" />
      )}

      {/* Avatar + Info */}
      <div className="px-4">
        <div className="-mt-10 mb-3 relative inline-block">
          <div className="absolute -top-8 left-14 z-10">
            {user && <ThoughtBubble userId={user.id} isOwnProfile />}
          </div>
          <button
                onPointerDown={() => {
                  avatarDidLongPress.current = false;
                  avatarLongPressTimer.current = setTimeout(() => {
                    avatarDidLongPress.current = true;
                    if (avatarUrl) setShowAvatarModal(true);
                  }, 500);
                }}
                onPointerUp={() => {
                  if (avatarLongPressTimer.current) clearTimeout(avatarLongPressTimer.current);
                  if (!avatarDidLongPress.current) {
                    if (hasStory) {
                      navigate(`/story?user=${user?.id}`);
                    } else if (avatarUrl) {
                      setShowAvatarModal(true);
                    }
                  }
                }}
                onPointerCancel={() => {
                  if (avatarLongPressTimer.current) clearTimeout(avatarLongPressTimer.current);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`inline-block rounded-full p-[2.5px] ${hasStory ? STORY_GRADIENT : ""}`}
              >
                <div className={`rounded-full ${hasStory ? "border-[2.5px] border-background" : "border-4 border-background"} bg-background overflow-hidden`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-full object-cover block" draggable={false} />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                      <PuffyIcon name="user" size={32} />
                    </div>
                  )}
                </div>
              </button>
        </div>

        <div className="flex items-center gap-1.5">
          <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
          {profile?.is_verified && <VerifiedBadge size={20} />}
          {profile?.is_private && <Lock size={16} className="text-foreground" />}
        </div>
        {profile?.username && (
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        )}

        {/* Bio */}
        {profile?.bio && (
          <p className="mt-2 text-sm text-foreground leading-relaxed">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="mt-2 flex gap-6">
          <button onClick={() => navigate(`/followers?tab=followers&userId=${user?.id}`)}>
            <span className="font-bold text-foreground">{followersCount}</span>{" "}
            <span className="text-sm text-muted-foreground">Followers</span>
          </button>
          <button onClick={() => navigate(`/followers?tab=following&userId=${user?.id}`)}>
            <span className="font-bold text-foreground">{followingCount}</span>{" "}
            <span className="text-sm text-muted-foreground">Following</span>
          </button>
          <div>
            <span className="font-bold text-foreground">{posts.length}</span>{" "}
            <span className="text-sm text-muted-foreground">Posts</span>
          </div>
        </div>

        {/* Location & Join date */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {profile?.location && (
            <span className="flex items-center gap-1"><MapPin size={14} className="text-muted-foreground" /> {profile.location}</span>
          )}
          {joinDate && (
            <span className="flex items-center gap-1"><CalendarDays size={14} className="text-muted-foreground" /> Joined {joinDate}</span>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/edit-profile")}
          className="mt-4 w-full rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors"
        >
          Edit Profile
        </motion.button>
      </div>


      {/* Tabs */}
      <div className="mt-2 flex border-b border-border">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-foreground" : "opacity-50"}`}
        >
          <PuffyIcon name="grid" size={22} />
        </button>
        <button
          onClick={() => setActiveTab("clips")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "clips" ? "border-b-2 border-foreground" : "opacity-50"}`}
        >
          <PuffyIcon name="reels" size={22} />
        </button>
        <button
          onClick={() => setActiveTab("tagged")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "tagged" ? "border-b-2 border-foreground" : "opacity-50"}`}
        >
          <PuffyIcon name="user" size={22} />
        </button>
      </div>

      {/* Upload progress indicator */}
      <AnimatePresence>
        {upload.isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50">
              {upload.thumbnail ? (
                <img src={upload.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <PuffyIcon name="edit" size={16} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {upload.thumbnail
                    ? (upload.progress < 100 ? "Uploading..." : "Finishing up...")
                    : (upload.progress < 100 ? "Posting..." : "Finishing up...")}
                </p>
                {upload.thumbnail ? (
                  <div className="mt-1 h-1 w-full rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${upload.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                ) : (
                  <div className="mt-1 h-1 w-full rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary animate-pulse w-full" />
                  </div>
                )}
              </div>
              {upload.thumbnail && (
                <span className="text-[10px] text-muted-foreground font-medium">{Math.round(upload.progress)}%</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts as cards */}
      {activeTab === "grid" ? (
        loading ? (
          <FeedShimmer />
        ) : posts.filter(p => p.post_type !== "reel").length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PuffyIcon name="camera" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">No posts yet</p>
            <button onClick={() => navigate("/create-post")} className="mt-3 text-sm font-semibold text-primary">
              Create your first post
            </button>
          </div>
        ) : (
          <div className="mt-2">
            {posts.filter(p => p.post_type !== "reel").map((post) => (
              <PostCard
                key={post.id}
                postId={post.id}
                postUserId={post.user_id}
                username={post.username}
                displayName={post.display_name}
                avatar={post.avatar_url || ""}
                image={post.image_url}
                caption={post.caption}
                likesCount={post.likesCount}
                timeAgo={post.timeAgo}
                verified={post.is_verified}
                location={post.location}
                isLiked={post.isLiked}
                isSaved={post.isSaved}
                onDelete={refetch}
                postType={post.post_type}
                hasStory={hasStory && post.user_id === user?.id}
              />
            ))}
          </div>
        )
      ) : activeTab === "clips" ? (
        clipsLoading ? (
          <FeedShimmer />
        ) : clipPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PuffyIcon name="reels" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">No clips yet</p>
            <button onClick={() => navigate("/create-reel")} className="mt-3 text-sm font-semibold text-primary">
              Create your first clip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {clipPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => navigate(`/reels`)}
                className="relative aspect-[9/16] overflow-hidden bg-secondary"
              >
                {post.image_url?.match(/\.(mp4|mov|webm|ogg)(\?|$)/i) ? (
                  <video src={post.image_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={post.image_url!} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1">
                  <PuffyIcon name="reels" size={10} className="!brightness-0 !invert opacity-80" />
                  <span className="text-white text-[10px] font-semibold">{(post as any).viewCount || 0}</span>
                </div>
              </button>
            ))}
          </div>
        )
      ) : taggedLoading ? (
        <FeedShimmer />
      ) : taggedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No tagged posts yet</p>
        </div>
      ) : (
        <div className="mt-2">
          {taggedPosts.map((post: any) => (
            <PostCard
              key={post.id}
              postId={post.id}
              postUserId={post.user_id}
              username={post.username}
              avatar={post.avatar_url || ""}
              image={post.image_url}
              caption={post.caption}
              likesCount={post.likesCount || 0}
              timeAgo={post.timeAgo || ""}
              verified={post.is_verified || false}
              location={post.location}
              isLiked={post.isLiked || false}
              isSaved={post.isSaved || false}
            />
          ))}
        </div>
      )}


      {/* Avatar full-screen viewer */}
      <AnimatePresence>
        {showAvatarModal && avatarUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setShowAvatarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain"
              />
              <button
                onClick={() => setShowAvatarModal(false)}
                className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
              >
                <span className="text-lg font-bold">✕</span>
              </button>
              <p className="mt-3 text-center text-sm font-semibold text-white">{displayName}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default Profile;
