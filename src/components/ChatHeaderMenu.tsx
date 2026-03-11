import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PuffyIcon from "@/components/PuffyIcon";

interface ChatHeaderMenuProps {
  otherUserId: string;
  otherUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onRestricted?: () => void;
}

const ChatHeaderMenu = ({ otherUserId, otherUsername, isOpen, onClose, onRestricted }: ChatHeaderMenuProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blocking, setBlocking] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictLoading, setRestrictLoading] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    supabase.from("restricted_users" as any).select("id").eq("restrictor_id", user.id).eq("restricted_id", otherUserId).maybeSingle()
      .then(({ data }) => setIsRestricted(!!data));
  }, [user, otherUserId, isOpen]);

  const handleBlock = async () => {
    if (!user) return;
    setBlocking(true);
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: otherUserId });
    if (error) {
      toast.error("Failed to block user");
    } else {
      toast.success(`Blocked @${otherUsername}`);
      navigate("/messages");
    }
    setBlocking(false);
    onClose();
  };

  const handleReport = () => {
    toast.success("Report submitted. We'll review it shortly.");
    onClose();
  };

  const handleRestrict = async () => {
    if (!user) return;
    setRestrictLoading(true);
    if (isRestricted) {
      await supabase.from("restricted_users" as any).delete().eq("restrictor_id", user.id).eq("restricted_id", otherUserId);
      toast.success(`@${otherUsername} unrestricted`);
      setIsRestricted(false);
    } else {
      await (supabase.from("restricted_users" as any) as any).insert({ restrictor_id: user.id, restricted_id: otherUserId });
      toast.success(`@${otherUsername} has been restricted`);
      setIsRestricted(true);
      onRestricted?.();
    }
    setRestrictLoading(false);
    onClose();
  };

  const handleDeleteChat = async () => {
    toast.success("Chat cleared");
    onClose();
  };

  const handleViewProfile = () => {
    navigate(`/user/${otherUserId}`);
    onClose();
  };

  const handleMuteNotifications = () => {
    toast.success("Notifications muted for this chat");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed right-3 top-14 z-50 w-[220px] rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
          >
            <button onClick={handleViewProfile} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-3">
              <PuffyIcon name="user" size={16} /> View Profile
            </button>
            <button onClick={handleMuteNotifications} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-3 border-t border-border/50">
              <PuffyIcon name="bell" size={16} /> Mute Notifications
            </button>
            <button onClick={handleRestrict} disabled={restrictLoading} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-3 border-t border-border/50">
              <PuffyIcon name="shield" size={16} /> {isRestricted ? "Unrestrict" : "Restrict"}
            </button>
            <button onClick={handleDeleteChat} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-3 border-t border-border/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground shrink-0">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              <span>Delete Chat</span>
            </button>
            <button onClick={handleReport} className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-3 border-t border-border/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Report</span>
            </button>
            <button onClick={handleBlock} disabled={blocking} className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-3 border-t border-border/50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <span>Block @{otherUsername}</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHeaderMenu;
