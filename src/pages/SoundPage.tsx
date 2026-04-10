import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const W = "!brightness-0 !invert";

const SoundPage = () => {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [originalPost, setOriginalPost] = useState<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;

    const fetchSound = async () => {
      // Get the original post
      const { data: post } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (!post) { setLoading(false); return; }
      setOriginalPost(post);

      // Get the creator's profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, is_verified")
        .eq("user_id", post.user_id)
        .single();
      setProfile(prof);

      // Get all reels (for now, show reels by same user as "using this audio")
      const { data: allReels } = await supabase
        .from("posts")
        .select("*")
        .eq("post_type", "reel")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      setReels(allReels || []);
      setLoading(false);
    };

    fetchSound();
  }, [postId]);

  const audioName = profile ? `Original audio · ${profile.username}` : "Original audio";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 safe-top">
          <button onClick={() => navigate(-1)}>
            <PuffyIcon name="arrow-left" size={24} />
          </button>
          <h1 className="text-lg font-bold text-foreground flex-1 truncate">Audio</h1>
        </div>
      </div>

      {/* Audio info */}
      <div className="px-4 py-4 flex items-center gap-4">
        {/* Spinning disc */}
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-foreground/20 to-foreground/5 flex items-center justify-center shrink-0 animate-spin-slow">
          <div className="h-6 w-6 rounded-full bg-background" />
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="absolute inset-2 rounded-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate">{audioName}</p>
          {profile && (
            <button
              onClick={() => navigate(profile.user_id === user?.id ? "/profile" : `/user/${profile.user_id}`)}
              className="flex items-center gap-1 mt-0.5"
            >
              <span className="text-sm text-muted-foreground">{profile.display_name || profile.username}</span>
              {profile.is_verified && <VerifiedBadge size={12} />}
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-1">{reels.length} clips</p>
        </div>
      </div>

      {/* Use this audio button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate("/create-reel")}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
        >
          Use this audio
        </button>
      </div>

      {/* Reels grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {reels.map((reel) => (
          <button
            key={reel.id}
            onClick={() => navigate(`/post/${reel.id}`)}
            className="relative aspect-[9/16] overflow-hidden bg-secondary"
          >
            {reel.image_url?.match(/\.(mp4|mov|webm|ogg)(\?|$)/i) ? (
              <video src={reel.image_url} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <img src={reel.image_url} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute bottom-1 left-1 flex items-center gap-1">
              <PuffyIcon name="reels" size={10} className="!brightness-0 !invert opacity-80" />
              <span className="text-white text-[10px] font-medium drop-shadow-lg">
                {Math.floor(Math.random() * 900) + 100}
              </span>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default SoundPage;
