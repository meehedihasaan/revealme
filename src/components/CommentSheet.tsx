import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchComments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p])
      );

      setComments(
        data.map((c) => ({
          ...c,
          username: profileMap[c.user_id]?.username || "user",
          avatar_url: profileMap[c.user_id]?.avatar_url || null,
        }))
      );
      setLoading(false);
    };
    fetchComments();
  }, [isOpen, postId]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: user.id, text })
      .select()
      .single();

    if (data) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .single();

      setComments((prev) => [
        ...prev,
        {
          ...data,
          username: prof?.username || "you",
          avatar_url: prof?.avatar_url || null,
        },
      ]);
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md flex flex-col rounded-t-2xl bg-card border-t border-border"
            style={{ maxHeight: "70vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-2">
              <h3 className="text-base font-bold text-foreground">
                Comments ({comments.length})
              </h3>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <PuffyIcon name="message-circle" size={36} className="opacity-30 mb-2" />
                  <p className="text-sm">No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <PuffyIcon name="user" size={14} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{c.username}</span>{" "}
                        {c.text}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(c.created_at)}
                        </span>
                        {c.user_id === user?.id && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-[10px] text-destructive font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Add a comment..."
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
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentSheet;
