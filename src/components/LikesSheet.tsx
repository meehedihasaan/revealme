import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";

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
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const fetch = async () => {
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
      setLoading(false);
    };
    fetch();
  }, [isOpen, postId]);

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
                      <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                        <PuffyIcon name="user" size={20} />
                      </div>
                    )}
                    <span className="font-bold text-foreground flex items-center gap-1">{u.username || "user"}{u.is_verified && <VerifiedBadge size={13} />}</span>
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
