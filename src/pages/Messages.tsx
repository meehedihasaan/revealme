import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessagesShimmer } from "@/components/ShimmerLoader";

interface ConversationItem {
  conversation_id: string;
  other_user_id: string;
  username: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      // Get user's conversations
      const { data: myParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!myParticipations || myParticipations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = myParticipations.map(p => p.conversation_id);

      // Get other participants
      const { data: allParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user.id);

      if (!allParticipants || allParticipants.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const otherUserIds = [...new Set(allParticipants.map(p => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", otherUserIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

      // Get latest message per conversation
      const items: ConversationItem[] = [];
      for (const convId of convIds) {
        const otherParticipant = allParticipants.find(p => p.conversation_id === convId);
        if (!otherParticipant) continue;

        const { data: msgs } = await supabase
          .from("messages")
          .select("text, created_at, read, sender_id")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1);

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("read", false)
          .neq("sender_id", user.id);

        const prof = profileMap[otherParticipant.user_id];
        items.push({
          conversation_id: convId,
          other_user_id: otherParticipant.user_id,
          username: prof?.username || "user",
          avatar_url: prof?.avatar_url || null,
          lastMessage: msgs?.[0]?.text || "",
          lastMessageTime: msgs?.[0]?.created_at || "",
          unread: unreadCount || 0,
        });
      }

      items.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
      setConversations(items);
      setLoading(false);
    };
    fetchConversations();
  }, [user]);

  const filtered = conversations.filter(c => c.username.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const formatTime = (t: string) => {
    if (!t) return "";
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/feed")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">
          Messages {totalUnread > 0 && <span className="text-primary">({totalUnread})</span>}
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

      <div>
        {loading ? (
          <MessagesShimmer />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PuffyIcon name="message-circle" size={40} className="opacity-30 mb-3" />
            <p className="text-sm">No conversations yet</p>
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
              <div className="shrink-0">
                {conv.avatar_url ? (
                  <img src={conv.avatar_url} alt={conv.username} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                    <PuffyIcon name="user" size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">{conv.username}</span>
                <p className={`truncate text-sm ${conv.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {conv.lastMessage}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">{formatTime(conv.lastMessageTime)}</span>
                {conv.unread > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conv.unread}
                  </span>
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Messages;
