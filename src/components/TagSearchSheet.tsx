import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TagSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: { user_id: string; username: string; avatar_url: string | null }) => void;
  taggedUserIds: string[];
}

const TagSearchSheet = ({ isOpen, onClose, onSelect, taggedUserIds }: TagSearchSheetProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .neq("user_id", user?.id || "")
        .ilike("username", `%${searchQuery}%`)
        .limit(10);
      const taggedSet = new Set(taggedUserIds);
      setSearchResults((data || []).filter(p => !taggedSet.has(p.user_id)));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user, taggedUserIds]);

  useEffect(() => {
    if (!isOpen) { setSearchQuery(""); setSearchResults([]); }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-card border-t border-border max-h-[60vh] flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
            </div>
            <p className="text-center text-sm font-semibold text-foreground pb-2">Tag a person</p>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2.5">
                <PuffyIcon name="search" size={16} className="opacity-50" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 pb-8">
              {searchResults.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => onSelect(p)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary/50"
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="h-10 w-10 rounded-[65%] object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-[65%] bg-secondary">
                      <PuffyIcon name="user" size={18} />
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">@{p.username}</span>
                </button>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TagSearchSheet;
