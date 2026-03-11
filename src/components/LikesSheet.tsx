import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LikeUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface LikesSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  likesCount: number;
}

const LikesSheet = ({ postId, isOpen, onClose, likesCount }: LikesSheetProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);
    const fetchData = async () => {
      const { data: likes } = await supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", postId);
      if (!likes || likes.length === 0) { setUsers([]); setLoading(false); return; }

      const uids = likes.map(l => l.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, is_verified")
        .in("user_id", uids);
      setUsers(profiles || []);

      // Check follow states for all users except current user
      const otherUids = uids.filter(id => id !== user.id);
      if (otherUids.length > 0) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", otherUids);
        const states: Record<string, boolean> = {};
        otherUids.forEach(id => { states[id] = (follows || []).some(f => f.following_id === id); });
        setFollowStates(states);
      }

      setLoading(false);
    };
    fetchData();
  }, [isOpen, postId, user]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    const was = followStates[targetId] || false;
    setFollowStates(prev => ({ ...prev, [targetId]: !was }));
    if (was) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-card border-t border-border max-h-[60vh] flex flex-col"
          >
            <div className="flex items-center justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <p className="text-center text-sm font-bold text-foreground pb-2">
              {likesCount} {likesCount === 1 ? "Like" : "Likes"}
            </p>
            <div className="flex-1 overflow-y-auto pb-8">
              {loading ? (
                <div className="space-y-0">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No likes yet</p>
              ) : (
                users.map((u) => (
                  <div key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-[40%] object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-[40%] bg-secondary">
                        <PuffyIcon name="user" size={20} />
                      </div>
                    )}
                    <span className="flex-1 min-w-0 font-bold text-foreground flex items-center gap-1 truncate">{u.username || "user"}{u.is_verified && <VerifiedBadge size={13} />}</span>
                    {user && u.user_id !== user.id ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFollow(u.user_id); }}
                        className={`shrink-0 flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          followStates[u.user_id]
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <PuffyIcon name={followStates[u.user_id] ? "check" : "plus"} size={14} className={followStates[u.user_id] ? "" : "!filter-none"} />
                        {followStates[u.user_id] ? "Following" : "Follow"}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LikesSheet;
