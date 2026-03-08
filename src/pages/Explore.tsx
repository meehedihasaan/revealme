import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { ExploreShimmer } from "@/components/ShimmerLoader";

import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore3 from "@/assets/explore3.jpg";
import explore4 from "@/assets/explore4.jpg";
import explore5 from "@/assets/explore5.jpg";
import explore6 from "@/assets/explore6.jpg";

interface UserResult {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  isFollowing: boolean;
}

interface PostResult {
  id: string;
  image_url: string;
  user_id: string;
}

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "users">("content");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch explore posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, user_id")
        .order("created_at", { ascending: false })
        .limit(30);
      setPosts((data || []).filter(p => !blockedIds.has(p.user_id)));
      setLoading(false);
    };
    fetchPosts();
  }, [blockedIds]);

  // Search users
  useEffect(() => {
    if (!search.trim() || activeTab !== "users") {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .neq("user_id", user?.id || "")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(20);

      if (!profiles) { setUsers([]); setSearchLoading(false); return; }

      // Check follow status
      let followSet = new Set<string>();
      if (user) {
        const uids = profiles.map(p => p.user_id);
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
          .in("following_id", uids);
        followSet = new Set((follows || []).map(f => f.following_id));
      }

      setUsers(profiles.map(p => ({
        ...p,
        isFollowing: followSet.has(p.user_id),
      })));
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeTab, user]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    const u = users.find(u => u.user_id === targetId);
    if (!u) return;

    setUsers(prev => prev.map(u => u.user_id === targetId ? { ...u, isFollowing: !u.isFollowing } : u));

    if (u.isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    // Check existing conversation
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvs) {
      for (const mc of myConvs) {
        const { data: other } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", mc.conversation_id)
          .eq("user_id", otherUserId)
          .maybeSingle();
        if (other) {
          navigate(`/chat/${mc.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: conv } = await supabase.from("conversations").insert({}).select("id").single();
    if (!conv) return;
    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);
    navigate(`/chat/${conv.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Explore</h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <PuffyIcon name="search" size={18} className="opacity-50" />
          <input
            type="text"
            placeholder="Search users or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => search.trim() && setActiveTab("users")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(""); setActiveTab("content"); }} className="text-muted-foreground text-xs">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tabs when searching */}
      {search.trim() && (
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setActiveTab("content")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${activeTab === "content" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${activeTab === "users" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            People
          </button>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && search.trim() ? (
        <div>
          {searchLoading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
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
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <PuffyIcon name="search" size={48} className="opacity-30 mb-3" />
              <p className="text-sm">No users found for "{search}"</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u, i) => (
                <motion.div
                  key={u.user_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <button onClick={() => navigate(`/user/${u.user_id}`)} className="shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username || ""} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                        <PuffyIcon name="user" size={22} />
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{u.username || "user"}</p>
                    {u.display_name && <p className="text-xs text-muted-foreground truncate">{u.display_name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startConversation(u.user_id)}
                      className="rounded-lg bg-secondary p-2 text-secondary-foreground"
                    >
                      <PuffyIcon name="message-circle" size={16} />
                    </button>
                    <button
                      onClick={() => toggleFollow(u.user_id)}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                        u.isFollowing ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {u.isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Content grid */
        loading ? (
          <ExploreShimmer />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <PuffyIcon name="camera" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">No posts to explore yet</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-0.5">
            {posts.map((p, i) => (
              <motion.div
                key={p.id}
                whileTap={{ scale: 0.95 }}
                className={`overflow-hidden cursor-pointer ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                onClick={() => setSelectedImage(p.image_url)}
              >
                <img src={p.image_url} alt="" className="h-full w-full object-cover" style={{ aspectRatio: "1" }} />
              </motion.div>
            ))}
          </motion.div>
        )
      )}

      {/* Image preview */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <img src={selectedImage} alt="Preview" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Explore;
