import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, PanInfo } from "framer-motion";
import { Heart, MessageCircle, Send, MoreHorizontal, Eye, Music, Camera, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import VerifiedBadge from "@/components/VerifiedBadge";
import BottomNav from "@/components/BottomNav";
import CommentSheet from "@/components/CommentSheet";
import ShareSheet from "@/components/ShareSheet";
import PuffyIcon from "@/components/PuffyIcon";

interface ReelPost {
  id: string;
  image_url: string;
  caption: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  viewCount: number;
}

const Reels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isAnimating = useRef(false);
  const dragY = useRef(0);

  const fetchReels = useCallback(async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setReels([]);
      setLoading(false);
      return;
    }

    const filtered = postsData.filter((p) => !blockedIds.has(p.user_id));
    const userIds = [...new Set(filtered.map((p) => p.user_id))];
    const postIds = filtered.map((p) => p.id);

    const [{ data: profiles }, { data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, avatar_url, is_verified").in("user_id", userIds),
      supabase.from("likes").select("post_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    const likesCount: Record<string, number> = {};
    (likesData || []).forEach((l) => { likesCount[l.post_id] = (likesCount[l.post_id] || 0) + 1; });
    const commentsCount: Record<string, number> = {};
    (commentsData || []).forEach((c) => { commentsCount[c.post_id] = (commentsCount[c.post_id] || 0) + 1; });

    let userLikes = new Set<string>();
    if (user?.id) {
      const { data: myLikes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      userLikes = new Set((myLikes || []).map((l) => l.post_id));
    }

    setReels(
      filtered.map((p) => ({
        id: p.id,
        image_url: p.image_url!,
        caption: p.caption || "",
        user_id: p.user_id,
        username: profileMap[p.user_id]?.username || "user",
        display_name: profileMap[p.user_id]?.display_name || profileMap[p.user_id]?.username || "User",
        avatar_url: profileMap[p.user_id]?.avatar_url || null,
        is_verified: profileMap[p.user_id]?.is_verified || false,
        likesCount: likesCount[p.id] || 0,
        commentsCount: commentsCount[p.id] || 0,
        isLiked: userLikes.has(p.id),
        viewCount: Math.floor(Math.random() * 900) + 100,
      }))
    );
    setLoading(false);
  }, [blockedIds, user?.id]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const toggleLike = async (reel: ReelPost) => {
    if (!user) return;
    setReels((prev) =>
      prev.map((r) =>
        r.id === reel.id
          ? { ...r, isLiked: !r.isLiked, likesCount: r.isLiked ? r.likesCount - 1 : r.likesCount + 1 }
          : r
      )
    );
    if (reel.isLiked) {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", reel.id);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: reel.id });
    }
  };

  const goTo = (direction: "next" | "prev") => {
    if (isAnimating.current) return;
    if (direction === "next" && currentIndex >= reels.length - 1) return;
    if (direction === "prev" && currentIndex <= 0) return;
    isAnimating.current = true;
    setCurrentIndex((i) => direction === "next" ? i + 1 : i - 1);
    setTimeout(() => { isAnimating.current = false; }, 400);
  };

  // Touch-based swipe handling (no framer drag to avoid re-render issues)
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 60) goTo("next");
    else if (diff < -60) goTo("prev");
  };

  const currentReel = reels[currentIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white/60 pb-20">
        <PuffyIcon name="camera" size={48} className="mb-3 opacity-30 brightness-0 invert" />
        <p className="text-sm">No clips yet</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3 pb-2 safe-top">
        <h1 className="text-white text-xl font-bold">Clips</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/create-post")} className="text-white">
            <Camera size={22} />
          </button>
          <button onClick={() => navigate("/create-post")} className="text-white">
            <Plus size={22} />
          </button>
          <button onClick={() => navigate("/messages")} className="text-white">
            <MessageCircle size={22} />
          </button>
        </div>
      </div>

      {/* Current Reel */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0"
      >
        {/* Image */}
        <img
          src={currentReel.image_url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
      </motion.div>

      {/* Right side actions — outside motion div to prevent flicker */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-6 z-20">
        {/* Like */}
        <button onClick={() => toggleLike(currentReel)} className="flex flex-col items-center gap-1">
          <Heart
            size={28}
            className={currentReel.isLiked ? "text-red-500 fill-red-500" : "text-white"}
          />
          <span className="text-white text-xs font-semibold">{currentReel.likesCount}</span>
        </button>

        {/* Comment */}
        <button onClick={() => setCommentOpen(true)} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} className="text-white" />
          <span className="text-white text-xs font-semibold">{currentReel.commentsCount}</span>
        </button>

        {/* Share */}
        <button onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1">
          <Send size={26} className="text-white" />
        </button>

        {/* More */}
        <button className="flex flex-col items-center gap-1">
          <MoreHorizontal size={26} className="text-white" />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-24 left-0 right-16 px-4 z-20">
        {/* View count */}
        <div className="flex items-center gap-1.5 mb-2">
          <Eye size={14} className="text-white/80" />
          <span className="text-white/80 text-xs font-medium">{currentReel.viewCount}</span>
        </div>

        {/* User info */}
        <button
          onClick={() => navigate(currentReel.user_id === user?.id ? "/profile" : `/user/${currentReel.user_id}`)}
          className="flex items-center gap-2 mb-2"
        >
          {currentReel.avatar_url ? (
            <img src={currentReel.avatar_url} alt="" className="h-9 w-9 rounded-[40%] object-cover border border-white/30" />
          ) : (
            <div className="h-9 w-9 rounded-[40%] bg-white/20 flex items-center justify-center">
              <PuffyIcon name="user" size={16} className="brightness-0 invert" />
            </div>
          )}
          <span className="text-white font-bold text-sm">{currentReel.username}</span>
          {currentReel.is_verified && <VerifiedBadge size={14} />}
        </button>

        {/* Caption */}
        {currentReel.caption && (
          <p className="text-white text-sm leading-snug line-clamp-2">{currentReel.caption}</p>
        )}

        {/* Audio placeholder */}
        <div className="flex items-center gap-1.5 mt-2">
          <Music size={12} className="text-white/70" />
          <span className="text-white/70 text-xs">Audio name · audio creator</span>
        </div>
      </div>

      {/* Comment sheet */}
      <CommentSheet
        postId={currentReel.id}
        isOpen={commentOpen}
        onClose={() => setCommentOpen(false)}
      />

      {/* Share sheet */}
      <ShareSheet
        postId={currentReel.id}
        image={currentReel.image_url}
        caption={currentReel.caption}
        username={currentReel.username}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <BottomNav />
    </div>
  );
};

export default Reels;
