import { useState, useEffect } from "react";
import { MapPin, CalendarDays, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/PostCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { ProfileShimmer } from "@/components/ShimmerLoader";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { useTaggedPosts } from "@/hooks/usePostTags";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import bannerImg from "@/assets/profile-banner.jpg";

const Profile = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { posts, loading } = usePosts(user?.id);
  const [activeTab, setActiveTab] = useState<"grid" | "tagged">("grid");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const { postIds: taggedPostIds, loading: taggedLoading } = useTaggedPosts(user?.id);
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);

  useEffect(() => {
    if (taggedPostIds.length === 0) { setTaggedPosts([]); return; }
    const fetchTagged = async () => {
      const { data } = await supabase.from("posts").select("id, image_url").in("id", taggedPostIds);
      setTaggedPosts(data || []);
    };
    fetchTagged();
  }, [taggedPostIds]);

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

  if (!profile || loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ProfileShimmer />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-foreground">
          <PuffyIcon name="arrow-left" size={20} />
          <span className="text-lg font-bold">{profile?.username || "reveal"}</span>
        </button>
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="settings" size={22} />
        </button>
      </div>

      {/* Banner */}
      <img src={profile?.cover_url || bannerImg} alt="Banner" className="h-48 w-full object-cover" />

      {/* Avatar + Info */}
      <div className="px-4">
        <div className="-mt-10 mb-3">
          <div className="inline-block rounded-full border-4 border-background bg-background overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <PuffyIcon name="user" size={32} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
          {profile?.is_verified && <VerifiedBadge size={20} />}
          {profile?.is_private && <Lock size={16} className="text-muted-foreground" />}
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

      {/* Grid */}
      {activeTab === "grid" ? (
        loading ? (
          <div className="grid grid-cols-3 gap-0.5 mt-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square w-full bg-muted animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PuffyIcon name="camera" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">No posts yet</p>
            <button onClick={() => navigate("/create-post")} className="mt-3 text-sm font-semibold text-primary">
              Create your first post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post, idx) => (
              <button key={post.id} onClick={() => setSelectedPostIndex(idx)}>
                <img src={post.image_url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )
      ) : taggedLoading ? (
        <div className="grid grid-cols-3 gap-0.5 mt-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square w-full bg-muted animate-pulse" />
          ))}
        </div>
      ) : taggedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No tagged posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {taggedPosts.map((post) => (
            <img key={post.id} src={post.image_url} alt="" className="aspect-square w-full object-cover" />
          ))}
        </div>
      )}

      {/* Full-screen post viewer */}
      <AnimatePresence>
        {selectedPostIndex !== null && posts[selectedPostIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border sticky top-0 bg-background z-10">
              <button onClick={() => setSelectedPostIndex(null)}>
                <PuffyIcon name="arrow-left" size={22} />
              </button>
              <span className="text-lg font-bold text-foreground">Posts</span>
            </div>
            <div className="pb-16">
              {posts.slice(selectedPostIndex).map((post) => (
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
                  onDelete={() => { setSelectedPostIndex(null); }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Profile;
