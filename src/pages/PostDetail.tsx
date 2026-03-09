import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import PostCard from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  caption: string;
  image_url: string;
  location: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar: string;
  verified: boolean;
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);

  // Auto-open comments if specified in URL
  const shouldOpenComments = searchParams.get("openComments") === "true";

  const fetchPost = async () => {
    if (!postId || !user) return;
    
    setLoading(true);
    
    // Fetch post with user profile data
    const { data: postData } = await supabase
      .from("posts")
      .select(`
        id, caption, image_url, location, created_at, user_id,
        profiles!posts_user_id_fkey(username, avatar_url, is_verified)
      `)
      .eq("id", postId)
      .single();

    if (!postData) {
      setLoading(false);
      return;
    }

    // Get likes count and check if user liked
    const { data: likes, count: likesCount } = await supabase
      .from("likes")
      .select("user_id", { count: "exact" })
      .eq("post_id", postId);

    const isLiked = likes?.some(like => like.user_id === user.id) || false;

    // Check if post is saved
    const { data: saved } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    const profile = postData.profiles as any;
    
    setPost({
      id: postData.id,
      caption: postData.caption || "",
      image_url: postData.image_url,
      location: postData.location || "",
      created_at: postData.created_at,
      user_id: postData.user_id,
      username: profile?.username || "user",
      avatar: profile?.avatar_url || "",
      verified: profile?.is_verified || false,
      likesCount: likesCount || 0,
      isLiked,
      isSaved: !!saved,
    });
    
    setLoading(false);
  };

  useEffect(() => {
    fetchPost();
  }, [postId, user]);

  useEffect(() => {
    if (shouldOpenComments && post && !loading) {
      setCommentOpen(true);
    }
  }, [shouldOpenComments, post, loading]);

  const handleDelete = () => {
    navigate(-1); // Go back after deletion
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={() => navigate(-1)}>
            <PuffyIcon name="arrow-left" size={24} />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Post</h1>
          <div className="w-6" />
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={() => navigate(-1)}>
            <PuffyIcon name="arrow-left" size={24} />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Post</h1>
          <div className="w-6" />
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PuffyIcon name="info" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Post</h1>
        <div className="w-6" />
      </div>

      {/* Post */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PostCard
          postId={post.id}
          postUserId={post.user_id}
          username={post.username}
          avatar={post.avatar}
          image={post.image_url}
          caption={post.caption}
          likesCount={post.likesCount}
          timeAgo={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          verified={post.verified}
          location={post.location}
          isLiked={post.isLiked}
          isSaved={post.isSaved}
          onDelete={handleDelete}
        />
      </motion.div>

      {/* Force open comment sheet if needed */}
      {commentOpen && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Comments</h2>
              <button onClick={() => setCommentOpen(false)}>
                <PuffyIcon name="chevron-down" size={24} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Comments will load here...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;