import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import heartAnimation from "@/assets/heart-animation.json";
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

const DoubleTapHeart = () => (
  <motion.div
    className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.6 } }}
  >
    <Lottie animationData={heartAnimation} loop={false} autoplay style={{ width: 200, height: 200 }} />
  </motion.div>
);

const W = "!brightness-0 !invert"; // force white for puffy icons on dark bg

const Reels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapTime = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = useCallback(async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("post_type", "reel")
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

  useEffect(() => { fetchReels(); }, [fetchReels]);

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

  const handleDoubleTap = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      const reel = reels[index];
      if (reel && !reel.isLiked) toggleLike(reel);
      setShowHeart(true);
      setCurrentIndex(index);
      setTimeout(() => setShowHeart(false), 1000);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  }, [reels, user]);

  // Snap scroll observer to detect current reel
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setCurrentIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const items = container.querySelectorAll("[data-index]");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [reels]);

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
        <PuffyIcon name="camera" size={48} className={`mb-3 opacity-30 ${W}`} />
        <p className="text-sm">No clips yet</p>
        <BottomNav darkMode />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3 pb-2 safe-top">
        <h1 className="text-white text-lg font-bold">Clips</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/create-reel")} className="active:opacity-60">
            <PuffyIcon name="camera" size={22} className={W} />
          </button>
          <button onClick={() => navigate("/create-reel")} className="active:opacity-60">
            <PuffyIcon name="plus" size={22} className={W} />
          </button>
          <button onClick={() => navigate("/messages")} className="active:opacity-60">
            <PuffyIcon name="message-circle" size={22} className={W} />
          </button>
        </div>
      </div>

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            data-index={index}
            className="relative h-full w-full snap-start snap-always shrink-0"
            onClick={() => handleDoubleTap(index)}
          >
            {/* Image */}
            <img src={reel.image_url} alt="" className="h-full w-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

            {/* Double tap heart */}
            <AnimatePresence>
              {showHeart && currentIndex === index && <DoubleTapHeart />}
            </AnimatePresence>

            {/* Right side actions */}
            <div className="absolute right-3 bottom-[4.5rem] flex flex-col items-center gap-5 z-20">
              {/* Like */}
              <button onClick={(e) => { e.stopPropagation(); toggleLike(reel); }} className="flex flex-col items-center gap-1">
                {reel.isLiked ? (
                  <PuffyIcon name="heart-filled-red" size={28} />
                ) : (
                  <PuffyIcon name="heart" size={28} className={W} />
                )}
                <span className="text-white text-xs font-semibold">{reel.likesCount}</span>
              </button>

              {/* Comment */}
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); setCommentOpen(true); }} className="flex flex-col items-center gap-1">
                <PuffyIcon name="message-circle" size={28} className={W} />
                <span className="text-white text-xs font-semibold">{reel.commentsCount}</span>
              </button>

              {/* Share */}
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); setShareOpen(true); }} className="flex flex-col items-center gap-1">
                <PuffyIcon name="send" size={26} className={W} />
              </button>

              {/* More */}
              <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
                <PuffyIcon name="more-horizontal" size={26} className={W} />
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-16 left-0 right-16 px-4 z-20 pb-1">
              {/* View count */}
              <div className="flex items-center gap-1.5 mb-2">
                <PuffyIcon name="eye" size={14} className={`${W} opacity-80`} />
                <span className="text-white/80 text-xs font-medium">{reel.viewCount}</span>
              </div>

              {/* User info */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(reel.user_id === user?.id ? "/profile" : `/user/${reel.user_id}`);
                }}
                className="flex items-center gap-2 mb-2"
              >
                {reel.avatar_url ? (
                  <img src={reel.avatar_url} alt="" className="h-9 w-9 rounded-[40%] object-cover border border-white/30" />
                ) : (
                  <div className="h-9 w-9 rounded-[40%] bg-white/20 flex items-center justify-center">
                    <PuffyIcon name="user" size={16} className={W} />
                  </div>
                )}
                <span className="text-white font-bold text-sm">{reel.username}</span>
                {reel.is_verified && <VerifiedBadge size={14} />}
              </button>

              {/* Caption */}
              {reel.caption && (
                <p className="text-white text-sm leading-snug line-clamp-2">{reel.caption}</p>
              )}

              {/* Audio */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <PuffyIcon name="volume-2" size={12} className={`${W} opacity-70`} />
                <span className="text-white/70 text-xs">Audio name · audio creator</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CommentSheet postId={reels[currentIndex]?.id} isOpen={commentOpen} onClose={() => setCommentOpen(false)} />
      <ShareSheet postId={reels[currentIndex]?.id} image={reels[currentIndex]?.image_url} caption={reels[currentIndex]?.caption} username={reels[currentIndex]?.username} isOpen={shareOpen} onClose={() => setShareOpen(false)} />

      <BottomNav darkMode />
    </div>
  );
};

export default Reels;
