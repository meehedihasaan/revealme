import { useState } from "react";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";
import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";

type NotifType = "like" | "comment" | "follow";

interface Notification {
  username: string;
  avatar: string;
  text: string;
  time: string;
  type: NotifType;
  commentPreview?: string;
  read: boolean;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    { username: "rohannatt", avatar: story1, text: "Commented on your post.", time: "8m", type: "comment", commentPreview: "👌", read: false },
    { username: "anish_lohar72", avatar: story2, text: "liked your post.", time: "23h", type: "like", read: false },
    { username: "subhamjohal", avatar: story3, text: "liked your post.", time: "3d", type: "like", read: true },
    { username: "kshiprakulkarni", avatar: story4, text: "liked your post.", time: "3d", type: "like", read: true },
    { username: "stavyanath", avatar: explore1, text: "liked your post.", time: "3d", type: "like", read: true },
    { username: "saikiransathe", avatar: explore2, text: "Commented on your post.", time: "3d", type: "comment", commentPreview: "🔥🔥🔥", read: true },
    { username: "triptijain", avatar: story1, text: "started following you.", time: "4d", type: "follow", read: true },
    { username: "tarakchanda", avatar: story3, text: "liked your post.", time: "7d", type: "like", read: true },
    { username: "usmanabbas99", avatar: story2, text: "liked your post.", time: "12d", type: "like", read: true },
    { username: "mehedihasan", avatar: story4, text: "liked your post.", time: "12d", type: "like", read: true },
  ]);

  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});

  const handleFollowBack = (username: string) => {
    setFollowStates((prev) => ({ ...prev, [username]: !prev[username] }));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NotifIcon = ({ type }: { type: NotifType }) => {
    if (type === "like") return <PuffyIcon name="heart-filled" size={20} />;
    if (type === "comment") return <PuffyIcon name="message-circle" size={20} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold text-foreground">
          Notifications {unreadCount > 0 && <span className="text-primary text-base">({unreadCount})</span>}
        </h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-medium">
              Mark all read
            </button>
          )}
          <button onClick={() => navigate("/following")}>
            <PuffyIcon name="user-plus" size={24} />
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {notifications.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex items-center gap-3 px-4 py-3 ${!n.read ? "bg-primary/5" : ""}`}
          >
            <img src={n.avatar} alt={n.username} className="h-12 w-12 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-bold">{n.username}</span> {n.text}
              </p>
              <p className="text-xs text-muted-foreground">{n.time}</p>
              {n.commentPreview && (
                <p className="mt-0.5 text-sm">{n.commentPreview}</p>
              )}
            </div>
            {n.type === "follow" ? (
              <button
                onClick={() => handleFollowBack(n.username)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                  followStates[n.username]
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {followStates[n.username] ? "Following" : "Follow Back"}
              </button>
            ) : (
              <NotifIcon type={n.type} />
            )}
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
