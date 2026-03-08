import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PuffyIcon from "@/components/PuffyIcon";

interface ShareSheetProps {
  postId: string;
  image: string;
  caption: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

const ShareSheet = ({ postId, image, caption, username, isOpen, onClose }: ShareSheetProps) => {
  const shareUrl = `${window.location.origin}/post/${postId}`;
  const shareText = `Check out this post by @${username}: "${caption}"`;
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Post by @${username}`, text: shareText, url: shareUrl });
        onClose();
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTo = (platform: string) => {
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);
    let url = "";

    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "telegram":
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(`Post by @${username}`)}&body=${encodedText}%20${encodedUrl}`;
        break;
    }

    if (url) window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const platforms = [
    { id: "whatsapp", label: "WhatsApp", color: "bg-[#25D366]", icon: "💬" },
    { id: "twitter", label: "X", color: "bg-foreground", icon: "𝕏" },
    { id: "facebook", label: "Facebook", color: "bg-[#1877F2]", icon: "f" },
    { id: "telegram", label: "Telegram", color: "bg-[#0088CC]", icon: "✈" },
    { id: "email", label: "Email", color: "bg-muted-foreground", icon: "✉" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-card border-t border-border shadow-[0_-10px_40px_-10px_hsl(var(--primary)/0.15)]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Post preview card */}
            <div className="mx-5 my-3 overflow-hidden rounded-2xl bg-secondary/60 backdrop-blur-sm border border-border/50">
              <div className="flex items-center gap-3 p-3">
                <img
                  src={image}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">@{username}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
                    {caption || "Shared a post"}
                  </p>
                </div>
              </div>
            </div>

            {/* Share to platforms - horizontal scroll */}
            <div className="px-5 py-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Share to
              </p>
              <div className="flex gap-5 overflow-x-auto pb-1">
                {platforms.map((p, i) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    onClick={() => handleShareTo(p.id)}
                    className="flex flex-col items-center gap-2 shrink-0"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${p.color} shadow-lg`}
                    >
                      <span className="text-xl text-white font-bold leading-none">
                        {p.icon}
                      </span>
                    </motion.div>
                    <span className="text-[11px] font-medium text-muted-foreground">{p.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="mx-5 mt-1 mb-2 rounded-2xl bg-secondary/60 backdrop-blur-sm border border-border/50 overflow-hidden divide-y divide-border/50">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${copied ? "bg-green-500/20" : "bg-primary/10"} transition-colors`}>
                  <PuffyIcon name={copied ? "check" : "copy"} size={18} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">
                    {copied ? "Copied!" : "Copy link"}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
                    {shareUrl}
                  </p>
                </div>
              </motion.button>

              {navigator.share && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <PuffyIcon name="send" size={18} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">More options...</span>
                </motion.button>
              )}
            </div>

            {/* Cancel */}
            <div className="px-5 pt-2 pb-5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full rounded-2xl bg-secondary py-3.5 text-sm font-bold text-secondary-foreground transition-colors active:bg-secondary/80"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareSheet;
