import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import { FeedShimmer } from "@/components/ShimmerLoader";
import { useAuth } from "@/contexts/AuthContext";
import { usePosts } from "@/hooks/usePosts";
import { supabase } from "@/integrations/supabase/client";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";

interface StoryUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

const tabs = ["For you", "Believing", "favourites"];

const Feed = () => {
  const [activeTab, setActiveTab] = useState("For you");
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { posts, loading } = usePosts();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [userHasStory, setUserHasStory] = useState(false);

  useEffect(() => {
    const fetchStories = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("user_id")
        .gte("created_at", since);
      if (!data) return;

      const uniqueIds = [...new Set(data.map(s => s.user_id))];
      if (user && uniqueIds.includes(user.id)) setUserHasStory(true);

      const otherIds = uniqueIds.filter(id => id !== user?.id);
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", otherIds);
        setStoryUsers(profiles || []);
      }
    };
    fetchStories();
  }, [user]);

  const savedPosts = posts.filter(p => p.isSaved);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-reveal text-2xl text-foreground">Reveal.</h1>
        <div className="flex items-center gap-3">
          <button className="relative text-foreground" onClick={() => navigate("/messages")}>
            <PuffyIcon name="message-circle" size={24} />
          </button>
          <button className="rounded-full border border-border p-1 text-foreground" onClick={() => navigate("/create-post")}>
            <PuffyIcon name="plus" size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
        {/* Your story */}
        <button
          onClick={() => userHasStory ? navigate(`/story?user=${user?.id}`) : navigate("/create-story")}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <div className={`rounded-full p-[3px] ${userHasStory ? "gradient-story-green" : ""}`}>
            <div className="rounded-full border-2 border-background relative">
              <img src={profile?.avatar_url || story1} alt="You" className="h-16 w-16 rounded-full object-cover" />
              {!userHasStory && (
                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary border-2 border-background">
                  <PuffyIcon name="plus" size={10} />
                </div>
              )}
            </div>
          </div>
          <span className="max-w-[72px] truncate text-xs text-foreground">Your story</span>
        </button>

        {storyUsers.map((su) => (
          <button
            key={su.user_id}
            onClick={() => navigate(`/story?user=${su.user_id}`)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className="rounded-full p-[3px] gradient-story-red">
              <div className="rounded-full border-2 border-background">
                <img src={su.avatar_url || story2} alt={su.username} className="h-16 w-16 rounded-full object-cover" />
              </div>
            </div>
            <span className="max-w-[72px] truncate text-xs text-foreground">{su.username}</span>
          </button>
        ))}
      </div>

      {/* Posts */}
      <div>
        {activeTab === "For you" && (
          loading ? (
            <FeedShimmer />
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <PuffyIcon name="camera" size={48} className="opacity-30 mb-3" />
              <p className="text-sm">No posts yet. Be the first!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                postId={post.id}
                username={post.username}
                avatar={post.avatar_url || story1}
                image={post.image_url}
                caption={post.caption}
                likesCount={post.likesCount}
                timeAgo={post.timeAgo}
                location={post.location}
                isLiked={post.isLiked}
                isSaved={post.isSaved}
              />
            ))
          )
        )}
        {activeTab === "Believing" && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <PuffyIcon name="heart" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">Posts from people you believe in will appear here</p>
          </div>
        )}
        {activeTab === "favourites" && (
          savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <PuffyIcon name="bookmark" size={48} className="opacity-30 mb-3" />
              <p className="text-sm">Your saved posts will appear here</p>
            </div>
          ) : (
            savedPosts.map((post) => (
              <PostCard
                key={post.id}
                postId={post.id}
                username={post.username}
                avatar={post.avatar_url || story1}
                image={post.image_url}
                caption={post.caption}
                likesCount={post.likesCount}
                timeAgo={post.timeAgo}
                location={post.location}
                isLiked={post.isLiked}
                isSaved={post.isSaved}
              />
            ))
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Feed;
