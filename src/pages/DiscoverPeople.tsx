import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import PuffyIcon from "@/components/PuffyIcon";

interface SuggestedUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

const DiscoverPeople = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, bio, is_verified")
        .neq("user_id", user.id)
        .not("username", "is", null)
        .eq("onboarding_completed", true)
        .limit(20);
      setUsers((data as SuggestedUser[]) || []);
      setLoading(false);
    };
    fetchUsers();
  }, [user]);

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;
    setLoadingIds((prev) => new Set(prev).add(targetUserId));

    if (followedIds.has(targetUserId)) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });
      setFollowedIds((prev) => new Set(prev).add(targetUserId));
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
  };

  const handleContinue = () => {
    if (followedIds.size > 0) {
      toast.success(`You're now following ${followedIds.size} ${followedIds.size === 1 ? "person" : "people"}!`);
    }
    navigate("/feed");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1 flex-col"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <PuffyIcon name="user-plus" size={28} />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Discover People</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Follow people to see their posts in your feed
          </p>
        </div>

        {/* User list */}
        <div className="flex-1 space-y-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
                <div className="h-12 w-12 animate-pulse avatar-leaf bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 animate-pulse rounded-full bg-secondary" />
                  <div className="h-3 w-16 animate-pulse rounded-full bg-secondary" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded-full bg-secondary" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <PuffyIcon name="search" size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No users to discover yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {users.map((u, i) => {
                const isFollowed = followedIds.has(u.user_id);
                const isLoading = loadingIds.has(u.user_id);
                return (
                  <motion.div
                    key={u.user_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-secondary/50"
                  >
                    <button
                      onClick={() => navigate(`/user/${u.user_id}`)}
                      className="flex-shrink-0"
                    >
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.username || "User"}
                          className="h-12 w-12 avatar-leaf object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center avatar-leaf bg-secondary">
                          <PuffyIcon name="user" size={20} />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => navigate(`/user/${u.user_id}`)}
                      className="flex min-w-0 flex-1 flex-col items-start"
                    >
                      <span className="flex items-center gap-1 text-sm font-semibold text-foreground truncate max-w-full">
                        {u.display_name || u.username}
                        {u.is_verified && <VerifiedBadge size={13} />}
                      </span>
                      {u.username && (
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          @{u.username}
                        </span>
                      )}
                      {u.bio && (
                        <span className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5 text-left">
                          {u.bio}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleFollow(u.user_id)}
                      disabled={isLoading}
                      className={`flex-shrink-0 rounded-full px-5 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                        isFollowed
                          ? "bg-secondary text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isLoading ? "..." : isFollowed ? "Following" : "Follow"}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-col gap-3 pt-4"
        >
          <button
            onClick={handleContinue}
            className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            {followedIds.size > 0
              ? `Continue (${followedIds.size} following)`
              : "Continue"}
          </button>
          {followedIds.size === 0 && (
            <button
              onClick={() => navigate("/feed")}
              className="text-sm text-muted-foreground"
            >
              Skip for now
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DiscoverPeople;
