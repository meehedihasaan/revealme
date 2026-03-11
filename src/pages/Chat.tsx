import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import waveIcon from "@/assets/icons/wave-so-so.png";
import VerifiedBadge from "@/components/VerifiedBadge";
import SharedPostCard, { parseSharedPost } from "@/components/SharedPostCard";
import { supabase } from "@/integrations/supabase/client";
import { ChatShimmer } from "@/components/ShimmerLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useUserOnlineStatus, formatLastOnline } from "@/hooks/usePresence";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import ChatMessageMenu from "@/components/ChatMessageMenu";
import ChatHeaderMenu from "@/components/ChatHeaderMenu";

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  image_url?: string | null;
  mood?: string | null;
  hasReaction?: boolean;
}

interface OtherUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  display_name: string | null;
  bio: string | null;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { blockedIds, refetch: refetchBlocked } = useBlockedUsers();
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
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  // Message menu state
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [menuMessageText, setMenuMessageText] = useState("");
  const [menuIsMine, setMenuIsMine] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  
  // Header menu
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  
  // Restrict state
  const [isRestricted, setIsRestricted] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });
  

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
      const msgs = (messagesRes.data as Message[]) || [];
      
      // Fetch reactions for these messages
      if (msgs.length > 0) {
        const msgIds = msgs.map(m => m.id);
        const { data: reactions } = await supabase
          .from("message_reactions")
          .select("message_id")
          .in("message_id", msgIds);
        const reactedIds = new Set((reactions || []).map((r: any) => r.message_id));
        msgs.forEach(m => { m.hasReaction = reactedIds.has(m.id); });
      }
      
      setMessages(msgs);
      if (partnerRes.data && partnerRes.data.length > 0) {
        const otherUserId = partnerRes.data[0].user_id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, is_verified, display_name, bio, created_at")
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

  // Check if user is restricted (either direction)
  useEffect(() => {
    if (!user || !otherUser) return;
    const checkRestriction = async () => {
      // Check if other user restricted me
      const { data: d1 } = await supabase.from("restricted_users").select("id")
        .eq("restrictor_id", otherUser.user_id).eq("restricted_id", user.id).maybeSingle();
      // Check if I restricted other user
      const { data: d2 } = await supabase.from("restricted_users").select("id")
        .eq("restrictor_id", user.id).eq("restricted_id", otherUser.user_id).maybeSingle();
      setIsRestricted(!!d1 || !!d2);
    };
    checkRestriction();
  }, [user, otherUser]);

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
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
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

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText ?? input.trim();
    if ((!textToSend && !selectedFile) || !user || !conversationId || sending) return;

    const keepComposerFocused = () => {
      requestAnimationFrame(() => {
        chatInputRef.current?.focus({ preventScroll: true });
      });
    };

    setSending(true);
    if (!overrideText) {
      setInput("");
      keepComposerFocused();
    }

    let imageUrl: string | null = null;
    if (selectedFile) {
      setUploading(true);
      imageUrl = await uploadImage(selectedFile);
      setUploading(false);
      clearImagePreview();
    }

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`, text: textToSend || "", sender_id: user.id,
      created_at: new Date().toISOString(), read: false, image_url: imageUrl,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const insertPayload: any = {
      conversation_id: conversationId, sender_id: user.id,
      text: textToSend || (imageUrl ? "📷 Photo" : ""),
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
    keepComposerFocused();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Long press handlers
  const handleLongPressStart = (msg: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setMenuMessageId(msg.id);
      setMenuMessageText(msg.text);
      setMenuIsMine(msg.sender_id === user?.id);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Edit message
  const handleStartEdit = (messageId: string, text: string) => {
    setEditingId(messageId);
    setEditText(text);
    setInput(text);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await supabase.from("messages").update({ text: editText.trim() }).eq("id", editingId);
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: editText.trim() } : m));
    setEditingId(null);
    setEditText("");
    setInput("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setInput("");
  };

  const handleMessageDeleted = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: "🚫 This message was deleted", image_url: null } : m));
  };

  // Send wave/hi
  const handleSendWave = () => {
    sendMessage("Hi 👋");
  };

  // Double-tap to love react
  const handleDoubleTap = async (msg: Message) => {
    if (!user || msg.text === "🚫 This message was deleted") return;
    const now = Date.now();
    if (doubleTapRef.current.id === msg.id && now - doubleTapRef.current.time < 300) {
      // Double tap detected
      doubleTapRef.current = { id: "", time: 0 };
      
      if (msg.hasReaction) {
        // Remove reaction
        await supabase.from("message_reactions").delete()
          .eq("message_id", msg.id).eq("user_id", user.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, hasReaction: false } : m));
      } else {
        // Add reaction (no animation)
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, hasReaction: true } : m));
        await supabase.from("message_reactions").insert({
          message_id: msg.id,
          user_id: user.id,
          reaction: "❤️",
        });
      }
    } else {
      doubleTapRef.current = { id: msg.id, time: now };
    }
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

  const isBlocked = otherUser ? blockedIds.has(otherUser.user_id) : false;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={() => navigate("/messages")}><PuffyIcon name="arrow-left" size={22} /></button>
          <div className="h-10 w-10 rounded-[40%] bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <ChatShimmer />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
          <button onClick={() => navigate("/messages")}>
            <PuffyIcon name="arrow-left" size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[40%] bg-secondary">
              <PuffyIcon name="user" size={20} />
            </div>
            <p className="font-semibold text-foreground">Revealme user</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-6">
          <PuffyIcon name="shield" size={48} className="opacity-30 mb-3" />
          <p className="text-sm text-center">You can't message this user. Unblock them from Privacy Settings to continue messaging.</p>
          <button
            onClick={() => navigate("/settings/privacy")}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Privacy Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Message long-press menu */}
      <ChatMessageMenu
        messageId={menuMessageId || ""}
        messageText={menuMessageText}
        isMine={menuIsMine}
        isOpen={!!menuMessageId}
        onClose={() => setMenuMessageId(null)}
        onEdit={handleStartEdit}
        onDeleted={handleMessageDeleted}
      />

      {/* Header three-dot menu */}
      {otherUser && (
        <ChatHeaderMenu
          otherUserId={otherUser.user_id}
          otherUsername={otherUser.username}
          isOpen={headerMenuOpen}
          onClose={() => setHeaderMenuOpen(false)}
          onRestricted={() => setIsRestricted(true)}
        />
      )}

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
              <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-[40%] object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-[40%] bg-secondary">
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
        {/* Three dot menu button */}
        <button onClick={() => setHeaderMenuOpen(true)} className="shrink-0 p-1">
          <PuffyIcon name="more-horizontal" size={22} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20" id="chat-scroll">
        {/* Profile card at top */}
        {otherUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center pb-6 mb-4"
          >
            <button onClick={() => navigate(`/user/${otherUser.user_id}`)} className="flex flex-col items-center">
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  className="h-20 w-20 rounded-[40%] object-cover mb-3"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[40%] bg-secondary mb-3">
                  <PuffyIcon name="user" size={32} />
                </div>
              )}
              <p className="text-base font-bold text-foreground flex items-center gap-1">
                {otherUser.display_name || otherUser.username}
                {otherUser.is_verified && <VerifiedBadge size={14} />}
              </p>
              <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
              {otherUser.bio && (
                <p className="text-xs text-muted-foreground mt-1 text-center max-w-[240px] line-clamp-2">{otherUser.bio}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                Joined {new Date(otherUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </button>
            <button
              onClick={() => navigate(`/user/${otherUser.user_id}`)}
              className="mt-3 rounded-full bg-secondary px-5 py-1.5 text-xs font-semibold text-foreground transition-colors active:bg-secondary/70"
            >
              View Profile
            </button>
          </motion.div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: [0, 20, -20, 15, -15, 0], y: [0, -6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <img src={waveIcon} alt="wave" className="h-16 w-16 mb-4 icon-adaptive-inverted" draggable={false} />
              </motion.div>
              <p className="text-lg font-semibold text-foreground mb-1">Say hello!</p>
              <p className="text-sm text-muted-foreground mb-5">Start the conversation with a wave</p>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleSendWave}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 transition-colors shadow-lg"
              >
                <img src={waveIcon} alt="wave" className="h-5 w-5 brightness-0 invert" draggable={false} />
                <span className="text-sm font-bold text-primary-foreground">Hey!</span>
              </motion.button>
            </motion.div>
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
                    const sharedPostId = parseSharedPost(msg.text);
                    const hasText = !sharedPostId && msg.text && msg.text !== "📷 Photo";
                    const isDeleted = msg.text === "🚫 This message was deleted";

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                        onTouchStart={() => !isDeleted && handleLongPressStart(msg)}
                        onTouchEnd={handleLongPressEnd}
                        onTouchCancel={handleLongPressEnd}
                        onClick={() => handleDoubleTap(msg)}
                        onContextMenu={(e) => {
                          if (isDeleted) return;
                          e.preventDefault();
                          setMenuMessageId(msg.id);
                          setMenuMessageText(msg.text);
                          setMenuIsMine(isMine);
                        }}
                      >
                        {/* Avatar for other user */}
                        {!isMine && (
                          <div className="shrink-0 mb-5">
                            {otherUser?.avatar_url ? (
                              <img src={otherUser.avatar_url} alt="" className="h-8 w-8 rounded-[40%] object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-[40%] bg-secondary">
                                <PuffyIcon name="user" size={14} />
                              </div>
                            )}
                          </div>
                        )}

                        <div className={`flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                          {sharedPostId && (
                            <SharedPostCard postId={sharedPostId} isMine={isMine} />
                          )}
                          {hasImage && !sharedPostId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setFullscreenImage(msg.image_url!); }}
                              className="overflow-hidden rounded-2xl max-w-[75vw]"
                            >
                              <img src={msg.image_url!} alt="" className="max-w-[240px] max-h-[300px] object-cover rounded-2xl" loading="lazy" />
                            </button>
                          )}
                          {hasText && (
                            <div className="relative">
                              <div className={`max-w-[75vw] rounded-2xl px-4 py-2.5 text-[15px] break-words ${
                                isDeleted
                                  ? "bg-muted text-muted-foreground italic"
                                  : isMine
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                              }`}>
                                {msg.text}
                              </div>
                              {/* Reaction indicator */}
                              {msg.hasReaction && (
                                <span className={`absolute -bottom-2.5 ${isMine ? "left-1" : "right-1"} text-sm`}>
                                  ❤️
                                </span>
                              )}
                            </div>
                          )}
                          <span className={`text-[10px] text-muted-foreground px-1 ${msg.hasReaction && hasText ? "mt-1.5" : ""}`}>
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
                   <img src={otherUser.avatar_url} alt="" className="h-8 w-8 rounded-[40%] object-cover" />
                 ) : (
                   <div className="flex h-8 w-8 items-center justify-center rounded-[40%] bg-secondary">
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

      {/* Edit banner */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-primary/5 px-4 py-2 shrink-0 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm text-primary">
              <span>✏️</span>
              <span className="font-medium">Editing message</span>
            </div>
            <button onClick={handleCancelEdit} className="text-xs text-muted-foreground font-medium">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

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
      {isRestricted ? (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pb-4 pt-3 z-50">
          <p className="text-center text-sm text-muted-foreground">You can't message this user</p>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-3 pb-4 pt-3 z-50">
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
                ref={chatInputRef}
                type="text"
                value={editingId ? editText : input}
                onChange={(e) => {
                  if (editingId) {
                    setEditText(e.target.value);
                  } else {
                    setInput(e.target.value);
                    broadcastTyping();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (editingId) handleSaveEdit();
                    else sendMessage();
                  }
                }}
                placeholder={editingId ? "Edit message..." : "Message..."}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Wave button when input is empty and not editing */}
            {!editingId && !input.trim() && !selectedFile ? (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleSendWave}
                className="shrink-0"
              >
                <img src={waveIcon} alt="wave" className="h-[22px] w-[22px] opacity-80 icon-adaptive-inverted" draggable={false} />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => editingId ? handleSaveEdit() : sendMessage()}
                disabled={editingId ? !editText.trim() : ((!input.trim() && !selectedFile) || sending || uploading)}
                className="shrink-0 text-primary transition-opacity disabled:opacity-30"
              >
                {uploading ? (
                  <div className="h-[18px] w-[18px] rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : editingId ? (
                  <PuffyIcon name="check" size={22} />
                ) : (
                  <PuffyIcon name="send" size={22} />
                )}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
