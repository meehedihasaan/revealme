import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { supabase } from "@/integrations/supabase/client";

interface DiscoverUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

const Following = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchDiscoverPeople = async () => {
      setLoading(true);

      const [{ data: profiles, error: profilesError }, { data: follows, error: followsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url, is_verified")
          .neq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id),
      ]);

      if (!profilesError) {
        setUsers(((profiles || []) as DiscoverUser[]).filter(p => !blockedIds.has(p.user_id)));
      }

      if (!followsError) {
        setFollowingIds(new Set((follows || []).map((f) => f.following_id)));
      }

      setLoading(false);
    };

    fetchDiscoverPeople();
  }, [user]);

  const filteredUsers = users.filter((u) => {
    const username = u.username?.toLowerCase() || "";
    const displayName = u.display_name?.toLowerCase() || "";
    const query = search.toLowerCase();
    return username.includes(query) || displayName.includes(query);
  });

  const toggleFollow = async (targetUserId: string) => {
    if (!user) return;

    const isFollowing = followingIds.has(targetUserId);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (!error) {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
      return;
    }

    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

    if (!error) {
      setFollowingIds((prev) => new Set(prev).add(targetUserId));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <button onClick={() => navigate("/feed")} className="font-semibold text-foreground">
          Done
        </button>
      </div>

      <div className="px-4 pb-4">
        <h1 className="text-3xl font-extrabold leading-tight text-foreground">Discover People</h1>
        <p className="mt-2 text-sm text-muted-foreground">Follow people to see their posts on your Timeline.</p>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <PuffyIcon name="search" size={18} className="opacity-50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading people...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">No users found</div>
        ) : (
          filteredUsers.map((person, i) => {
            const isFollowing = followingIds.has(person.user_id);
            const username = person.username || "user";
            const displayName = person.display_name || "";

            return (
              <motion.div
                key={person.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 px-4 py-3"
              >
                <button onClick={() => navigate(`/user/${person.user_id}`)} className="shrink-0">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={username} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <PuffyIcon name="user" size={20} />
                    </div>
                  )}
                </button>

                <button onClick={() => navigate(`/user/${person.user_id}`)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-bold text-foreground">{username}</p>
                  {displayName && <p className="truncate text-sm text-muted-foreground">{displayName}</p>}
                </button>

                <button
                  onClick={() => toggleFollow(person.user_id)}
                  className={`flex items-center gap-1 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                    isFollowing ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <PuffyIcon name={isFollowing ? "check" : "plus"} size={14} />
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Following;
