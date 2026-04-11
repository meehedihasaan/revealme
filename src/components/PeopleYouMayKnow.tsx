import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";

interface SuggestedUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  mutualCount: number;
}

const PYMKShimmer = () => (
  <div className="py-4">
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="h-4 w-36 shimmer-block rounded" />
      <div className="h-3 w-12 shimmer-block rounded" />
    </div>
    <div className="flex gap-3 overflow-hidden px-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex shrink-0 w-[140px] flex-col items-center rounded-2xl border border-border bg-card p-3">
          <div className="h-16 w-16 rounded-full shimmer-block mb-2" />
          <div className="h-3 w-20 shimmer-block rounded mb-1" />
          <div className="h-2.5 w-14 shimmer-block rounded mb-2" />
          <div className="h-7 w-full shimmer-block rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

const PeopleYouMayKnow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followingSet = new Set((myFollows || []).map((f) => f.following_id));

      if (followingSet.size === 0) {
        const { data: randomUsers } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, is_verified")
          .neq("user_id", user.id)
          .limit(10);
        setSuggestions(
          (randomUsers || []).map((u) => ({ ...u, display_name: u.display_name || u.username || "User", mutualCount: 0 }))
        );
        setLoading(false);
        return;
      }

      const followingArr = [...followingSet];
      const { data: fofData } = await supabase
        .from("follows")
        .select("following_id")
        .in("follower_id", followingArr)
        .not("following_id", "eq", user.id);

      const countMap: Record<string, number> = {};
      (fofData || []).forEach((f) => {
        if (!followingSet.has(f.following_id) && f.following_id !== user.id) {
          countMap[f.following_id] = (countMap[f.following_id] || 0) + 1;
        }
      });

      const sorted = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sorted.length === 0) {
        const { data: randomUsers } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, is_verified")
          .neq("user_id", user.id)
          .not("user_id", "in", `(${followingArr.join(",")})`)
          .limit(10);
        setSuggestions(
          (randomUsers || []).map((u) => ({ ...u, display_name: u.display_name || u.username || "User", mutualCount: 0 }))
        );
        setLoading(false);
        return;
      }

      const suggestedIds = sorted.map((s) => s[0]);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, is_verified")
        .in("user_id", suggestedIds);

      setSuggestions(
        (profiles || []).map((p) => ({
          ...p,
          display_name: p.display_name || p.username || "User",
          mutualCount: countMap[p.user_id] || 0,
        })).sort((a, b) => b.mutualCount - a.mutualCount)
      );
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleFollow = async (userId: string) => {
    if (!user) return;
    setFollowedIds((prev) => new Set([...prev, userId]));
    await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
  };

  const handleDismiss = (userId: string) => {
    setDismissed((prev) => new Set([...prev, userId]));
  };

  if (loading) return <PYMKShimmer />;

  const visible = suggestions.filter((s) => !dismissed.has(s.user_id) && !followedIds.has(s.user_id));

  if (visible.length === 0) return null;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-sm font-bold text-foreground">People you may know</h3>
        <button onClick={() => navigate("/following")} className="text-xs font-semibold text-primary">
          See all
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {visible.slice(0, 8).map((s) => (
          <motion.div
            key={s.user_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex shrink-0 w-[140px] flex-col items-center rounded-2xl border border-border bg-card p-3 relative"
          >
            <button
              onClick={() => handleDismiss(s.user_id)}
              className="absolute top-2 right-2 text-muted-foreground/60"
            >
              <PuffyIcon name="x" size={14} />
            </button>
            <button onClick={() => navigate(`/user/${s.user_id}`)}>
              {s.avatar_url ? (
                <img src={s.avatar_url} alt={s.username} className="h-16 w-16 rounded-full object-cover mb-2" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                  <PuffyIcon name="user" size={24} />
                </div>
              )}
            </button>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs font-bold text-foreground truncate max-w-[100px]">
                {s.display_name}
              </span>
              {s.is_verified && <VerifiedBadge size={12} />}
            </div>
            {s.mutualCount > 0 && (
              <span className="text-[10px] text-muted-foreground mb-2">
                {s.mutualCount} mutual{s.mutualCount > 1 ? "s" : ""}
              </span>
            )}
            {!s.mutualCount && (
              <span className="text-[10px] text-muted-foreground mb-2">Suggested</span>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFollow(s.user_id)}
              className="w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground"
            >
              Follow
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PeopleYouMayKnow;
