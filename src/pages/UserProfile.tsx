import { useState, useEffect, useRef } from "react";
import { MapPin, CalendarDays, Lock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VerifiedBadge from "@/components/VerifiedBadge";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileShimmer } from "@/components/ShimmerLoader";
import { usePosts } from "@/hooks/usePosts";
import { useTaggedPosts } from "@/hooks/usePostTags";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import ThoughtBubble from "@/components/ThoughtBubble";

const STORY_GRADIENT = "gradient-story-ring";

interface UserData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
}

const ProfileMenuItem = ({ icon, label, onClick, destructive = false }: {
  icon: string; label: string; onClick: () => void; destructive?: boolean;
}) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors active:bg-secondary/50"
  >
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${destructive ? "bg-destructive/10" : "bg-secondary"}`}>
      <PuffyIcon name={icon} size={18} />
    </div>
    <span className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
  </motion.button>
);

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { posts, loading } = usePosts(userId);
  const [profile, setProfile] = useState<UserData | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsBack, setFollowsBack] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "tagged">("grid");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [hasStory, setHasStory] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatarLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarDidLongPress = useRef(false);
  const { postIds: taggedPostIds, loading: taggedLoading } = useTaggedPosts(userId);

  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!userId || !user) return;
    const checkStory = async () => {
      // Only show story ring if current user follows this user
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      if (!followData) { setHasStory(false); return; }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);
      setHasStory((count || 0) > 0);
    };
    checkStory();
  }, [userId, user, isFollowing]);

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

  // Check block status
  useEffect(() => {
    if (!user || !userId) return;
    supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .maybeSingle()
      .then(({ data }) => setIsBlocked(!!data));
  }, [user, userId]);

  useEffect(() => {
    if (userId && user && userId === user.id) {
      navigate("/profile", { replace: true });
    }
  }, [userId, user]);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      setProfileLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, cover_url, bio, location, is_private, is_verified, created_at")
        .eq("user_id", userId)
        .single();
      setProfile(prof);

      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId);
      const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);

      if (user) {
        const [{ data: follow }, { data: followBack }] = await Promise.all([
          supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle(),
          supabase.from("follows").select("id").eq("follower_id", userId).eq("following_id", user.id).maybeSingle(),
        ]);
        setIsFollowing(!!follow);
        setFollowsBack(!!followBack);
      }
      setProfileLoading(false);
    };
    fetchData();
  }, [userId, user]);

  const toggleFollow = async () => {
    if (!user || !userId) return;
    const was = isFollowing;
    setIsFollowing(!was);
    setFollowersCount(c => was ? c - 1 : c + 1);
    if (was) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    }
  };

  const startConversation = async () => {
    if (!user || !userId) return;

    const { data: conversationId, error } = await supabase.rpc("create_direct_conversation", {
      other_user_id: userId,
    });

    if (error || !conversationId) {
      console.error("Failed to start conversation", error);
      return;
    }

    navigate(`/chat/${conversationId}`);
  };

  const handleBlock = async () => {
    if (!user || !userId) return;
    if (isBlocked) {
      await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
      setIsBlocked(false);
      toast.success("User unblocked");
    } else {
      await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: userId });
      setIsBlocked(true);
      // Also unfollow
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
        setIsFollowing(false);
        setFollowersCount(c => c - 1);
      }
      toast.success("User blocked");
    }
    setMenuOpen(false);
  };

  const handleReport = () => {
    toast.success("Report submitted. We'll review it shortly.");
    setMenuOpen(false);
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/user/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName}'s profile`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied!");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied!");
    }
    setMenuOpen(false);
  };

  const handleCopyProfileUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/user/${userId}`);
    toast.success("Profile link copied!");
    setMenuOpen(false);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
    setMenuOpen(false);
  };

  const displayName = profile?.display_name || profile?.username || "User";
  const joinDate = profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "";

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ProfileShimmer />
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
        <p className="text-muted-foreground text-sm">User not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary text-sm font-semibold">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <PuffyIcon name="arrow-left" size={20} />
          </button>
          <span className="text-lg font-bold text-foreground">{profile.username || "user"}</span>
        </div>
        <button onClick={() => setMenuOpen(true)} className="text-foreground p-1">
          <PuffyIcon name="more-horizontal" size={22} />
        </button>
      </div>

      {/* Three dot menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-card border-t border-border"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
              </div>

              {/* User info */}
              <div className="flex items-center gap-3 px-5 pb-4 border-b border-border/50">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                    <PuffyIcon name="user" size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-foreground text-sm">{displayName}</span>
                    {profile.is_verified && <VerifiedBadge size={14} />}
                  </div>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <ProfileMenuItem icon="send" label="Share this profile" onClick={handleShareProfile} />
                <ProfileMenuItem icon="copy" label="Copy profile URL" onClick={handleCopyProfileUrl} />
                <ProfileMenuItem icon="bell" label={isMuted ? "Unmute notifications" : "Mute notifications"} onClick={handleToggleMute} />
                <div className="h-px bg-border/50 mx-5 my-1" />
                <ProfileMenuItem icon="shield" label={isBlocked ? "Unblock this user" : "Block this user"} onClick={handleBlock} destructive={!isBlocked} />
                <ProfileMenuItem icon="info" label="Report this user" onClick={handleReport} destructive />
              </div>

              <div className="px-5 pt-1 pb-5 safe-bottom">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-2xl bg-secondary py-3.5 text-sm font-bold text-secondary-foreground"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Banner */}
      {profile.cover_url ? (
        <img src={profile.cover_url} alt="Banner" className="h-48 w-full object-cover" />
      ) : (
        <div className="h-48 w-full bg-secondary" />
      )}

      {/* Avatar + Info */}
      <div className="px-4">
        <div className="-mt-10 mb-3 relative inline-block">
          <div className="absolute -top-8 left-14 z-10">
            {userId && <ThoughtBubble userId={userId} />}
          </div>
          <button
                onPointerDown={() => {
                   avatarDidLongPress.current = false;
                  avatarLongPressTimer.current = setTimeout(() => {
                    avatarDidLongPress.current = true;
                    if (profile.avatar_url) setShowAvatarModal(true);
                  }, 500);
                }}
                onPointerUp={() => {
                  if (avatarLongPressTimer.current) clearTimeout(avatarLongPressTimer.current);
                  if (!avatarDidLongPress.current) {
                    if (hasStory) {
                      navigate(`/story?user=${profile.user_id}`);
                    } else if (profile.avatar_url) {
                      setShowAvatarModal(true);
                    }
                  }
                }}
                onPointerCancel={() => {
                  if (avatarLongPressTimer.current) clearTimeout(avatarLongPressTimer.current);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`inline-block rounded-[40%] p-[2.5px] ${hasStory ? STORY_GRADIENT : ""}`}
              >
                <div className={`rounded-[40%] ${hasStory ? "border-[2.5px] border-background" : "border-4 border-background"} bg-background overflow-hidden`}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="h-20 w-20 rounded-[40%] object-cover block" draggable={false} />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-[40%] bg-secondary">
                      <PuffyIcon name="user" size={32} />
                    </div>
                  )}
                </div>
              </button>
        </div>

        <div className="flex items-center gap-1.5">
          <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
          {profile.is_verified && <VerifiedBadge size={20} />}
          {profile.is_private && <Lock size={16} className="text-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          {followsBack && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Follows you
            </span>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-2 text-sm text-foreground leading-relaxed">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="mt-2 flex gap-6">
          <button onClick={() => navigate(`/followers?tab=followers&userId=${userId}`)}>
            <span className="font-bold text-foreground">{followersCount}</span>{" "}
            <span className="text-sm text-muted-foreground">Followers</span>
          </button>
          <button onClick={() => navigate(`/followers?tab=following&userId=${userId}`)}>
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
          {profile.location && (
            <span className="flex items-center gap-1"><MapPin size={14} className="text-muted-foreground" /> {profile.location}</span>
          )}
          {joinDate && (
            <span className="flex items-center gap-1"><CalendarDays size={14} className="text-muted-foreground" /> Joined {joinDate}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={toggleFollow}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              isFollowing ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {isFollowing ? "Following" : followsBack ? "Follow back" : "Follow"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startConversation}
            className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground"
          >
            Message
          </motion.button>
        </div>
      </div>

      {/* Private profile gate */}
      {profile.is_private && !isFollowing ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
            <PuffyIcon name="shield" size={32} />
          </div>
          <p className="text-base font-bold text-foreground mb-1">This account is private</p>
          <p className="text-sm text-center max-w-[250px]">Follow this account to see their photos and posts.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-4 flex border-b border-border">
            <button
              onClick={() => setActiveTab("grid")}
              className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-foreground" : "opacity-50"}`}
            >
              <PuffyIcon name="grid" size={22} />
            </button>
            <button
              onClick={() => setActiveTab("tagged")}
              className={`flex-1 py-3 flex justify-center ${activeTab === "tagged" ? "border-b-2 border-foreground" : "opacity-50"}`}
            >
              <PuffyIcon name="user" size={22} />
            </button>
          </div>

          {/* Posts */}
          {activeTab === "grid" ? (
            loading ? (
              <div className="mt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="aspect-square w-full bg-muted animate-pulse mb-2" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <PuffyIcon name="camera" size={48} className="opacity-30 mb-3" />
                <p className="text-sm">No posts yet</p>
              </div>
            ) : (
              <div className="mt-2">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    postId={post.id}
                    postUserId={post.user_id}
                    username={post.username}
                    avatar={post.avatar_url || ""}
                    image={post.image_url}
                    caption={post.caption}
                    likesCount={post.likesCount}
                    timeAgo={post.timeAgo}
                    verified={post.is_verified}
                    location={post.location}
                    isLiked={post.isLiked}
                    isSaved={post.isSaved}
                  />
                ))}
              </div>
            )
          ) : taggedLoading ? (
            <div className="mt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-square w-full bg-muted animate-pulse mb-2" />
              ))}
            </div>
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
        </>
      )}


      {/* Avatar full-screen viewer */}
      <AnimatePresence>
        {showAvatarModal && profile.avatar_url && (
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
                src={profile.avatar_url}
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

      <BottomNav />
    </div>
  );
};

export default UserProfile;
