import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Music } from "lucide-react";
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
  isFollowing: boolean;
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

const W = "!brightness-0 !invert";

const isVideoUrl = (url: string) => /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url);

const ReelItem = ({
  reel,
  index,
  isActive,
  isMuted,
  onToggleMute,
  onDoubleTap,
  onToggleLike,
  onComment,
  onShare,
  onFollow,
  navigate,
  userId,
}: {
  reel: ReelPost;
  index: number;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onDoubleTap: (index: number) => void;
  onToggleLike: (reel: ReelPost) => void;
  onComment: (index: number) => void;
  onShare: (index: number) => void;
  onFollow: (reel: ReelPost) => void;
  navigate: ReturnType<typeof useNavigate>;
  userId?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = isVideoUrl(reel.image_url);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
      setIsPaused(false);
    } else {
      vid.pause();
    }
  }, [isActive]);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) vid.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isActive) return;
    const update = () => {
      if (vid.duration) setProgress((vid.currentTime / vid.duration) * 100);
    };
    vid.addEventListener("timeupdate", update);
    return () => vid.removeEventListener("timeupdate", update);
  }, [isActive]);

  const handleTap = () => {
    onDoubleTap(index);
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPaused(false);
    } else {
      vid.pause();
      setIsPaused(true);
    }
  };

  const audioName = `Original audio · ${reel.username}`;
  const isOwnReel = reel.user_id === userId;

  return (
    <div
      data-index={index}
      className="relative h-full w-full snap-start snap-always shrink-0"
      onClick={handleTap}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={reel.image_url}
          className="h-full w-full object-cover"
          loop
          playsInline
          muted={isMuted}
          draggable={false}
        />
      ) : (
        <img src={reel.image_url} alt="" className="h-full w-full object-cover" draggable={false} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

      {/* Video progress bar - at bottom above nav */}
      {isVideo && isActive && (
        <div className="absolute bottom-[3.5rem] left-0 right-0 h-[2.5px] bg-white/20 z-30">
          <div className="h-full bg-white transition-all duration-100 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Pause indicator */}
      <AnimatePresence>
        {isPaused && isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <PuffyIcon name="play" size={28} className={W} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute/Unmute button */}
      {isVideo && isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="absolute top-14 right-4 z-30 h-8 w-8 rounded-full bg-black/40 flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX size={16} className="text-white" />
          ) : (
            <Volume2 size={16} className="text-white" />
          )}
        </button>
      )}

      {/* Play/Pause tap area */}
      {isVideo && isActive && (
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 z-10"
          style={{ background: "transparent" }}
        />
      )}

      {/* Right side actions */}
      <div className="absolute right-3 bottom-[4.5rem] flex flex-col items-center gap-5 z-20">
        {/* Avatar with follow badge */}
        <div className="relative mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(isOwnReel ? "/profile" : `/user/${reel.user_id}`);
            }}
          >
            {reel.avatar_url ? (
              <img src={reel.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover border-2 border-white" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                <PuffyIcon name="user" size={18} className={W} />
              </div>
            )}
          </button>
          {/* Follow button under avatar */}
          {!isOwnReel && !reel.isFollowing && (
            <button
              onClick={(e) => { e.stopPropagation(); onFollow(reel); }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-accent flex items-center justify-center border border-white"
            >
              <span className="text-white text-xs font-bold leading-none">+</span>
            </button>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleLike(reel); }} className="flex flex-col items-center gap-1">
          {reel.isLiked ? (
            <PuffyIcon name="heart-filled-red" size={28} />
          ) : (
            <PuffyIcon name="heart" size={28} className={W} />
          )}
          <span className="text-white text-xs font-semibold">{reel.likesCount}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onComment(index); }} className="flex flex-col items-center gap-1">
          <PuffyIcon name="message-circle" size={28} className={W} />
          <span className="text-white text-xs font-semibold">{reel.commentsCount}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onShare(index); }} className="flex flex-col items-center gap-1">
          <PuffyIcon name="send" size={26} className={W} />
        </button>
        <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
          <PuffyIcon name="more-horizontal" size={26} className={W} />
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-16 left-0 right-16 px-4 z-20 pb-1">
        <div className="flex items-center gap-1.5 mb-2">
          <PuffyIcon name="eye" size={14} className={`${W} opacity-80`} />
          <span className="text-white/80 text-xs font-medium">{reel.viewCount}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(isOwnReel ? "/profile" : `/user/${reel.user_id}`);
            }}
            className="flex items-center gap-2"
          >
            <span className="text-white font-bold text-sm">{reel.username}</span>
            {reel.is_verified && <VerifiedBadge size={14} />}
          </button>
          {!isOwnReel && !reel.isFollowing && (
            <button
              onClick={(e) => { e.stopPropagation(); onFollow(reel); }}
              className="rounded-md bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm"
            >
              Follow
            </button>
          )}
        </div>
        {reel.caption && (
          <button
            onClick={(e) => { e.stopPropagation(); setCaptionExpanded(!captionExpanded); }}
            className="text-left"
          >
            <p className={`text-white text-sm leading-snug ${captionExpanded ? "" : "line-clamp-1"}`}>
              {reel.caption}
            </p>
          </button>
        )}
        {/* Audio - tappable with marquee & spinning disc */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/sound/${reel.id}`);
          }}
          className="flex items-center gap-1.5 mt-1.5 max-w-full overflow-hidden"
        >
          <Music size={12} className={`text-white/70 shrink-0 ${isActive ? "animate-spin-slow" : ""}`} />
          <div className="overflow-hidden whitespace-nowrap">
            <span className="text-white/70 text-xs inline-block animate-marquee">{audioName}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

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
  const [isMuted, setIsMuted] = useState(true);
  const lastTapTime = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedReels = useRef(new Set<string>());

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

    const [{ data: profiles }, { data: likesData }, { data: commentsData }, { data: viewsData }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, avatar_url, is_verified").in("user_id", userIds),
      supabase.from("likes").select("post_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      supabase.from("reel_views").select("post_id").in("post_id", postIds),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    const likesCount: Record<string, number> = {};
    (likesData || []).forEach((l) => { likesCount[l.post_id] = (likesCount[l.post_id] || 0) + 1; });
    const commentsCount: Record<string, number> = {};
    (commentsData || []).forEach((c) => { commentsCount[c.post_id] = (commentsCount[c.post_id] || 0) + 1; });
    const viewsCounts: Record<string, number> = {};
    (viewsData || []).forEach((v) => { viewsCounts[v.post_id] = (viewsCounts[v.post_id] || 0) + 1; });

    let userLikes = new Set<string>();
    let userFollowing = new Set<string>();
    if (user?.id) {
      const [{ data: myLikes }, { data: myFollows }] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", userIds),
      ]);
      userLikes = new Set((myLikes || []).map((l) => l.post_id));
      userFollowing = new Set((myFollows || []).map((f) => f.following_id));
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
        viewCount: viewsCounts[p.id] || 0,
        isFollowing: userFollowing.has(p.user_id),
      }))
    );
    setLoading(false);
  }, [blockedIds, user?.id]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  // Record view when reel becomes active
  useEffect(() => {
    if (!user || reels.length === 0) return;
    const reel = reels[currentIndex];
    if (!reel || viewedReels.current.has(reel.id)) return;
    viewedReels.current.add(reel.id);

    supabase.from("reel_views").upsert(
      { post_id: reel.id, viewer_id: user.id },
      { onConflict: "post_id,viewer_id" }
    ).then(() => {});

    setReels((prev) =>
      prev.map((r) => r.id === reel.id ? { ...r, viewCount: r.viewCount + 1 } : r)
    );
  }, [currentIndex, user, reels.length]);

  // Realtime view count subscription
  useEffect(() => {
    if (reels.length === 0) return;
    const channel = supabase
      .channel("reel-views-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "reel_views",
      }, (payload) => {
        const postId = (payload.new as any).post_id;
        setReels((prev) =>
          prev.map((r) => r.id === postId ? { ...r, viewCount: r.viewCount + 1 } : r)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [reels.length]);

  const toggleLike = useCallback(async (reel: ReelPost) => {
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
  }, [user]);

  const toggleFollow = useCallback(async (reel: ReelPost) => {
    if (!user) return;
    const wasFollowing = reel.isFollowing;
    // Optimistic update for ALL reels from this user
    setReels((prev) =>
      prev.map((r) =>
        r.user_id === reel.user_id ? { ...r, isFollowing: !wasFollowing } : r
      )
    );
    if (wasFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", reel.user_id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: reel.user_id });
    }
  }, [user]);

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
  }, [reels, toggleLike]);

  // Snap scroll observer
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
        <button onClick={() => navigate("/create-reel")} className="active:opacity-60">
          <PuffyIcon name="camera" size={22} className={W} />
        </button>
      </div>

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {reels.map((reel, index) => (
          <ReelItem
            key={reel.id}
            reel={reel}
            index={index}
            isActive={currentIndex === index}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            onDoubleTap={handleDoubleTap}
            onToggleLike={toggleLike}
            onFollow={toggleFollow}
            onComment={(i) => { setCurrentIndex(i); setCommentOpen(true); }}
            onShare={(i) => { setCurrentIndex(i); setShareOpen(true); }}
            navigate={navigate}
            userId={user?.id}
          />
        ))}
      </div>

      {/* Double tap heart overlay */}
      <AnimatePresence>
        {showHeart && <DoubleTapHeart />}
      </AnimatePresence>

      <CommentSheet postId={reels[currentIndex]?.id} isOpen={commentOpen} onClose={() => setCommentOpen(false)} />
      <ShareSheet postId={reels[currentIndex]?.id} image={reels[currentIndex]?.image_url} caption={reels[currentIndex]?.caption} username={reels[currentIndex]?.username} isOpen={shareOpen} onClose={() => setShareOpen(false)} />

      <BottomNav darkMode />
    </div>
  );
};

export default Reels;
