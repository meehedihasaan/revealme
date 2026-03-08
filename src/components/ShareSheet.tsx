import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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
    toast.success("Link copied to clipboard!");
    onClose();
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
    }

    if (url) window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const platforms = [
    { id: "whatsapp", label: "WhatsApp", emoji: "💬" },
    { id: "twitter", label: "X / Twitter", emoji: "🐦" },
    { id: "facebook", label: "Facebook", emoji: "📘" },
    { id: "telegram", label: "Telegram", emoji: "✈️" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-2xl bg-card border-t border-border"
          >
            <div className="flex justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-2">
              <h3 className="text-base font-bold text-foreground">Share post</h3>
            </div>

            {/* Post preview */}
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl bg-secondary p-3">
              <img src={image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">@{username}</p>
                <p className="text-xs text-muted-foreground truncate">{caption}</p>
              </div>
            </div>

            {/* Share platforms */}
            <div className="flex justify-around px-4 pb-4">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleShareTo(p.id)}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-3 py-2 active:bg-secondary/50 transition-colors"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{p.label}</span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-border divide-y divide-border">
              <button
                onClick={handleNativeShare}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/50 transition-colors"
              >
                <span className="text-lg">📤</span>
                <span className="text-sm font-medium text-foreground">Share via...</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-secondary/50 transition-colors"
              >
                <span className="text-lg">🔗</span>
                <span className="text-sm font-medium text-foreground">Copy link</span>
              </button>
            </div>

            {/* Cancel */}
            <div className="p-4 pt-2">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareSheet;
