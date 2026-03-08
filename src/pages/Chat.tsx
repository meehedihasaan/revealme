import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import story2 from "@/assets/story2.jpg";

const moods = ["Casual", "Love", "LOUD", "Secret", "Anger"];

interface Message {
  id: number;
  text: string;
  sent: boolean;
  mood?: string;
  time: string;
}

const moodStyles: Record<string, string> = {
  Casual: "bg-primary text-primary-foreground",
  Love: "bg-accent text-accent-foreground",
  LOUD: "bg-warning text-background",
  Secret: "bg-secondary text-secondary-foreground",
  Anger: "bg-destructive/80 text-destructive-foreground",
};

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "We have to assign new member of my team", sent: false, time: "10:30 AM" },
    { id: 2, text: "Scratch to reveal", sent: true, mood: "Casual", time: "10:32 AM" },
    { id: 3, text: "You were late today", sent: false, mood: "Anger", time: "10:35 AM" },
    { id: 4, text: "I want to share something I am holding it for a long time", sent: true, mood: "Love", time: "10:40 AM" },
  ]);
  const [activeMood, setActiveMood] = useState("Casual");
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      text: input.trim(),
      sent: true,
      mood: activeMood,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => navigate("/messages")}>
          <PuffyIcon name="arrow-left" size={22} />
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
            <div className="flex flex-col gap-0.5">
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
              <span className={`text-[10px] text-muted-foreground ${msg.sent ? "text-right" : "text-left"}`}>
                {msg.time}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mood selector + Input */}
      <div className="border-t border-border bg-background px-4 py-3 pb-safe">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto">
          <PuffyIcon name="heart-filled" size={18} />
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
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="rounded-full bg-primary p-2.5 transition-opacity disabled:opacity-30"
          >
            <PuffyIcon name="send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
