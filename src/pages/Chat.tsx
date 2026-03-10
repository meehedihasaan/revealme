import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { ChatShimmer } from "@/components/ShimmerLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOnlineStatus, formatLastOnline } from "@/hooks/usePresence";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  image_url?: string | null;
  mood?: string | null;
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
  const { isOnline, lastOnline } = useUserOnlineStatus(otherUser?.user_id);
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
          .select("id, text, sender_id, created_at, read, image_url, mood")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);
      setMessages((messagesRes.data as Message[]) || []);
      if (partnerRes.data && partnerRes.data.length > 0) {
        const otherUserId = partnerRes.data[0].user_id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, is_verified")
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

  // Chat-level presence for typing indicator
  useEffect(() => {
    if (!conversationId || !user || !otherUser) return;
    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = presenceChannel;
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
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

  // Realtime messages
  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
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
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read: updated.read } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  useEffect(() => {
    scrollToBottom(loading ? "instant" : "smooth");
  }, [messages, loading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
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
    const { error } = await supabase.storage.from("chat-images").upload(path, file, { contentType: file.type });
    if (error) { console.error("Upload error:", error); return null; }
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
      id: `temp-${Date.now()}`, text: text || "", sender_id: user.id,
      created_at: new Date().toISOString(), read: false, image_url: imageUrl,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const insertPayload: any = {
      conversation_id: conversationId, sender_id: user.id,
      text: text || (imageUrl ? "📷 Photo" : ""),
    };
    if (imageUrl) insertPayload.image_url = imageUrl;

    const { data, error } = await supabase.from("messages").insert(insertPayload)
      .select("id, text, sender_id, created_at, read, image_url, mood").single();

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
    if (last && last.date === date) { last.msgs.push(msg); } else { acc.push({ date, msgs: [msg] }); }
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
          <div className="h-10 w-10 rounded-[70%] bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <ChatShimmer />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95"
            onClick={() => setFullscreenImage(null)}
          >
            <button className="absolute top-4 right-4 text-foreground/80 text-2xl font-bold z-10" onClick={() => setFullscreenImage(null)}>✕</button>
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
              <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-[70%] object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-[70%] bg-secondary">
                <PuffyIcon name="user" size={20} />
              </div>
            )}
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate flex items-center gap-1 text-[15px]">
              {otherUser?.username || "User"}{otherUser?.is_verified && <VerifiedBadge size={14} />}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isTyping ? (
                <span className="text-primary font-medium">typing...</span>
              ) : isOnline ? (
                <span className="text-green-500 font-medium">Online</span>
              ) : (
                `Last seen ${formatLastOnline(lastOnline)}`
              )}
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
              <div className="space-y-3">
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
                        className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        {/* Avatar for other user */}
                        {!isMine && (
                          <div className="shrink-0 mb-5">
                            {otherUser?.avatar_url ? (
                              <img src={otherUser.avatar_url} alt="" className="h-8 w-8 rounded-[70%] object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-[70%] bg-secondary">
                                <PuffyIcon name="user" size={14} />
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                          {hasImage && (
                            <button
                              onClick={() => setFullscreenImage(msg.image_url!)}
                              className="overflow-hidden rounded-2xl max-w-[75vw]"
                            >
                              <img src={msg.image_url!} alt="" className="max-w-[240px] max-h-[300px] object-cover rounded-2xl" loading="lazy" />
                            </button>
                          )}
                          {hasText && (
                            <div className={`max-w-[75vw] rounded-2xl px-4 py-2.5 text-[15px] break-words ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary text-secondary-foreground rounded-bl-md"
                            }`}>
                              {msg.text}
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMine && (
                              <span className={`ml-1 font-medium ${msg.read ? "text-primary" : ""}`}>
                                {isOptimistic ? " Sending..." : msg.read ? " Seen" : " Delivered"}
                              </span>
                            )}
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

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2 justify-start mt-2"
            >
              <div className="shrink-0">
                {otherUser?.avatar_url ? (
                   <img src={otherUser.avatar_url} alt="" className="h-8 w-8 rounded-[70%] object-cover" />
                 ) : (
                   <div className="flex h-8 w-8 items-center justify-center rounded-[70%] bg-secondary">
                     <PuffyIcon name="user" size={14} />
                   </div>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-secondary px-4 py-3 rounded-bl-md">
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
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-secondary/50 px-4 py-2 shrink-0"
          >
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
              <button onClick={clearImagePreview}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
              >✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="border-t border-border bg-background px-3 pb-4 pt-3 shrink-0">
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => fileInputRef.current?.click()}
            className="text-primary shrink-0"
            disabled={uploading}
          >
            <PuffyIcon name="camera" size={22} />
          </motion.button>

          <div className="flex-1 rounded-full bg-secondary px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); broadcastTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={sendMessage}
            disabled={(!input.trim() && !selectedFile) || sending || uploading}
            className="shrink-0 text-primary transition-opacity disabled:opacity-30"
          >
            {uploading ? (
              <div className="h-[18px] w-[18px] rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              <PuffyIcon name="send" size={22} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
