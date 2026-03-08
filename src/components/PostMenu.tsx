import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PostMenuProps {
  postId: string;
  postUserId: string;
  onDelete?: () => void;
}

const PostMenu = ({ postId, postUserId, onDelete }: PostMenuProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = user?.id === postUserId;

  const handleDelete = async () => {
    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", user?.id || "");
    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      onDelete?.();
    }
    setOpen(false);
    setConfirmDelete(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success("Link copied!");
    setOpen(false);
  };

  const handleReport = () => {
    toast.success("Post reported. We'll review it.");
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>
        <PuffyIcon name="more-horizontal" size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => { setOpen(false); setConfirmDelete(false); }}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-card border-t border-border pb-8"
            >
              <div className="flex justify-center py-3">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {confirmDelete ? (
                <div className="px-4 py-4 space-y-4">
                  <p className="text-center text-foreground font-semibold">Delete this post?</p>
                  <p className="text-center text-sm text-muted-foreground">This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <button onClick={handleCopyLink} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                    <PuffyIcon name="copy" size={20} />
                    <span className="text-sm font-medium text-foreground">Copy link</span>
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left"
                    >
                      <span className="text-destructive"><PuffyIcon name="edit" size={20} /></span>
                      <span className="text-sm font-medium text-destructive">Delete post</span>
                    </button>
                  )}
                  {!isOwner && (
                    <button onClick={handleReport} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                      <span className="text-destructive"><PuffyIcon name="info" size={20} /></span>
                      <span className="text-sm font-medium text-destructive">Report</span>
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                    <PuffyIcon name="arrow-left" size={20} />
                    <span className="text-sm font-medium text-foreground">Cancel</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PostMenu;
