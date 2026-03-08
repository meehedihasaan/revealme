import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

import bannerImg from "@/assets/profile-banner.jpg";

interface UserData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_private: boolean;
  created_at: string;
}

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { posts, loading } = usePosts(userId);
  const [profile, setProfile] = useState<UserData | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grid" | "tagged">("grid");

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
        .select("user_id, username, display_name, avatar_url, bio, location, is_private, created_at")
        .eq("user_id", userId)
        .single();
      setProfile(prof);

      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId);
      const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);

      if (user) {
        const { data: follow } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .maybeSingle();
        setIsFollowing(!!follow);
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
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);
    if (myConvs) {
      for (const mc of myConvs) {
        const { data: other } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", mc.conversation_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (other) { navigate(`/chat/${mc.conversation_id}`); return; }
      }
    }
    const { data: conv } = await supabase.from("conversations").insert({}).select("id").single();
    if (!conv) return;
    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: userId },
    ]);
    navigate(`/chat/${conv.id}`);
  };

  const displayName = profile?.display_name || profile?.username || "User";
  const joinDate = profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "";

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="h-12 flex items-center px-4">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-48 w-full bg-muted animate-pulse" />
        <div className="px-4 space-y-3 mt-4">
          <div className="h-20 w-20 rounded-xl bg-muted animate-pulse -mt-10" />
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="flex gap-6">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="flex gap-3 mt-4">
            <div className="h-10 flex-1 rounded-lg bg-muted animate-pulse" />
            <div className="h-10 flex-1 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
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
      <div className="flex items-center gap-3 px-4 py-2">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <PuffyIcon name="arrow-left" size={20} />
        </button>
        <span className="text-lg font-bold text-foreground">{profile.username || "user"}</span>
      </div>

      {/* Banner */}
      <img src={bannerImg} alt="Banner" className="h-48 w-full object-cover" />

      {/* Avatar + Info */}
      <div className="px-4">
        <div className="-mt-10 mb-3">
          <div className="inline-block rounded-2xl border-4 border-background bg-background overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-secondary">
                <PuffyIcon name="user" size={32} />
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
        {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}

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
            {isFollowing ? "Following" : "Follow"}
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
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => (
              <img key={post.id} src={post.image_url} alt="" className="aspect-square w-full object-cover" />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No tagged posts yet</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default UserProfile;
