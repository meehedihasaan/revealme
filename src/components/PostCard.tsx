import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
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
import heartAnimation from "@/assets/heart-animation.json";

const STORY_GRADIENT = "gradient-story-ring";

interface PostCardProps {
  postId: string;
  postUserId?: string;
  username: string;
  displayName?: string;
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
  commentCount?: number;
  hasStory?: boolean;
  postType?: string;
  viewCount?: number;
  level?: number;
}


const DoubleTapHeart = () => (
  <motion.div
    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.6 } }}
  >
    <Lottie animationData={heartAnimation} loop={false} autoplay style={{ width: 200, height: 200 }} />
  </motion.div>
);

const PostCard = memo(({
  postId,
  postUserId,
  username,
  displayName,
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
  commentCount: initialCommentCount = 0,
  hasStory: hasStoryProp = false,
  postType = "post",
}: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(likesCount);
  const [showHeart, setShowHeart] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  // Only fetch comment count if not provided
  useEffect(() => {
    if (initialCommentCount > 0) return;
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .then(({ count }) => setCommentCount(count || 0));
  }, [postId, initialCommentCount]);

  const handleDoubleTap = useCallback(() => {
    if (!liked) toggleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1100);
  }, [liked]);

  const toggleFollow = useCallback(async () => {
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
  }, [user, postUserId, followLoading, following, onFollowChange]);

  const toggleLike = useCallback(async () => {
    if (!user) return;
    setLiked(prev => {
      const wasLiked = prev;
      setLikeCount(c => wasLiked ? c - 1 : c + 1);
      // Fire and forget DB call
      if (wasLiked) {
        supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId).then(() => {});
      } else {
        supabase.from("likes").insert({ user_id: user.id, post_id: postId }).then(() => {});
      }
      return !wasLiked;
    });
  }, [user, postId]);

  const toggleSave = useCallback(async () => {
    if (!user) return;
    setSaved(prev => {
      const wasSaved = prev;
      if (wasSaved) {
        supabase.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", postId).then(() => {});
      } else {
        supabase.from("saved_posts").insert({ user_id: user.id, post_id: postId }).then(() => {});
      }
      return !wasSaved;
    });
  }, [user, postId]);

  const openComment = useCallback(() => setCommentOpen(true), []);
  const closeComment = useCallback(() => setCommentOpen(false), []);
  const openShare = useCallback(() => setShareOpen(true), []);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const openLikes = useCallback(() => setLikesOpen(true), []);
  const closeLikes = useCallback(() => setLikesOpen(false), []);

  const navigateToUser = useCallback(() => {
    navigate(postUserId === user?.id ? "/profile" : `/user/${postUserId}`);
  }, [navigate, postUserId, user?.id]);

  const navigateToStoryOrUser = useCallback(() => {
    if (hasStoryProp) {
      navigate(`/story?user=${postUserId}`);
    } else {
      navigateToUser();
    }
  }, [hasStoryProp, navigate, postUserId, navigateToUser]);

  // Reel-style card: normal header + video with caption overlay + normal actions below
  if (postType === "reel" && image) {
    const isVideo = image.match(/\.(mp4|mov|webm|ogg)(\?|$)/i);
    return (
      <div className="border-b border-border">
        {/* Video/Image area - tappable to go to Reels */}
        <button
          onClick={() => navigate("/reels")}
          className="relative w-full aspect-[9/16] overflow-hidden bg-black block"
        >
          {isVideo ? (
            <video src={image} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={image} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

          {/* Play icon center */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-14 w-14 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                <PuffyIcon name="play" size={24} className="!brightness-0 !invert" />
              </div>
            </div>
          )}

          {/* Header overlay at top */}
          <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-4 py-2.5 z-10">
            <div className={`avatar-leaf-ring p-[1.5px] ${hasStoryProp ? STORY_GRADIENT : ""}`}>
              <div className={`avatar-leaf overflow-hidden ${hasStoryProp ? "border-[1.5px] border-background" : ""}`}>
                {avatar ? (
                  <img src={avatar} alt={username} className="h-9 w-9 avatar-leaf object-cover block" loading="lazy" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center avatar-leaf bg-white/20">
                    <PuffyIcon name="user" size={16} className="!brightness-0 !invert" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-white">{displayName || username}</span>
                {verified && <VerifiedBadge size={15} />}
              </div>
              <p className="text-[11px] text-white/60">{timeAgo}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <PuffyIcon name="reels" size={16} className="!brightness-0 !invert" />
            </div>
          </div>

          {/* Caption overlay at bottom - truncated to 1 line */}
          {caption && (
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
              <p className="text-white text-sm line-clamp-1 leading-snug text-left">{caption}</p>
            </div>
          )}
        </button>

        {/* Normal actions bar like other posts */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1 active:scale-90 transition-transform duration-100" onClick={toggleLike}>
              {liked ? (
                <img src={heartFilledRedIcon} alt="liked" width={26} height={26} className="inline-block shrink-0" draggable={false} />
              ) : (
                <PuffyIcon name="heart" size={26} />
              )}
              <span className="text-sm font-semibold text-foreground" onClick={(e) => { e.stopPropagation(); openLikes(); }}>{likeCount > 0 ? likeCount.toLocaleString() : ""}</span>
            </button>
            <button className="flex items-center gap-1" onClick={openComment}>
              <PuffyIcon name="message-circle" size={24} />
              <span className="text-sm font-semibold text-foreground">{commentCount > 0 ? commentCount.toLocaleString() : ""}</span>
            </button>
            <button className="flex items-center gap-1" onClick={openShare}>
              <PuffyIcon name="send" size={22} />
            </button>
          </div>
          <button className="active:scale-90 transition-transform duration-100" onClick={toggleSave}>
            <PuffyIcon name="bookmark" size={24} className={saved ? "opacity-100" : "opacity-70"} />
          </button>
        </div>

        {/* Time */}
        <div className="px-4 pt-0 pb-3">
          <p className="text-[10px] uppercase text-muted-foreground">{timeAgo}</p>
        </div>

        {commentOpen && <CommentSheet postId={postId} isOpen={commentOpen} onClose={closeComment} />}
        {shareOpen && <ShareSheet postId={postId} image={image} caption={caption} username={username} isOpen={shareOpen} onClose={closeShare} />}
        {likesOpen && <LikesSheet postId={postId} isOpen={likesOpen} onClose={closeLikes} likesCount={likeCount} />}
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button onClick={navigateToStoryOrUser} className={`avatar-leaf-ring p-[1.5px] ${hasStoryProp ? STORY_GRADIENT : ""}`}>
          <div className={`avatar-leaf overflow-hidden ${hasStoryProp ? "border-[1.5px] border-background" : ""}`}>
            {avatar ? (
              <img src={avatar} alt={username} className="h-9 w-9 avatar-leaf object-cover block" loading="lazy" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center avatar-leaf bg-secondary">
                <PuffyIcon name="user" size={16} />
              </div>
            )}
          </div>
        </button>
        <button onClick={navigateToUser} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-foreground">{displayName || username}</span>
            {verified && <VerifiedBadge size={15} />}
          </div>
          {!image && <p className="text-[11px] text-muted-foreground">@{username}</p>}
          {image && location && <p className="text-[11px] text-muted-foreground">{location}</p>}
          {image && !location && <p className="text-[11px] text-muted-foreground">@{username}</p>}
        </button>
        {showFollowButton && !following && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleFollow}
            disabled={followLoading}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <PuffyIcon name="plus" size={12} className="!brightness-0 !invert" />
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

      {/* Image/Video or Text-only post */}
      {image ? (
        <PostImageCarousel postId={postId} mainImage={image} onDoubleTap={handleDoubleTap} showHeart={showHeart} HeartComponent={DoubleTapHeart} />
      ) : (
        <div className="relative px-4 py-1.5" onDoubleClick={handleDoubleTap}>
          <p className="text-[15px] text-foreground leading-snug whitespace-pre-line">{caption}</p>
          <AnimatePresence>{showHeart && <DoubleTapHeart />}</AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 active:scale-90 transition-transform duration-100" onClick={toggleLike}>
            {liked ? (
              <img src={heartFilledRedIcon} alt="liked" width={26} height={26} className="inline-block shrink-0" draggable={false} />
            ) : (
              <PuffyIcon name="heart" size={26} />
            )}
            <span className="text-sm font-semibold text-foreground" onClick={(e) => { e.stopPropagation(); openLikes(); }}>{likeCount > 0 ? likeCount.toLocaleString() : ""}</span>
          </button>
          <button className="flex items-center gap-1" onClick={openComment}>
            <PuffyIcon name="message-circle" size={24} />
            <span className="text-sm font-semibold text-foreground">{commentCount > 0 ? commentCount.toLocaleString() : ""}</span>
          </button>
          <button className="flex items-center gap-1" onClick={openShare}>
            <PuffyIcon name="send" size={22} />
          </button>
        </div>
        <button className="active:scale-90 transition-transform duration-100" onClick={toggleSave}>
          <PuffyIcon name="bookmark" size={24} className={saved ? "opacity-100" : "opacity-70"} />
        </button>
      </div>

      {/* Caption - only show if post has an image */}
      {image && caption && (
        <div className="px-4 pt-1">
          <p className="text-sm text-foreground">
            <span className="font-semibold">@{username}</span>{" "}
            {caption.length > 100 && !captionExpanded ? (
              <>
                <span className="text-foreground/90">{caption.slice(0, 100)}...</span>{" "}
                <button onClick={() => setCaptionExpanded(true)} className="text-muted-foreground text-sm">
                  more
                </button>
              </>
            ) : (
              <span className="text-foreground/90">{caption}</span>
            )}
          </p>
        </div>
      )}

      {/* Time */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-[10px] uppercase text-muted-foreground">{timeAgo}</p>
      </div>

      {commentOpen && <CommentSheet postId={postId} isOpen={commentOpen} onClose={closeComment} />}
      {shareOpen && <ShareSheet postId={postId} image={image} caption={caption} username={username} isOpen={shareOpen} onClose={closeShare} />}
      {likesOpen && <LikesSheet postId={postId} isOpen={likesOpen} onClose={closeLikes} likesCount={likeCount} />}
    </div>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;
