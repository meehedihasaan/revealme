import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ThoughtBubbleProps {
  userId: string;
  isOwnProfile?: boolean;
}

const ThoughtBubble = ({ userId, isOwnProfile = false }: ThoughtBubbleProps) => {
  const { user } = useAuth();
  const [thought, setThought] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    if (!userId) return;
    const fetchThought = async () => {
      const { data } = await supabase
        .from("user_thoughts")
        .select("thought")
        .eq("user_id", userId)
        .maybeSingle();
      setThought(data?.thought || null);
      setLoading(false);
    };
    fetchThought();
  }, [userId]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = inputValue.trim();
    if (!trimmed) {
      await supabase.from("user_thoughts").delete().eq("user_id", user.id);
      setThought(null);
      setIsEditing(false);
      toast.success("Thought removed");
      return;
    }
    const { error } = await supabase
      .from("user_thoughts")
      .upsert({ user_id: user.id, thought: trimmed, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      toast.error("Failed to save thought");
      return;
    }
    setThought(trimmed);
    setIsEditing(false);
    toast.success("Thought updated!");
  };

  const handleDelete = async () => {
    if (!user) return;
    await supabase.from("user_thoughts").delete().eq("user_id", user.id);
    setThought(null);
    setShowDeleteConfirm(false);
    toast.success("Thought removed");
  };

  const handlePointerDown = () => {
    if (!isOwnProfile || !thought) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowDeleteConfirm(true);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!didLongPress.current && isOwnProfile) {
      setInputValue(thought || "");
      setIsEditing(true);
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  if (loading) return null;
  if (!thought && !isOwnProfile) return null;

  return (
    <>
      <div className="relative">
        {thought ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-1"
          >
            <div
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              className="relative max-w-[200px] cursor-pointer select-none"
            >
              <div className="relative rounded-2xl bg-foreground/90 px-3.5 py-1.5 shadow-lg">
                <p className="text-background text-[12px] font-medium leading-snug font-bangla whitespace-nowrap">
                  {thought}
                </p>
              </div>
              {/* Triangle tail */}
              <div
                className="absolute -bottom-[5px] left-3 w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid hsl(var(--foreground) / 0.9)',
                }}
              />
            </div>
          </motion.div>
        ) : isOwnProfile ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-1"
          >
            <button
              onClick={() => { setInputValue(""); setIsEditing(true); }}
              className="relative max-w-[180px]"
            >
              <div className="relative rounded-full bg-foreground/80 px-3.5 py-1.5 shadow-lg">
                <p className="text-background/70 text-[12px] font-medium font-bangla">Thinking about...</p>
              </div>
              <div
                className="absolute -bottom-[5px] left-3 w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '7px solid hsl(var(--foreground) / 0.8)',
                }}
              />
            </button>
          </motion.div>
        ) : null}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-xs rounded-2xl bg-card p-5 shadow-xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold text-foreground mb-1">Remove thought?</p>
              <p className="text-xs text-muted-foreground mb-4">This will delete your current thought.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-foreground mb-3 font-bangla">What's on your mind?</h3>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.slice(0, 100))}
                placeholder="Drop a thought..."
                maxLength={100}
                rows={2}
                autoFocus
                className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-bangla"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{inputValue.length}/100</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ThoughtBubble;
