import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const moods = ["Casual", "Love", "LOUD", "Secret", "Anger"];

interface Message {
  id: string;
  text: string;
  sender_id: string;
  mood: string | null;
  created_at: string;
  read: boolean;
}

interface OtherUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

const moodStyles: Record<string, string> = {
  Casual: "bg-primary text-primary-foreground",
  Love: "bg-pink-500 text-white",
  LOUD: "bg-yellow-500 text-black font-bold uppercase",
  Secret: "bg-muted text-muted-foreground italic",
  Anger: "bg-destructive text-destructive-foreground",
};

const Chat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMood, setActiveMood] = useState("Casual");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Fetch other user + messages on mount
  useEffect(() => {
    if (!conversationId || !user) return;

    const init = async () => {
      setLoading(true);

      // Parallel fetch: other user + messages
      const [participantsRes, messagesRes] = await Promise.all([
        supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id),
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

      // Set messages
      setMessages((messagesRes.data as Message[]) || []);

      // Get other user profile
      if (participantsRes.data && participantsRes.data.length > 0) {
        const otherUserId = participantsRes.data[0].user_id;
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

  // Realtime subscription
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
          // Avoid duplicates from optimistic updates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Auto mark as read if from other user
        if (newMsg.sender_id !== user.id) {
          supabase
            .from("messages")
            .update({ read: true })
            .eq("id", newMsg.id)
            .then(() => {});
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
    const mood = activeMood;

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      text,
      sender_id: user.id,
      mood,
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
      mood,
    }).select("*").single();

    if (data) {
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? (data as Message) : m));
    } else if (error) {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      console.error("Failed to send message", error);
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
          <button onClick={() => navigate("/messages")}>
            <PuffyIcon name="arrow-left" size={22} />
          </button>
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
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary shrink-0">
              <PuffyIcon name="user" size={20} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{otherUser?.username || "User"}</p>
          </div>
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
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
                          <div
                            className={`max-w-[75vw] rounded-2xl px-4 py-2.5 text-sm break-words ${
                              msg.mood && moodStyles[msg.mood]
                                ? moodStyles[msg.mood]
                                : isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                            } ${msg.mood === "LOUD" ? "text-base" : ""}`}
                          >
                            {msg.mood === "LOUD" ? msg.text.toUpperCase() : msg.text}
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

      {/* Mood selector + Input */}
      <div className="border-t border-border bg-background px-4 py-3 shrink-0">
        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => setActiveMood(mood)}
              className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                activeMood === mood
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
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
