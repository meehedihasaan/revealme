import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface StoryItem {
  id: string;
  image_url: string;
  created_at: string;
}

interface StoryGroup {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  stories: StoryItem[];
}

interface ViewerInfo {
  user_id: string;
  username: string;
  avatar_url: string | null;
  viewed_at: string;
}

const STORY_DURATION = 5000; // 5 seconds per story
const TICK = 50;

const StoryViewer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const startUserId = searchParams.get("user");

  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showStoryMenu, setShowStoryMenu] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  // Fetch all story groups
  useEffect(() => {
    const fetchAllStories = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: storiesData } = await supabase
        .from("stories")
        .select("id, image_url, created_at, user_id")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (!storiesData || storiesData.length === 0) { navigate(-1); return; }

      const userIds = [...new Set(storiesData.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      // Get viewed story IDs
      let viewedIds = new Set<string>();
      if (user) {
        const { data: viewsData } = await supabase
          .from("story_views")
          .select("story_id")
          .eq("viewer_id", user.id);
        viewedIds = new Set((viewsData || []).map(v => v.story_id));
      }
      viewedRef.current = viewedIds;

      const groupMap: Record<string, StoryGroup> = {};
      for (const s of storiesData) {
        if (!groupMap[s.user_id]) {
          groupMap[s.user_id] = {
            user_id: s.user_id,
            username: profileMap[s.user_id]?.username || "user",
            avatar_url: profileMap[s.user_id]?.avatar_url || null,
            stories: [],
          };
        }
        groupMap[s.user_id].stories.push({ id: s.id, image_url: s.image_url, created_at: s.created_at });
      }

      // Order: startUser first, then others (unseen first)
      const allGroups = Object.values(groupMap);
      let ordered: StoryGroup[];
      if (startUserId) {
        const startGroup = allGroups.find(g => g.user_id === startUserId);
        const rest = allGroups.filter(g => g.user_id !== startUserId);
        ordered = startGroup ? [startGroup, ...rest] : rest;
      } else {
        ordered = allGroups;
      }

      setGroups(ordered);

      // Find first unseen story in the start group
      if (ordered.length > 0) {
        const firstGroup = ordered[0];
        const unseenIdx = firstGroup.stories.findIndex(s => !viewedIds.has(s.id));
        setStoryIndex(unseenIdx >= 0 ? unseenIdx : 0);
      }

      setLoaded(true);
    };
    fetchAllStories();
  }, [startUserId, user]);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Mark story as seen
  const markSeen = useCallback(async (storyId: string) => {
    if (!user || viewedRef.current.has(storyId) || !currentGroup || currentGroup.user_id === user.id) return;
    viewedRef.current.add(storyId);
    await supabase.from("story_views").insert({ story_id: storyId, viewer_id: user.id }).then(() => {});
  }, [user, currentGroup]);

  // Timer
  useEffect(() => {
    if (!loaded || !currentStory || !imageLoaded || paused || showViewers) return;

    // Mark as seen when story starts
    markSeen(currentStory.id);

    timerRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + (TICK / STORY_DURATION) * 100;
        if (next >= 100) {
          // Auto-advance
          if (storyIndex < currentGroup!.stories.length - 1) {
            setStoryIndex(i => i + 1);
            setImageLoaded(false);
            return 0;
          } else if (groupIndex < groups.length - 1) {
            setDirection(1);
            setGroupIndex(i => i + 1);
            setStoryIndex(0);
            setImageLoaded(false);
            return 0;
          } else {
            navigate(-1);
            return 100;
          }
        }
        return next;
      });
    }, TICK);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loaded, currentStory?.id, imageLoaded, paused, showViewers, storyIndex, groupIndex, groups.length]);

  // Reset progress on story change
  useEffect(() => {
    setProgress(0);
  }, [storyIndex, groupIndex]);

  const goNext = () => {
    if (storyIndex < (currentGroup?.stories.length || 0) - 1) {
      setStoryIndex(i => i + 1);
      setImageLoaded(false);
    } else if (groupIndex < groups.length - 1) {
      setDirection(1);
      setGroupIndex(i => i + 1);
      setStoryIndex(0);
      setImageLoaded(false);
    } else {
      navigate(-1);
    }
  };

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
      setImageLoaded(false);
    } else if (groupIndex > 0) {
      setDirection(-1);
      setGroupIndex(i => i - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(0);
      setImageLoaded(false);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    if (showViewers) return;
    const x = e.clientX;
    const mid = window.innerWidth / 2;
    if (x < mid) goPrev();
    else goNext();
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.velocity.y) > 300 && info.offset.y > 50) {
      navigate(-1);
      return;
    }
    if (Math.abs(info.offset.x) > 60) {
      if (info.offset.x < 0) goNext();
      else goPrev();
    }
  };

  // Long press to pause
  const handlePointerDown = () => setPaused(true);
  const handlePointerUp = () => setPaused(false);

  // Fetch viewers for own stories
  const fetchViewers = async () => {
    if (!currentStory || !user || currentGroup?.user_id !== user.id) return;
    setViewersLoading(true);
    setShowViewers(true);

    // Get all story IDs for this group
    const storyIds = currentGroup.stories.map(s => s.id);
    const { data } = await supabase
      .from("story_views")
      .select("viewer_id, created_at, story_id")
      .in("story_id", storyIds)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const viewerIds = [...new Set(data.map(v => v.viewer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", viewerIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      // Deduplicate by viewer_id, keep most recent
      const seenMap = new Map<string, ViewerInfo>();
      for (const v of data) {
        if (!seenMap.has(v.viewer_id)) {
          seenMap.set(v.viewer_id, {
            user_id: v.viewer_id,
            username: profileMap[v.viewer_id]?.username || "user",
            avatar_url: profileMap[v.viewer_id]?.avatar_url || null,
            viewed_at: v.created_at,
          });
        }
      }
      setViewers([...seenMap.values()]);
    } else {
      setViewers([]);
    }
    setViewersLoading(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !currentGroup || sendingReply) return;
    setSendingReply(true);
    setPaused(true);
    try {
      const { data: convId } = await supabase.rpc("create_direct_conversation", {
        other_user_id: currentGroup.user_id,
      });
      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: user.id,
          text: `Replied to your story: ${replyText.trim()}`,
          mood: "Casual",
        });
        toast.success("Reply sent!");
        setReplyText("");
        setReplyFocused(false);
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
      setPaused(false);
    }
  };

  const handleHeartReact = async () => {
    if (!user || !currentGroup || hearted) return;
    setHearted(true);
    setShowHeartAnim(true);
    setPaused(true);
    setTimeout(() => { setShowHeartAnim(false); setPaused(false); }, 1200);
    try {
      const { data: convId } = await supabase.rpc("create_direct_conversation", {
        other_user_id: currentGroup.user_id,
      });
      if (convId) {
        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: user.id,
          text: "❤️ Reacted to your story",
          mood: "Love",
        });
      }
  } catch {}
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !user || !currentGroup || currentGroup.user_id !== user.id) return;
    setShowStoryMenu(false);
    try {
      await supabase.from("stories").delete().eq("id", currentStory.id);
      toast.success("Story deleted");
      // If more stories in group, go next; otherwise go back
      if (currentGroup.stories.length > 1) {
        const newStories = currentGroup.stories.filter(s => s.id !== currentStory.id);
        setGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, stories: newStories } : g));
        setStoryIndex(Math.min(storyIndex, newStories.length - 1));
        setImageLoaded(false);
      } else {
        navigate(-1);
      }
    } catch {
      toast.error("Failed to delete story");
    }
    setPaused(false);
  };

  if (!loaded || !currentGroup || !currentStory) return null;

  const isOwn = user?.id === currentGroup.user_id;
  const timeAgo = formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: false });

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${groupIndex}-${storyIndex}`}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 80 : direction < 0 ? -80 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="absolute inset-0"
          onClick={handleTap}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          {/* Story image */}
          <img
            src={currentStory.image_url}
            alt="Story"
            className="h-full w-full object-contain"
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />

          {/* Gradient overlays */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-[3px] px-2 pt-2">
        {currentGroup.stories.map((_, i) => (
          <div key={i} className="h-[2.5px] flex-1 rounded-full bg-white/30 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{
                width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(isOwn ? "/profile" : `/user/${currentGroup.user_id}`);
          }}
          className="flex items-center gap-2.5"
        >
          {currentGroup.avatar_url ? (
            <img src={currentGroup.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover ring-2 ring-white/30" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-2 ring-white/30">
              <PuffyIcon name="user" size={16} className="invert" />
            </div>
          )}
          <div>
            <span className="text-sm font-semibold text-white drop-shadow">{currentGroup.username}</span>
            <span className="ml-2 text-xs text-white/60 drop-shadow">{timeAgo}</span>
          </div>
        </button>
        <div className="flex-1" />
        {paused && (
          <span className="text-[10px] text-white/50 uppercase tracking-wider mr-2">Paused</span>
        )}
        {/* 3-dot menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowStoryMenu(!showStoryMenu); setPaused(true); }}
            className="p-1"
          >
            <PuffyIcon name="more-horizontal" size={22} className="invert" />
          </button>
          <AnimatePresence>
            {showStoryMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 top-10 z-50 min-w-[160px] rounded-xl shadow-xl overflow-hidden"
                style={{ backgroundColor: "rgba(30,30,30,0.95)", borderColor: "rgba(255,255,255,0.15)", borderWidth: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                {isOwn && (
                  <button
                    onClick={handleDeleteStory}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-white/10"
                    style={{ color: "#ef4444" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                    Delete Story
                  </button>
                )}
                <button
                  onClick={() => { setShowStoryMenu(false); setPaused(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(-1); }}
          className="p-1"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Heart animation overlay */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: [0, 1.4, 1] }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <span className="text-7xl drop-shadow-lg">❤️</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: Viewers (for own stories) or reply area */}
      {isOwn ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8">
          <button
            onClick={(e) => { e.stopPropagation(); fetchViewers(); }}
            className="flex items-center justify-center gap-2 w-full py-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            <span className="text-sm text-white font-medium drop-shadow">
              {viewedRef.current.size > 0 ? `Viewed` : "No views yet"}
            </span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}
              className="flex-1"
            >
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => { setReplyFocused(true); setPaused(true); }}
                onBlur={() => { if (!replyText) { setReplyFocused(false); setPaused(false); } }}
                placeholder="Send message..."
                className="w-full rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/50"
              />
            </form>
            {replyFocused && replyText.trim() ? (
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="p-1"
              >
                <PuffyIcon name="send" size={22} className="invert" />
              </button>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => { e.stopPropagation(); handleHeartReact(); }}
                  className="p-1"
                >
                  <PuffyIcon name={hearted ? "heart-filled" : "heart"} size={24} className="invert" />
                </motion.button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/messages`); }}
                  className="p-1"
                >
                  <PuffyIcon name="send" size={22} className="invert" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Viewers sheet */}
      <AnimatePresence>
        {showViewers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setShowViewers(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md rounded-t-3xl bg-card max-h-[55vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h3 className="font-bold text-foreground">Viewers</h3>
                <span className="text-sm text-muted-foreground">{viewers.length}</span>
              </div>
              <div className="overflow-y-auto flex-1 pb-8">
                {viewersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : viewers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <PuffyIcon name="user" size={32} className="opacity-30 mb-2" />
                    <p className="text-sm">No viewers yet</p>
                  </div>
                ) : (
                  viewers.map(v => (
                    <button
                      key={v.user_id}
                      onClick={() => { setShowViewers(false); navigate(`/user/${v.user_id}`); }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-secondary/50"
                    >
                      {v.avatar_url ? (
                        <img src={v.avatar_url} className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                          <PuffyIcon name="user" size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{v.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StoryViewer;
