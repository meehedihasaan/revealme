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
      <div className="w-[220px] rounded-[20px] overflow-hidden bg-card border border-border/60 shadow-sm animate-pulse">
        <div className="h-[160px] bg-muted" />
        <div className="p-3 space-y-2">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`rounded-[20px] px-4 py-3 text-sm border ${
        isMine ? "bg-primary/10 border-primary/20 text-foreground/70" : "bg-card border-border text-muted-foreground"
      }`}>
        Post unavailable
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate(`/post/${post.id}`)}
      className={`w-[220px] rounded-[20px] overflow-hidden border text-left transition-all shadow-sm hover:shadow-md ${
        isMine
          ? "bg-card border-primary/15 shadow-primary/8"
          : "bg-card border-border/60 shadow-black/5"
      }`}
    >
      {/* Image */}
      {post.image_url && (
        <div className="relative">
          <img
            src={post.image_url}
            alt=""
            className="w-full h-[160px] object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1.5">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt="" className="h-5 w-5 avatar-leaf object-cover ring-1 ring-border/50" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border/50">
              <span className="text-[8px] text-muted-foreground">👤</span>
            </div>
          )}
          <span className="text-[11px] font-bold text-foreground truncate flex-1">@{post.username}</span>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
            {post.caption}
          </p>
        )}

        {/* CTA */}
        <div className="flex items-center gap-1 pt-1 border-t border-border/40">
          <span className="text-[10px] font-semibold text-primary mt-1">View post</span>
          <span className="text-[10px] text-primary mt-1">→</span>
        </div>
      </div>
    </motion.button>
  );
};

export default SharedPostCard;
