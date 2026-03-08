import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const moods = ["Casual", "Love", "LOUD", "Secret", "Anger"];

interface Message {
  id: string;
  text: string;
  sender_id: string;
  mood: string;
  created_at: string;
}

const moodStyles: Record<string, string> = {
  Casual: "bg-primary text-primary-foreground",
  Love: "bg-accent text-accent-foreground",
  LOUD: "bg-warning text-background",
  Secret: "bg-secondary text-secondary-foreground",
  Anger: "bg-destructive/80 text-destructive-foreground",
};

const Chat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMood, setActiveMood] = useState("Casual");
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<{ username: string; avatar_url: string | null }>({ username: "User", avatar_url: null });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Fetch other user info
    const fetchOther = async () => {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);
      if (participants && participants.length > 0) {
        const { data: prof } = await supabase.from("profiles").select("username, avatar_url").eq("user_id", participants[0].user_id).single();
        if (prof) setOtherUser(prof);
      }
    };
    fetchOther();

    // Fetch messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);

      // Mark as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("read", false);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !conversationId) return;
    const text = input.trim();
    setInput("");
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      text,
      mood: activeMood,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate("/messages")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <PuffyIcon name="user" size={20} />
          </div>
        )}
        <div className="flex-1">
          <p className="font-bold text-foreground">{otherUser.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col gap-0.5">
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.mood
                    ? moodStyles[msg.mood] || "bg-secondary text-secondary-foreground"
                    : msg.sender_id === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.text}
              </div>
              <span className={`text-[10px] text-muted-foreground ${msg.sender_id === user?.id ? "text-right" : "text-left"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Mood selector + Input */}
      <div className="border-t border-border bg-background px-4 py-3 pb-safe">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto">
          <PuffyIcon name="heart-filled" size={18} />
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => setActiveMood(mood)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeMood === mood ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"
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
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="rounded-full bg-primary p-2.5 transition-opacity disabled:opacity-30"
          >
            <PuffyIcon name="send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
