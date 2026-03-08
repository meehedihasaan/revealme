import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/contexts/AuthContext";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";
import post1 from "@/assets/post1.jpg";
import post2 from "@/assets/post2.jpg";
import post3 from "@/assets/post3.jpg";

const defaultStories = [
  { name: "Engin", img: story1, gradient: "gradient-story-red" },
  { name: "Bruno", img: story2, gradient: "gradient-story-yellow" },
  { name: "Victor", img: story3, gradient: "gradient-story-yellow" },
  { name: "Juan Gomez", img: story4, gradient: "gradient-story-green" },
];

const tabs = ["For you", "Believing", "favourites"];

const posts = [
  {
    username: "victor.travels",
    avatar: story3,
    image: post1,
    caption: "Night vibes in the garden 🌿✨",
    likes: 1243,
    timeAgo: "2 hours ago",
    verified: false,
    location: "Tropical Garden, Bali",
  },
  {
    username: "hemlata",
    avatar: story1,
    image: post2,
    caption: "Golden hour never disappoints 🌅",
    likes: 3891,
    timeAgo: "5 hours ago",
    verified: true,
    location: "Malibu Beach",
  },
  {
    username: "bruno.lens",
    avatar: story2,
    image: post3,
    caption: "City lights reflecting on water 🌃",
    likes: 7520,
    timeAgo: "8 hours ago",
    verified: true,
    location: "Shanghai, China",
  },
];

const Feed = () => {
  const [activeTab, setActiveTab] = useState("For you");
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Add "Your story" at the beginning
  const stories: { name: string; img: string; gradient: string; isUser?: boolean }[] = [
    {
      name: "Your story",
      img: profile?.avatar_url || story1,
      gradient: "gradient-story-green",
      isUser: true,
    },
    ...defaultStories,
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-reveal text-2xl text-foreground">Reveal.</h1>
        <div className="flex items-center gap-3">
          <button
            className="relative text-foreground"
            onClick={() => navigate("/messages")}
          >
            <PuffyIcon name="message-circle" size={24} />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              12
            </span>
          </button>
          <button className="rounded-full border border-border p-1 text-foreground">
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
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 pt-1">
        {stories.map((s, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-1">
            <div className={`rounded-full p-[3px] ${s.gradient}`}>
              <div className="rounded-full border-2 border-background relative">
                <img
                  src={s.img}
                  alt={s.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
                {s.isUser && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary border-2 border-background">
                    <PuffyIcon name="plus" size={10} />
                  </div>
                )}
              </div>
            </div>
            <span className="max-w-[72px] truncate text-xs text-foreground">{s.name}</span>
          </div>
        ))}
      </div>

      {/* Posts */}
      <div>
        {activeTab === "For you" && posts.map((post, i) => (
          <PostCard key={i} {...post} />
        ))}
        {activeTab === "Believing" && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <PuffyIcon name="heart" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">Posts from people you believe in will appear here</p>
          </div>
        )}
        {activeTab === "favourites" && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <PuffyIcon name="bookmark" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">Your saved posts will appear here</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Feed;
