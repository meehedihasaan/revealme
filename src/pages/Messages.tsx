import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { MessagesShimmer } from "@/components/ShimmerLoader";
import PullToRefresh from "@/components/PullToRefresh";
import { toast } from "sonner";
import cameraFilledIcon from "@/assets/icons/camera-filled.png";

interface ConversationItem {
  conversation_id: string;
  other_user_id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  lastMessage: string;
  lastMessageIcon: string | null;
  lastMessageTime: string;
  unread: number;
  is_online: boolean;
}

const DELETE_THRESHOLD = -80;

const SwipeableConversationRow = ({
  conv,
  index,
  onTap,
  onDelete,
  formatTime,
}: {
  conv: ConversationItem;
  index: number;
  onTap: () => void;
  onDelete: () => void;
  formatTime: (t: string) => string;
}) => {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-80, -40, 0], [1, 0.6, 0]);
  const deleteScale = useTransform(x, [-80, -40, 0], [1, 0.8, 0.5]);
  const [swiped, setSwiped] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < DELETE_THRESHOLD) {
      animate(x, -80, { type: "spring", stiffness: 300, damping: 30 });
      setSwiped(true);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      setSwiped(false);
    }
  };

  const handleTap = () => {
    if (swiped) {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      setSwiped(false);
    } else {
      onTap();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete action behind */}
      <motion.div
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 bg-destructive"
      >
        <button onClick={onDelete} className="flex flex-col items-center gap-1 text-destructive-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          <span className="text-[10px] font-semibold">Delete</span>
        </button>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className="relative flex w-full items-center gap-3 px-4 py-3 text-left bg-background cursor-pointer active:bg-secondary/50"
      >
        <div className="relative shrink-0">
          {conv.avatar_url ? (
            <img src={conv.avatar_url} alt={conv.username} className="h-12 w-12 rounded-[40%] object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-[40%] bg-secondary">
              <PuffyIcon name="user" size={20} />
            </div>
          )}
          {conv.is_online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-semibold text-foreground truncate ${conv.unread > 0 ? "font-bold" : ""} flex items-center gap-1`}>
              {conv.username}
              {conv.is_verified && <VerifiedBadge size={13} />}
            </span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {formatTime(conv.lastMessageTime)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className={`truncate text-sm flex items-center gap-1 ${conv.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {conv.lastMessageIcon === "camera" && <img src={cameraFilledIcon} alt="" className="h-4 w-4 opacity-60 icon-adaptive" />}
              {conv.lastMessage === "Reacted ❤️ to your message" ? "Reacted ❤️ to your message" : (conv.lastMessage || "Start a conversation")}
            </p>
            {conv.unread > 0 && (
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                {conv.unread}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch restricted user IDs (bidirectional)
  useEffect(() => {
    if (!user) return;
    const fetchRestricted = async () => {
      const [{ data: d1 }, { data: d2 }] = await Promise.all([
        supabase.from("restricted_users").select("restricted_id").eq("restrictor_id", user.id),
        supabase.from("restricted_users").select("restrictor_id").eq("restricted_id", user.id),
      ]);
      const ids = new Set<string>([
        ...(d1 || []).map((r: any) => r.restricted_id),
        ...(d2 || []).map((r: any) => r.restrictor_id),
      ]);
      setRestrictedIds(ids);
    };
    fetchRestricted();
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    // Use RPC to get other participants (bypasses RLS)
    const { data: partners } = await supabase.rpc("get_conversation_other_participants", {
      p_user_id: user.id,
    });

    if (!partners || partners.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = partners.map((p: any) => p.conversation_id);
    const otherUserIds = [...new Set(partners.map((p: any) => p.other_user_id))];

    // Batch fetch profiles + messages
    const [profilesRes, messagesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, username, avatar_url, is_verified, last_online")
        .in("user_id", otherUserIds as string[]),
      supabase
        .from("messages")
        .select("conversation_id, text, created_at, read, sender_id, image_url")
        .in("conversation_id", convIds as string[])
        .order("created_at", { ascending: false }),
    ]);

    const profileMap = Object.fromEntries(
      (profilesRes.data || []).map((p) => [p.user_id, p])
    );
    const allMessages = messagesRes.data || [];

    // Fetch latest reactions per conversation to show "Reacted ❤️ to your message"
    const latestMsgIds = new Set<string>();
    for (const partner of partners) {
      const msg = allMessages.find((m) => m.conversation_id === partner.conversation_id);
      if (msg) latestMsgIds.add(msg.id);
    }
    const { data: reactionsData } = latestMsgIds.size > 0
      ? await supabase.from("message_reactions").select("message_id, user_id, created_at").in("message_id", [...latestMsgIds])
      : { data: [] };
    
    // Build a map: message_id -> latest reaction
    const reactionMap = new Map<string, any>();
    for (const r of (reactionsData || [])) {
      const existing = reactionMap.get(r.message_id);
      if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
        reactionMap.set(r.message_id, r);
      }
    }

    const items: ConversationItem[] = [];

    for (const partner of partners) {
      const convId = partner.conversation_id;
      const otherUserId = partner.other_user_id;
      const isBlockedUser = blockedIds.has(otherUserId);
      const isRestrictedUser = restrictedIds.has(otherUserId);
      const isHidden = isBlockedUser || isRestrictedUser;

      const latestMsg = allMessages.find((m) => m.conversation_id === convId);
      const unreadCount = allMessages.filter(
        (m) => m.conversation_id === convId && !m.read && m.sender_id !== user.id
      ).length;

      const prof = profileMap[otherUserId];
      const lastOnline = (prof as any)?.last_online;
      const isRecentlyOnline = lastOnline ? (Date.now() - new Date(lastOnline).getTime()) < 2 * 60 * 1000 : false;
      items.push({
        conversation_id: convId,
        other_user_id: otherUserId,
        username: isHidden ? "Revealme user" : (prof?.username || "user"),
        avatar_url: isHidden ? null : (prof?.avatar_url || null),
        is_verified: isHidden ? false : (prof?.is_verified || false),
        // Check if there's a reaction on the latest message that's newer than the message itself
        const latestReaction = latestMsg ? reactionMap.get(latestMsg.id) : null;
        const showReaction = latestReaction && latestMsg && new Date(latestReaction.created_at) >= new Date(latestMsg.created_at) && latestReaction.user_id !== user.id;
        
        const displayMessage = showReaction
          ? "Reacted ❤️ to your message"
          : latestMsg?.text?.match(/\[shared_post:[a-f0-9-]+\]/) ? "Shared a post" : latestMsg?.image_url ? "Sent a photo" : (latestMsg?.text || "");
        const displayIcon = latestMsg?.image_url && !showReaction ? "camera" : null;
        lastMessageTime: latestMsg?.created_at || "",
        unread: unreadCount,
        is_online: isHidden ? false : isRecentlyOnline,
      });
    }

    items.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    setConversations(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time inbox updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        setConversations((prev) => {
          const existing = prev.find((c) => c.conversation_id === msg.conversation_id);
          if (existing) {
            const updated = prev.map((c) => {
              if (c.conversation_id !== msg.conversation_id) return c;
              return {
                ...c,
                lastMessage: msg.image_url ? "Sent a photo" : msg.text,
                lastMessageTime: msg.created_at,
                unread: msg.sender_id !== user.id ? c.unread + 1 : c.unread,
              };
            });
            return updated.sort(
              (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
            );
          }
          fetchConversations();
          return prev;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  const filtered = conversations.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const handleDeleteConversation = async (convId: string) => {
    // Delete all messages then remove participants
    await supabase.from("messages").delete().eq("conversation_id", convId);
    await supabase.from("conversation_participants").delete().eq("conversation_id", convId);
    await supabase.from("conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.conversation_id !== convId));
    toast.success("Chat deleted");
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/feed")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">
          Messages{" "}
          {totalUnread > 0 && <span className="text-primary">({totalUnread})</span>}
        </h1>
        <button><PuffyIcon name="edit" size={20} /></button>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <PuffyIcon name="search" size={18} className="opacity-50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="h-px bg-border" />

      <PullToRefresh onRefresh={async () => { setLoading(true); await fetchConversations(); }}>
      <div>
        {loading ? (
          <MessagesShimmer />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PuffyIcon name="message-circle" size={40} className="opacity-30 mb-3" />
            <p className="text-sm">No conversations yet</p>
            <button onClick={() => navigate("/following")} className="mt-3 text-sm font-semibold text-primary">
              Discover people to message
            </button>
          </div>
        ) : (
          filtered.map((conv, i) => (
            <SwipeableConversationRow
              key={conv.conversation_id}
              conv={conv}
              index={i}
              onTap={() => navigate(`/chat/${conv.conversation_id}`)}
              onDelete={() => handleDeleteConversation(conv.conversation_id)}
              formatTime={formatTime}
            />
          ))
        )}
      </div>

      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default Messages;
