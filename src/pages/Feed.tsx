import { useState } from "react";
import { MessageCircle, Plus, Heart, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";
import post1 from "@/assets/post1.jpg";

const stories = [
  { name: "Engin", img: story1, gradient: "gradient-story-red" },
  { name: "Bruno", img: story2, gradient: "gradient-story-yellow" },
  { name: "Victor", img: story3, gradient: "gradient-story-yellow" },
  { name: "Juan Gomez", img: story4, gradient: "gradient-story-green" },
];

const tabs = ["For you", "Believing", "favourites"];

const Feed = () => {
  const [activeTab, setActiveTab] = useState("For you");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-reveal text-2xl text-foreground">Reveal.</h1>
        <div className="flex items-center gap-3">
          <button className="relative text-foreground">
            <MessageCircle size={24} />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              12
            </span>
          </button>
          <button className="rounded-full border border-border p-1 text-foreground">
            <Plus size={20} />
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
        {stories.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-1">
            <div className={`rounded-full p-[3px] ${s.gradient}`}>
              <div className="rounded-full border-2 border-background">
                <img
                  src={s.img}
                  alt={s.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              </div>
            </div>
            <span className="max-w-[72px] truncate text-xs text-foreground">{s.name}</span>
          </div>
        ))}
      </div>

      {/* Post */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: "hsl(40 30% 85%)" }}>
          <div className="flex justify-center p-6 pb-0">
            <img
              src={post1}
              alt="Post"
              className="w-72 rounded-xl object-cover shadow-2xl"
            />
          </div>
          <div className="p-4" />
        </div>

        {/* Post actions */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-1">
            <img src={story3} alt="user" className="h-8 w-8 rounded-full object-cover" />
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setLiked(!liked)}>
              <Heart
                size={26}
                className={liked ? "fill-accent text-accent" : "text-foreground"}
              />
            </button>
            <button className="text-foreground">
              <MessageCircle size={24} />
            </button>
            <button className="text-foreground">
              <Send size={22} />
            </button>
            <button onClick={() => setSaved(!saved)}>
              <Bookmark
                size={24}
                className={saved ? "fill-foreground text-foreground" : "text-foreground"}
              />
            </button>
            <button className="text-foreground">
              <MoreHorizontal size={24} />
            </button>
          </div>
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Feed;
