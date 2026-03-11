import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { MessagesShimmer } from "@/components/ShimmerLoader";
import PullToRefresh from "@/components/PullToRefresh";

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

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

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

    const items: ConversationItem[] = [];

    for (const partner of partners) {
      const convId = partner.conversation_id;
      const otherUserId = partner.other_user_id;
      if (blockedIds.has(otherUserId)) continue;

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
        username: prof?.username || "user",
        avatar_url: prof?.avatar_url || null,
        is_verified: prof?.is_verified || false,
        lastMessage: latestMsg?.text?.match(/\[shared_post:[a-f0-9-]+\]/) ? "Shared a post" : latestMsg?.image_url ? "Sent a photo" : (latestMsg?.text || ""),
        lastMessageIcon: latestMsg?.text?.match(/\[shared_post:[a-f0-9-]+\]/) ? "📸" : latestMsg?.image_url ? "📷" : null,
        lastMessageTime: latestMsg?.created_at || "",
        unread: unreadCount,
        is_online: isRecentlyOnline,
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

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
                lastMessage: msg.image_url ? "📷 Photo" : msg.text,
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
            <motion.button
              key={conv.conversation_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => navigate(`/chat/${conv.conversation_id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-secondary/50"
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
                  <p className={`truncate text-sm ${conv.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {conv.lastMessage || "Start a conversation"}
                  </p>
                  {conv.unread > 0 && (
                    <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      </PullToRefresh>
      <BottomNav />
    </div>
  );
};

export default Messages;
