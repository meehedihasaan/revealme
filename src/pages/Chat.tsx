import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  image_url?: string | null;
}

interface OtherUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
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
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Fetch other user + messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const init = async () => {
      setLoading(true);

      const [partnerRes, messagesRes] = await Promise.all([
        supabase.rpc("get_conversation_partner", { p_conversation_id: conversationId }),
        supabase
          .from("messages")
          .select("id, text, sender_id, created_at, read, image_url")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

      setMessages((messagesRes.data as Message[]) || []);

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

  // Online/offline presence
  useEffect(() => {
    if (!conversationId || !user || !otherUser) return;

    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = Object.keys(state);
        setIsOnline(onlineIds.includes(otherUser.user_id));

        // Check if other user is typing
        const otherState = state[otherUser.user_id];
        if (otherState && Array.isArray(otherState) && otherState.length > 0) {
          setIsTyping(!!(otherState[0] as any).is_typing);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString(), is_typing: false });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, user, otherUser]);

  // Broadcast typing status
  const broadcastTyping = () => {
    if (!presenceChannelRef.current || !user) return;
    presenceChannelRef.current.track({ user_id: user.id, online_at: new Date().toISOString(), is_typing: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ user_id: user.id, online_at: new Date().toISOString(), is_typing: false });
      }
    }, 2000);
  };

  // Realtime messages (INSERT + UPDATE for read status)
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
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read: updated.read } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom(loading ? "instant" : "smooth");
  }, [messages, loading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB limit

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImagePreview = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-images")
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || !user || !conversationId || sending) return;
    const text = input.trim();

    setSending(true);
    setInput("");

    let imageUrl: string | null = null;

    if (selectedFile) {
      setUploading(true);
      imageUrl = await uploadImage(selectedFile);
      setUploading(false);
      clearImagePreview();
    }

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      text: text || "",
      sender_id: user.id,
      created_at: new Date().toISOString(),
      read: false,
      image_url: imageUrl,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const insertPayload: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      text: text || (imageUrl ? "📷 Photo" : ""),
    };
    if (imageUrl) insertPayload.image_url = imageUrl;

    const { data, error } = await supabase
      .from("messages")
      .insert(insertPayload)
      .select("id, text, sender_id, created_at, read, image_url")
      .single();

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

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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
      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setFullscreenImage(null)}
          >
            <button className="absolute top-4 right-4 text-white/80 text-2xl font-bold z-10" onClick={() => setFullscreenImage(null)}>✕</button>
            <img src={fullscreenImage} alt="" className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>

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
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">{otherUser?.username || "User"}</p>
            <p className="text-[11px] text-muted-foreground">
              {isTyping ? (
                <span className="text-primary font-medium">typing...</span>
              ) : isOnline ? "Online" : "Offline"}
            </p>
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
                    const hasImage = !!msg.image_url;
                    const hasText = msg.text && msg.text !== "📷 Photo";

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                          {hasImage && (
                            <button
                              onClick={() => setFullscreenImage(msg.image_url!)}
                              className="overflow-hidden rounded-2xl max-w-[75vw]"
                            >
                              <img
                                src={msg.image_url!}
                                alt=""
                                className="max-w-[260px] max-h-[320px] object-cover rounded-2xl"
                                loading="lazy"
                              />
                            </button>
                          )}
                          {hasText && (
                            <div className={`max-w-[75vw] rounded-2xl px-4 py-2.5 text-sm break-words ${
                              isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                            }`}>
                              {msg.text}
                            </div>
                          )}
                          <div className="flex items-center gap-1 px-1">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMine && (
                              <span className={`text-[10px] font-medium ${msg.read ? "text-primary" : "text-muted-foreground"}`}>
                                {isOptimistic ? "Sending..." : msg.read ? "Seen" : "Delivered"}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex justify-start mb-2"
            >
              <div className="flex items-center gap-1 rounded-2xl bg-secondary px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-secondary/50 px-4 py-2 shrink-0"
          >
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
              <button
                onClick={clearImagePreview}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="border-t border-border bg-background px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-secondary p-2.5 transition-colors"
            disabled={uploading}
          >
            <PuffyIcon name="camera" size={18} />
          </motion.button>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); broadcastTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={(!input.trim() && !selectedFile) || sending || uploading}
            className="rounded-full bg-primary p-2.5 transition-opacity disabled:opacity-30"
          >
            {uploading ? (
              <div className="h-[18px] w-[18px] rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              <PuffyIcon name="send" size={18} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
