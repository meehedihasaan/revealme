import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface OtherUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

const Chat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Fetch other user + messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const init = async () => {
      setLoading(true);

      // Use RPC to get conversation partner (bypasses RLS issue)
      const [partnerRes, messagesRes] = await Promise.all([
        supabase.rpc("get_conversation_partner", { p_conversation_id: conversationId }),
        supabase
          .from("messages")
          .select("id, text, sender_id, created_at, read")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

      setMessages((messagesRes.data as Message[]) || []);

      // Get other user's profile
      if (partnerRes.data && partnerRes.data.length > 0) {
        const otherUserId = partnerRes.data[0].user_id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .eq("user_id", otherUserId)
          .single();
        if (prof) setOtherUser(prof as OtherUser);
      }

      setLoading(false);

      // Mark unread as read
      supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("read", false)
        .then(() => {});
    };

    init();
  }, [conversationId, user]);

  // Online/offline presence via Supabase Realtime Presence
  useEffect(() => {
    if (!conversationId || !user || !otherUser) return;

    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = Object.keys(state);
        setIsOnline(onlineIds.includes(otherUser.user_id));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [conversationId, user, otherUser]);

  // Realtime messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== user.id) {
          supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom(loading ? "instant" : "smooth");
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId || sending) return;
    const text = input.trim();

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      text,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      read: false,
    };

    setInput("");
    setSending(true);
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      text,
    }).select("id, text, sender_id, created_at, read").single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? (data as Message) : m));
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString();
    const last = acc[acc.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      acc.push({ date, msgs: [msg] });
    }
    return acc;
  }, []);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={() => navigate("/messages")}><PuffyIcon name="arrow-left" size={22} /></button>
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 px-4 py-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="h-10 w-48 rounded-2xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
        <button onClick={() => navigate("/messages")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <button onClick={() => otherUser && navigate(`/user/${otherUser.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <PuffyIcon name="user" size={20} />
              </div>
            )}
            {/* Online indicator */}
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{otherUser?.username || "User"}</p>
            <p className="text-[11px] text-muted-foreground">{isOnline ? "Online" : "Offline"}</p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <PuffyIcon name="message-circle" size={48} className="opacity-20 mb-3" />
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-4">
                <span className="rounded-full bg-secondary px-3 py-1 text-[10px] text-muted-foreground font-medium">
                  {formatDateLabel(group.date)}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {group.msgs.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    const isOptimistic = msg.id.startsWith("temp-");
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[75vw] rounded-2xl px-4 py-2.5 text-sm break-words ${
                            isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="rounded-full bg-primary p-2.5 transition-opacity disabled:opacity-30"
          >
            <PuffyIcon name="send" size={18} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
