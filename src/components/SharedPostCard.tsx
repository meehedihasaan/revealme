import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface SharedPostCardProps {
  postId: string;
  isMine: boolean;
}

interface PostPreview {
  id: string;
  image_url: string | null;
  caption: string | null;
  username: string;
  avatar_url: string | null;
}

// Parses shared post text format: [shared_post:<postId>]
export const parseSharedPost = (text: string): string | null => {
  const match = text.match(/\[shared_post:([a-f0-9-]+)\]/);
  return match ? match[1] : null;
};

const SharedPostCard = ({ postId, isMine }: SharedPostCardProps) => {
  const navigate = useNavigate();
  const [post, setPost] = useState<PostPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, caption, user_id")
        .eq("id", postId)
        .single();

      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("user_id", data.user_id)
          .single();

        setPost({
          id: data.id,
          image_url: data.image_url,
          caption: data.caption,
          username: profile?.username || "user",
          avatar_url: profile?.avatar_url || null,
        });
      }
      setLoading(false);
    };
    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="w-[240px] rounded-2xl overflow-hidden bg-secondary/50 animate-pulse">
        <div className="h-[180px] bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`rounded-2xl px-4 py-3 text-sm ${
        isMine ? "bg-primary/20 text-primary-foreground/70" : "bg-secondary text-muted-foreground"
      }`}>
        Post unavailable
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/post/${post.id}`)}
      className={`w-[240px] rounded-2xl overflow-hidden border text-left transition-all active:scale-[0.97] ${
        isMine
          ? "bg-primary/10 border-primary/20"
          : "bg-secondary/80 border-border/50"
      }`}
    >
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="w-full h-[180px] object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[8px]">👤</span>
            </div>
          )}
          <span className="text-xs font-semibold text-foreground">@{post.username}</span>
        </div>
        {post.caption && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {post.caption}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[10px] font-medium text-primary">View post →</span>
        </div>
      </div>
    </motion.button>
  );
};

export default SharedPostCard;
