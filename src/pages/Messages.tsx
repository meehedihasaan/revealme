import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Search } from "lucide-react";
import { motion } from "framer-motion";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";
import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore4 from "@/assets/explore4.jpg";

interface Conversation {
  id: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  verified?: boolean;
}

const conversations: Conversation[] = [
  { id: "1", username: "Harry", avatar: story2, lastMessage: "Scratch to reveal", time: "2m", unread: 2, online: true, verified: true },
  { id: "2", username: "hemlata", avatar: story1, lastMessage: "That's amazing! 🔥", time: "15m", unread: 0, online: true, verified: true },
  { id: "3", username: "Victor", avatar: story3, lastMessage: "See you tomorrow", time: "1h", unread: 1, online: false },
  { id: "4", username: "Juan Gomez", avatar: story4, lastMessage: "Thanks for sharing", time: "2h", unread: 0, online: false },
  { id: "5", username: "farryjust", avatar: explore1, lastMessage: "I believe in you! 💪", time: "3h", unread: 0, online: true, verified: true },
  { id: "6", username: "kevin_sheta_97", avatar: explore4, lastMessage: "Let's catch up soon", time: "5h", unread: 0, online: false },
  { id: "7", username: "zeel.jogiwala", avatar: explore2, lastMessage: "Sent you a post", time: "1d", unread: 0, online: false },
  { id: "8", username: "Bruno", avatar: story2, lastMessage: "🔥🔥🔥", time: "1d", unread: 3, online: true },
  { id: "9", username: "Engin", avatar: story1, lastMessage: "Good morning!", time: "2d", unread: 0, online: false },
  { id: "10", username: "rae", avatar: story4, lastMessage: "Check this out", time: "3d", unread: 0, online: false },
];

const Messages = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Messages</h1>
        <button className="text-foreground">
          <Edit size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Online now */}
      <div className="px-4 py-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Online now
        </p>
        <div className="flex gap-4 overflow-x-auto pb-1">
          {conversations
            .filter((c) => c.online)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => navigate("/chat")}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <img
                    src={c.avatar}
                    alt={c.username}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
                </div>
                <span className="max-w-[60px] truncate text-[11px] text-foreground">
                  {c.username}
                </span>
              </button>
            ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Conversation list */}
      <div>
        {filtered.map((conv, i) => (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => navigate("/chat")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-secondary/50"
          >
            <div className="relative shrink-0">
              <img
                src={conv.avatar}
                alt={conv.username}
                className="h-14 w-14 rounded-full object-cover"
              />
              {conv.online && (
                <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${conv.unread > 0 ? "text-foreground" : "text-foreground"}`}>
                  {conv.username}
                </span>
                {conv.verified && <span className="text-xs text-primary">✓</span>}
              </div>
              <p className={`truncate text-sm ${conv.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {conv.lastMessage}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">{conv.time}</span>
              {conv.unread > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {conv.unread}
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Messages;
