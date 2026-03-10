import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CommentSheet from "@/components/CommentSheet";
import ShareSheet from "@/components/ShareSheet";
import PostMenu from "@/components/PostMenu";
import LikesSheet from "@/components/LikesSheet";
import PostImageCarousel from "@/components/PostImageCarousel";
import heartFilledRedIcon from "@/assets/icons/heart-filled-red.png";

interface PostCardProps {
  postId: string;
  postUserId?: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likesCount: number;
  timeAgo: string;
  verified?: boolean;
  location?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  onDelete?: () => void;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollowChange?: (userId: string, isNowFollowing: boolean) => void;
}

const DoubleTapHeart = () => (
  <motion.div
    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.6 } }}
  >
    <motion.svg
      width="90"
      height="90"
      viewBox="0 0 24 24"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1.2, 0.95, 1],
        opacity: [0, 1, 1, 1],
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill="white"
      />
    </motion.svg>
  </motion.div>
);



const PostCard = ({
  postId,
  postUserId,
  username,
  avatar,
  image,
  caption,
  likesCount,
  timeAgo,
  verified,
  location,
  isLiked: initialLiked = false,
  isSaved: initialSaved = false,
  onDelete,
  showFollowButton = false,
  isFollowing: initialFollowing = false,
  onFollowChange,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(likesCount);
  const [hasStory, setHasStory] = useState(false);

  // Check if post user has active stories
  useEffect(() => {
    if (!postUserId) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", postUserId)
      .gte("created_at", since)
      .then(({ count }) => setHasStory((count || 0) > 0));
  }, [postUserId]);
  const [showHeart, setShowHeart] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .then(({ count }) => setCommentCount(count || 0));
  }, [postId]);

  const handleDoubleTap = () => {
    if (!liked) toggleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1100);
  };

  const toggleFollow = async () => {
    if (!user || !postUserId || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    onFollowChange?.(postUserId, !wasFollowing);

    if (wasFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", postUserId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: postUserId });
    }
    setFollowLoading(false);
  };

  const toggleLike = async () => {
    if (!user) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));
    if (wasLiked) {
      await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId);
    } else {
      await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    const wasSaved = saved;
    setSaved(!wasSaved);
    if (wasSaved) {
      await supabase.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", postId);
    } else {
      await supabase.from("saved_posts").insert({ user_id: user.id, post_id: postId });
    }
  };

  return (
    <div className="border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          onClick={() => {
            if (hasStory) {
              navigate(`/story?user=${postUserId}`);
            } else {
              navigate(postUserId === user?.id ? "/profile" : `/user/${postUserId}`);
            }
          }}
          className={`rounded-xl p-[2px] ${hasStory ? "gradient-story-red" : ""}`}
        >
          <div className={`rounded-xl ${hasStory ? "border-[1.5px] border-background" : ""}`}>
            {avatar ? (
              <img src={avatar} alt={username} className="h-8 w-8 rounded-xl object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                <PuffyIcon name="user" size={16} />
              </div>
            )}
          </div>
        </button>
        <button onClick={() => navigate(postUserId === user?.id ? "/profile" : `/user/${postUserId}`)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">{username}</span>
            {verified && <VerifiedBadge size={15} />}
          </div>
          {location && <p className="text-[11px] text-muted-foreground">{location}</p>}
        </button>
        {showFollowButton && !following && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleFollow}
            disabled={followLoading}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <PuffyIcon name="plus" size={12} />
            Follow
          </motion.button>
        )}
        {showFollowButton && following && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleFollow}
            disabled={followLoading}
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition-opacity disabled:opacity-50"
          >
            <PuffyIcon name="check" size={12} />
            Following
          </motion.button>
        )}
        <PostMenu postId={postId} postUserId={postUserId || ""} caption={caption} location={location} onDelete={onDelete} />
      </div>

      {/* Image Carousel or Text-only post */}
      {image ? (
        <PostImageCarousel postId={postId} mainImage={image} onDoubleTap={handleDoubleTap} showHeart={showHeart} HeartComponent={DoubleTapHeart} />
      ) : (
        <div
          className="relative px-5 py-4"
          onDoubleClick={handleDoubleTap}
        >
          <p className="text-[15px] text-foreground leading-relaxed">{caption}</p>
          <AnimatePresence>{showHeart && <DoubleTapHeart />}</AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike}>
            <motion.div animate={liked ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
              {liked ? (
                <img src={heartFilledRedIcon} alt="liked" width={26} height={26} className="inline-block shrink-0" draggable={false} />
              ) : (
                <PuffyIcon name="heart" size={26} />
              )}
            </motion.div>
          </motion.button>
          <button onClick={() => setCommentOpen(true)}>
            <PuffyIcon name="message-circle" size={24} />
          </button>
          <button onClick={() => setShareOpen(true)}>
            <PuffyIcon name="send" size={22} />
          </button>
        </div>
        <motion.button whileTap={{ scale: 0.8 }} onClick={toggleSave}>
          <PuffyIcon name="bookmark" size={24} className={saved ? "opacity-100" : "opacity-70"} />
        </motion.button>
      </div>

      {/* Likes - clickable */}
      <div className="px-4">
        <button onClick={() => setLikesOpen(true)} className="text-sm font-semibold text-foreground">
          {likeCount.toLocaleString()} likes
        </button>
      </div>

      {/* Caption - only show if post has an image (text-only posts already display the text) */}
      {image && caption && (
        <div className="px-4 pb-1 pt-0.5">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{username}</span>{" "}
            <span className="text-foreground/90">{caption}</span>
          </p>
        </div>
      )}

      {/* View comments */}
      <button onClick={() => setCommentOpen(true)} className="px-4 pb-1">
        <span className="text-xs text-muted-foreground">View comments</span>
      </button>

      {/* Time */}
      <div className="px-4 pb-3">
        <p className="text-[10px] uppercase text-muted-foreground">{timeAgo}</p>
      </div>

      <CommentSheet postId={postId} isOpen={commentOpen} onClose={() => setCommentOpen(false)} />
      <ShareSheet postId={postId} image={image} caption={caption} username={username} isOpen={shareOpen} onClose={() => setShareOpen(false)} />
      <LikesSheet postId={postId} isOpen={likesOpen} onClose={() => setLikesOpen(false)} likesCount={likeCount} />
    </div>
  );
};

export default PostCard;
