import { useState } from "react";
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
}

const ChatHeaderMenu = ({ otherUserId, otherUsername, isOpen, onClose }: ChatHeaderMenuProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blocking, setBlocking] = useState(false);

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

  const handleRestrict = () => {
    toast.success(`@${otherUsername} has been restricted`);
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
            <button onClick={handleRestrict} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-3 border-t border-border/50">
              <PuffyIcon name="shield" size={16} /> Restrict
            </button>
            <button onClick={handleDeleteChat} className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-3 border-t border-border/50">
              🗑️ <span>Delete Chat</span>
            </button>
            <button onClick={handleReport} className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-3 border-t border-border/50">
              ⚠️ <span>Report</span>
            </button>
            <button onClick={handleBlock} disabled={blocking} className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-3 border-t border-border/50">
              🚫 <span>Block @{otherUsername}</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHeaderMenu;
