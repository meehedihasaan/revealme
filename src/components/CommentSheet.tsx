import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  likes_count: number;
  is_liked: boolean;
  replies: Comment[];
}

interface CommentSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const CommentSheet = ({ postId, isOpen, onClose }: CommentSheetProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);

    const { data: commentsData } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
    const commentIds = commentsData.map((c: any) => c.id);

    const [{ data: profiles }, { data: allLikes }, { data: myLikes }] = await Promise.all([
      supabase.from("profiles").select("user_id, username, avatar_url, is_verified").in("user_id", userIds),
      supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds),
      user
        ? supabase.from("comment_likes").select("comment_id").in("comment_id", commentIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
    const likesCountMap: Record<string, number> = {};
    (allLikes || []).forEach((l: any) => {
      likesCountMap[l.comment_id] = (likesCountMap[l.comment_id] || 0) + 1;
    });
    const myLikesSet = new Set((myLikes || []).map((l: any) => l.comment_id));

    const enriched = commentsData.map((c: any) => ({
      ...c,
      username: profileMap[c.user_id]?.username || "user",
      avatar_url: profileMap[c.user_id]?.avatar_url || null,
      is_verified: profileMap[c.user_id]?.is_verified || false,
      likes_count: likesCountMap[c.id] || 0,
      is_liked: myLikesSet.has(c.id),
      replies: [] as Comment[],
    }));

    // Build thread tree
    const topLevel: Comment[] = [];
    const replyMap: Record<string, Comment[]> = {};
    enriched.forEach((c: Comment) => {
      if (c.parent_id) {
        if (!replyMap[c.parent_id]) replyMap[c.parent_id] = [];
        replyMap[c.parent_id].push(c);
      } else {
        topLevel.push(c);
      }
    });
    topLevel.forEach((c) => {
      c.replies = replyMap[c.id] || [];
    });

    setComments(topLevel);
    setLoading(false);
  }, [isOpen, postId, user]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const insertData: any = { post_id: postId, user_id: user.id, text };
    if (replyTo) insertData.parent_id = replyTo.id;

    const { data } = await supabase.from("comments").insert(insertData).select().single();

    if (data) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url, is_verified")
        .eq("user_id", user.id)
        .single();

      const newComment: Comment = {
        ...data,
        username: prof?.username || "you",
        avatar_url: prof?.avatar_url || null,
        is_verified: prof?.is_verified || false,
        likes_count: 0,
        is_liked: false,
        replies: [],
      };

      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...c.replies, newComment] } : c
          )
        );
        setExpandedReplies((prev) => new Set(prev).add(replyTo.id));
      } else {
        setComments((prev) => [...prev, newComment]);
      }
    }

    setReplyTo(null);
    setSending(false);
  };

  const handleDelete = async (commentId: string, parentId?: string | null) => {
    await supabase.from("comments").delete().eq("id", commentId);
    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) } : c
        )
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const toggleLike = async (commentId: string, parentId?: string | null) => {
    if (!user) return;
    const updateComment = (c: Comment): Comment => {
      if (c.id === commentId) {
        return {
          ...c,
          is_liked: !c.is_liked,
          likes_count: c.is_liked ? c.likes_count - 1 : c.likes_count + 1,
        };
      }
      return { ...c, replies: c.replies.map(updateComment) };
    };
    setComments((prev) => prev.map(updateComment));

    const target = comments.find((c) => c.id === commentId) ||
      comments.flatMap((c) => c.replies).find((r) => r.id === commentId);

    if (target?.is_liked) {
      await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
    }
  };

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isReply ? "ml-11" : ""}`}
    >
      {comment.avatar_url ? (
        <img
          src={comment.avatar_url}
          alt=""
          className={`shrink-0 avatar-leaf object-cover ${isReply ? "h-7 w-7" : "h-9 w-9"}`}
        />
      ) : (
        <div className={`flex shrink-0 items-center justify-center avatar-leaf bg-secondary ${isReply ? "h-7 w-7" : "h-9 w-9"}`}>
          <PuffyIcon name="user" size={isReply ? 12 : 14} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-snug flex items-center gap-1">{comment.username}{comment.is_verified && <VerifiedBadge size={12} />}</p>
        <p className="text-[13px] text-foreground leading-snug mt-0.5">{comment.text}</p>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-[11px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
          {comment.likes_count > 0 && (
            <span className="text-[11px] font-semibold text-muted-foreground">
              {comment.likes_count} {comment.likes_count === 1 ? "like" : "likes"}
            </span>
          )}
          {!isReply && (
            <button
              onClick={() => setReplyTo({ id: comment.id, username: comment.username })}
              className="text-[11px] font-semibold text-muted-foreground"
            >
              Reply
            </button>
          )}
          {isReply && (
            <button
              onClick={() => setReplyTo({ id: comment.parent_id || comment.id, username: comment.username })}
              className="text-[11px] font-semibold text-muted-foreground"
            >
              Reply
            </button>
          )}
          {comment.user_id === user?.id && (
            <button
              onClick={() => handleDelete(comment.id, isReply ? comment.parent_id : null)}
              className="text-[11px] text-destructive font-medium"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {/* Heart like button */}
      <button onClick={() => toggleLike(comment.id, isReply ? comment.parent_id : null)} className="shrink-0 pt-2">
        <motion.div animate={comment.is_liked ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.25 }}>
          <PuffyIcon name={comment.is_liked ? "heart-filled-red" : "heart"} size={14} />
        </motion.div>
      </button>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[60] flex flex-col bg-background"
        >
          {/* Header */}
          <div className="relative flex items-center justify-center border-b border-border px-4 py-3">
            <div className="absolute left-1/2 -top-0.5 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30" />
            <h3 className="text-base font-bold text-foreground">
              Comments{totalCount > 0 ? ` · ${totalCount}` : ""}
            </h3>
            <button onClick={onClose} className="absolute right-4 text-foreground">
              <PuffyIcon name="plus" size={20} className="rotate-45" />
            </button>
          </div>


          {/* Comment list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : totalCount === 0 ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <PuffyIcon name="message-circle" size={48} className="opacity-20 mb-3" />
                <p className="text-sm font-medium">No comments yet</p>
                <p className="text-xs mt-1">Start the conversation.</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="space-y-3">
                  <CommentItem comment={c} />
                  {/* Replies */}
                  {c.replies.length > 0 && (
                    <div className="ml-11">
                      {!expandedReplies.has(c.id) ? (
                        <button
                          onClick={() => setExpandedReplies((prev) => new Set(prev).add(c.id))}
                          className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground ml-10"
                        >
                          <span className="h-px w-6 bg-muted-foreground/40" />
                          View {c.replies.length} {c.replies.length === 1 ? "reply" : "replies"}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {c.replies.map((r) => (
                            <CommentItem key={r.id} comment={r} isReply />
                          ))}
                          <button
                            onClick={() => setExpandedReplies((prev) => {
                              const next = new Set(prev);
                              next.delete(c.id);
                              return next;
                            })}
                            className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground ml-10"
                          >
                            <span className="h-px w-6 bg-muted-foreground/40" />
                            Hide replies
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply indicator */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-secondary/50">
                  <span className="text-xs text-muted-foreground">
                    Replying to <span className="font-semibold text-foreground">{replyTo.username}</span>
                  </span>
                  <button onClick={() => setReplyTo(null)} className="text-muted-foreground">
                    <PuffyIcon name="plus" size={14} className="rotate-45" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="border-t border-border px-4 py-3 flex items-center gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={replyTo ? `Reply to ${replyTo.username}...` : "Add a comment..."}
              className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-full bg-primary p-2.5 transition-opacity disabled:opacity-30"
            >
              <PuffyIcon name="send" size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentSheet;
