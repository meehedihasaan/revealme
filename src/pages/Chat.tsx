import { useState } from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import story2 from "@/assets/story2.jpg";

const moods = ["Casual", "Love", "LOUD", "Secret", "Anger"];

interface Message {
  id: number;
  text: string;
  sent: boolean;
  mood?: string;
}

const initialMessages: Message[] = [
  { id: 1, text: "We have to assign new member of my team", sent: false },
  { id: 2, text: "Scratch to reveal", sent: true, mood: "Casual" },
  { id: 3, text: "You were late today", sent: false, mood: "Anger" },
  { id: 4, text: "I want to share something I am holding it for a long time", sent: true, mood: "Love" },
];

const moodStyles: Record<string, string> = {
  Casual: "bg-primary text-primary-foreground",
  Love: "bg-accent text-accent-foreground",
  LOUD: "bg-warning text-background",
  Secret: "bg-secondary text-secondary-foreground",
  Anger: "bg-destructive/80 text-destructive-foreground",
};

const Chat = () => {
  const navigate = useNavigate();
  const [messages] = useState(initialMessages);
  const [activeMood, setActiveMood] = useState("Casual");
  const [input, setInput] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft size={22} />
        </button>
        <img src={story2} alt="Harry" className="h-10 w-10 rounded-full object-cover" />
        <div className="flex-1">
          <p className="font-bold text-foreground">Harry ✦</p>
          <p className="text-xs text-success">● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.mood
                  ? moodStyles[msg.mood] || "bg-secondary text-secondary-foreground"
                  : msg.sent
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mood selector + Input */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto">
          <Heart size={18} className="shrink-0 text-accent" />
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => setActiveMood(mood)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeMood === mood
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Chat;
