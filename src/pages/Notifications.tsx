import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsShimmer } from "@/components/ShimmerLoader";
import { formatDistanceToNow } from "date-fns";

import VerifiedBadge from "@/components/VerifiedBadge";

type NotifType = "like" | "comment" | "follow" | "story_react";

interface NotifItem {
  id: string;
  type: NotifType;
  actor_id: string;
  post_id: string | null;
  comment_text: string | null;
  read: boolean;
  created_at: string;
  actor_username: string;
  actor_avatar: string | null;
  actor_verified: boolean;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set(data.map(n => n.actor_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url, is_verified")
      .in("user_id", actorIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Check follow states
    const followActors = data.filter(n => n.type === "follow").map(n => n.actor_id);
    if (followActors.length > 0) {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", followActors);
      const followSet = new Set((follows || []).map(f => f.following_id));
      const states: Record<string, boolean> = {};
      followActors.forEach(id => { states[id] = followSet.has(id); });
      setFollowStates(states);
    }

    setNotifications(data.map(n => ({
      id: n.id,
      type: n.type as NotifType,
      actor_id: n.actor_id,
      post_id: n.post_id,
      comment_text: n.comment_text,
      read: n.read,
      created_at: n.created_at,
      actor_username: profileMap[n.actor_id]?.username || "user",
      actor_avatar: profileMap[n.actor_id]?.avatar_url || null,
      actor_verified: profileMap[n.actor_id]?.is_verified || false,
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const n = payload.new as any;
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url, is_verified")
          .eq("user_id", n.actor_id)
          .single();

        const newNotif: NotifItem = {
          id: n.id,
          type: n.type,
          actor_id: n.actor_id,
          post_id: n.post_id,
          comment_text: n.comment_text,
          read: n.read,
          created_at: n.created_at,
          actor_username: prof?.username || "user",
          actor_avatar: prof?.avatar_url || null,
          actor_verified: prof?.is_verified || false,
        };
        setNotifications(prev => [newNotif, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  };

  const toggleFollowBack = async (actorId: string) => {
    if (!user) return;
    const was = followStates[actorId] || false;
    setFollowStates(prev => ({ ...prev, [actorId]: !was }));
    if (was) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", actorId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: actorId });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotifText = (n: NotifItem) => {
    switch (n.type) {
      case "like": return "liked your post.";
      case "comment": return "commented on your post.";
      case "follow": return "started following you.";
      case "story_react": return `reacted ${n.comment_text || "❤️"} to your story.`;
      default: return "";
    }
  };

  const handleNotifClick = async (n: NotifItem) => {
    // Mark as read
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    
    // Navigate based on notification type
    if (n.type === "follow" || n.type === "story_react") {
      navigate(`/user/${n.actor_id}`);
    } else if (n.type === "comment" && n.post_id) {
      navigate(`/post/${n.post_id}?openComments=true`);
    } else if (n.type === "like" && n.post_id) {
      navigate(`/post/${n.post_id}`);
    }
  };

  const NotifIcon = ({ type }: { type: NotifType }) => {
    if (type === "like") return <PuffyIcon name="heart-filled" size={20} />;
    if (type === "comment") return <PuffyIcon name="message-circle" size={20} />;
    if (type === "story_react") return <span className="text-base">❤️</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold text-foreground">
          Notifications {unreadCount > 0 && <span className="text-primary text-base">({unreadCount})</span>}
        </h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-medium">
              Mark all read
            </button>
          )}
          <button onClick={() => navigate("/following")}>
            <PuffyIcon name="user-plus" size={24} />
          </button>
        </div>
      </div>

      {loading ? (
        <NotificationsShimmer />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PuffyIcon name="bell" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-secondary/50 ${!n.read ? "bg-primary/5" : ""}`}
              onClick={() => handleNotifClick(n)}
            >
              <button onClick={(e) => { e.stopPropagation(); navigate(`/user/${n.actor_id}`); }} className="shrink-0">
                {n.actor_avatar ? (
                  <img src={n.actor_avatar} alt={n.actor_username} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                    <PuffyIcon name="user" size={20} />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-bold">{n.actor_username}</span>{n.actor_verified && <VerifiedBadge size={13} className="ml-0.5" />} {getNotifText(n)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
                {n.comment_text && (
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">"{n.comment_text}"</p>
                )}
              </div>
              {n.type === "follow" ? (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFollowBack(n.actor_id); }}
                  className={`flex items-center gap-1 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                    followStates[n.actor_id]
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <PuffyIcon name={followStates[n.actor_id] ? "check" : "plus"} size={14} />
                  {followStates[n.actor_id] ? "Following" : "Follow Back"}
                </button>
              ) : (
                <NotifIcon type={n.type} />
              )}
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Notifications;
