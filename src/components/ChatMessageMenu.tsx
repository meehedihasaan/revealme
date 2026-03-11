import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatMessageMenuProps {
  messageId: string;
  messageText: string;
  isMine: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (messageId: string, text: string) => void;
  onDeleted: (messageId: string) => void;
}

const ChatMessageMenu = ({ messageId, messageText, isMine, isOpen, onClose, onEdit, onDeleted }: ChatMessageMenuProps) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("messages").update({ text: "🚫 This message was deleted", image_url: null }).eq("id", messageId);
    if (error) {
      toast.error("Failed to delete message");
    } else {
      onDeleted(messageId);
      toast.success("Message deleted");
    }
    setDeleting(false);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    toast.success("Copied to clipboard");
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
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[200px] rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
          >
            <button
              onClick={handleCopy}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
            >
              📋 Copy
            </button>
            {isMine && (
              <button
                onClick={() => { onEdit(messageId, messageText); onClose(); }}
                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors flex items-center gap-2 border-t border-border/50"
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 border-t border-border/50"
            >
              🗑️ Delete
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatMessageMenu;
