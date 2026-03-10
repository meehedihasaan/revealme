import { useState, useEffect } from "react";
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
      // Delete thought
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

  if (loading) return null;

  // Show "Drop a thought..." prompt only on own profile when no thought exists
  if (!thought && !isOwnProfile) return null;

  return (
    <>
      <div className="relative">
        {/* The bubble */}
        {thought ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-1"
          >
            <button
              onClick={isOwnProfile ? () => { setInputValue(thought || ""); setIsEditing(true); } : undefined}
              className="relative max-w-[200px]"
            >
              {/* Bubble body */}
              <div className="relative rounded-2xl bg-foreground/90 backdrop-blur-sm px-3 py-1.5 shadow-lg">
                {/* Quote marks */}
                <span className="absolute -top-2 -left-1 text-primary text-xl font-bold leading-none font-bangla">"</span>
                <p className="text-background text-xs font-medium leading-snug font-bangla line-clamp-2 pr-2 pl-2">
                  {thought}
                </p>
                <span className="absolute -bottom-2.5 -right-0.5 text-primary text-xl font-bold leading-none font-bangla rotate-180">"</span>
              </div>
              {/* Bubble tail - two circles like Facebook */}
              <div className="flex flex-col items-start ml-4 -mt-0.5">
                <div className="h-2 w-2 rounded-full bg-foreground/90" />
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/90 ml-0.5 mt-0.5" />
              </div>
            </button>
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
              <div className="relative rounded-2xl bg-foreground/80 backdrop-blur-sm px-3 py-1.5 shadow-lg">
                <p className="text-background/70 text-xs font-medium font-bangla">Drop a thought...</p>
              </div>
              <div className="flex flex-col items-start ml-4 -mt-0.5">
                <div className="h-2 w-2 rounded-full bg-foreground/80" />
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/80 ml-0.5 mt-0.5" />
              </div>
            </button>
          </motion.div>
        ) : null}
      </div>

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
                  {thought && (
                    <button
                      onClick={async () => {
                        setInputValue("");
                        await handleSave();
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-destructive"
                    >
                      Remove
                    </button>
                  )}
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
