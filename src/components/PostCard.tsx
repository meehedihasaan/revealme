import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PostCardProps {
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  timeAgo: string;
  verified?: boolean;
  location?: string;
}

const PostCard = ({ username, avatar, image, caption, likes, timeAgo, verified, location }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [showHeart, setShowHeart] = useState(false);

  const handleDoubleTap = () => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const toggleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <div className="border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="gradient-story-red rounded-full p-[2px]">
          <div className="rounded-full border-[1.5px] border-background">
            <img src={avatar} alt={username} className="h-8 w-8 rounded-full object-cover" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">{username}</span>
            {verified && <span className="text-xs text-primary">✓</span>}
          </div>
          {location && (
            <p className="text-[11px] text-muted-foreground">{location}</p>
          )}
        </div>
        <button className="text-foreground">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Image */}
      <div
        className="relative w-full cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={image}
          alt="Post"
          className="w-full object-cover"
          style={{ maxHeight: "580px" }}
          draggable={false}
        />

        {/* Double-tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Heart size={80} className="fill-foreground text-foreground drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={toggleLike}
          >
            <Heart
              size={26}
              className={`transition-colors ${liked ? "fill-accent text-accent" : "text-foreground"}`}
            />
          </motion.button>
          <button className="text-foreground">
            <MessageCircle size={24} />
          </button>
          <button className="text-foreground">
            <Send size={22} />
          </button>
        </div>
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => setSaved(!saved)}>
          <Bookmark
            size={24}
            className={`transition-colors ${saved ? "fill-foreground text-foreground" : "text-foreground"}`}
          />
        </motion.button>
      </div>

      {/* Likes */}
      <div className="px-4">
        <p className="text-sm font-semibold text-foreground">
          {likeCount.toLocaleString()} likes
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 pb-1 pt-0.5">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{username}</span>{" "}
          <span className="text-foreground/90">{caption}</span>
        </p>
      </div>

      {/* View comments */}
      <div className="px-4 pb-1">
        <button className="text-sm text-muted-foreground">
          View all comments
        </button>
      </div>

      {/* Time */}
      <div className="px-4 pb-3">
        <p className="text-[10px] uppercase text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  );
};

export default PostCard;
