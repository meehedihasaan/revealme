import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserItem {
  user_id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
  is_verified: boolean;
  isFollowing: boolean;
}

const FollowersList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "followers";
  const targetUserId = searchParams.get("userId");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(tab);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!targetUserId) return;
    const fetchUsers = async () => {
      setLoading(true);
      let userIds: string[] = [];

      if (activeTab === "followers") {
        const { data } = await supabase.from("follows").select("follower_id").eq("following_id", targetUserId);
        userIds = (data || []).map(d => d.follower_id);
      } else {
        const { data } = await supabase.from("follows").select("following_id").eq("follower_id", targetUserId);
        userIds = (data || []).map(d => d.following_id);
      }

      if (userIds.length === 0) { setUsers([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, display_name, is_verified")
        .in("user_id", userIds);

      // Check which ones current user follows
      let myFollows = new Set<string>();
      if (user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", userIds);
        myFollows = new Set((follows || []).map(f => f.following_id));
      }

      setUsers((profiles || []).map(p => ({
        ...p,
        isFollowing: myFollows.has(p.user_id),
      })));
      setLoading(false);
    };
    fetchUsers();
  }, [targetUserId, activeTab, user]);

  const toggleFollow = async (uid: string) => {
    if (!user) return;
    const u = users.find(u => u.user_id === uid);
    if (!u) return;
    setUsers(prev => prev.map(u => u.user_id === uid ? { ...u, isFollowing: !u.isFollowing } : u));
    if (u.isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", uid);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: uid });
    }
  };

  const filtered = users.filter(u =>
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground capitalize">{activeTab}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("followers")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${activeTab === "followers" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}
        >
          Followers
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${activeTab === "following" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}
        >
          Following
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
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

      {/* List */}
      {loading ? (
        <div className="space-y-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No {activeTab} yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((u, i) => (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <PuffyIcon name="user" size={22} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm flex items-center gap-1">{u.username || "user"}{u.is_verified && <VerifiedBadge size={13} />}</p>
                {u.display_name && <p className="text-xs text-muted-foreground truncate">{u.display_name}</p>}
              </div>
              {u.user_id !== user?.id && (
                <button
                  onClick={() => toggleFollow(u.user_id)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                    u.isFollowing ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {u.isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowersList;
