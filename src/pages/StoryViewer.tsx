import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";

interface StoryData {
  id: string;
  image_url: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

const StoryViewer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user");
  const [stories, setStories] = useState<StoryData[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const fetchStories = async () => {
      // Stories from last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("id, image_url, created_at, user_id")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) {
        navigate(-1);
        return;
      }

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", userId)
        .single();

      setStories(data.map(s => ({
        ...s,
        username: profileData?.username || "user",
        avatar_url: profileData?.avatar_url || null,
      })));
    };
    fetchStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length === 0) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (current < stories.length - 1) {
            setCurrent(c => c + 1);
            return 0;
          } else {
            navigate(-1);
            return 100;
          }
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [current, stories.length]);

  const handleTap = (e: React.MouseEvent) => {
    const x = e.clientX;
    const mid = window.innerWidth / 2;
    if (x < mid) {
      if (current > 0) { setCurrent(c => c - 1); setProgress(0); }
    } else {
      if (current < stories.length - 1) { setCurrent(c => c + 1); setProgress(0); }
      else navigate(-1);
    }
  };

  if (stories.length === 0) return null;
  const story = stories[current];

  return (
    <div className="fixed inset-0 z-50 bg-background" onClick={handleTap}>
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 rounded-full bg-foreground/20 overflow-hidden">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: i < current ? "100%" : i === current ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-2">
        <img src={story.avatar_url || ""} alt="" className="h-8 w-8 rounded-full object-cover bg-secondary" />
        <span className="text-sm font-semibold text-foreground">{story.username}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div className="flex-1" />
        <button onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
          <PuffyIcon name="arrow-left" size={20} />
        </button>
      </div>

      {/* Image */}
      <img src={story.image_url} alt="Story" className="h-full w-full object-contain" />
    </div>
  );
};

export default StoryViewer;
