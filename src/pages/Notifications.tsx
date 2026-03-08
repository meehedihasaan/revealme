import { UserPlus, Heart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

import story1 from "@/assets/story1.jpg";
import story2 from "@/assets/story2.jpg";
import story3 from "@/assets/story3.jpg";
import story4 from "@/assets/story4.jpg";
import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";

type NotifType = "like" | "comment" | "believe";

interface Notification {
  username: string;
  avatar: string;
  text: string;
  time: string;
  type: NotifType;
  commentPreview?: string;
}

const notifications: Notification[] = [
  { username: "rohannatt", avatar: story1, text: "Commented on your post.", time: "8m", type: "comment", commentPreview: "👌" },
  { username: "anish_lohar72", avatar: story2, text: "liked your post.", time: "23h", type: "like" },
  { username: "subhamjohal", avatar: story3, text: "liked your post.", time: "3d", type: "like" },
  { username: "kshiprakulkarni", avatar: story4, text: "liked your post.", time: "3d", type: "like" },
  { username: "stavyanath", avatar: explore1, text: "liked your post.", time: "3d", type: "like" },
  { username: "saikiransathe", avatar: explore2, text: "Commented on your post.", time: "3d", type: "comment", commentPreview: "🔥🔥🔥" },
  { username: "triptijain", avatar: story1, text: "started believing you.", time: "4d", type: "believe" },
  { username: "tarakchanda", avatar: story3, text: "liked your post.", time: "7d", type: "like" },
  { username: "usmanabbas99", avatar: story2, text: "liked your post.", time: "12d", type: "like" },
  { username: "mehedihasan", avatar: story4, text: "liked your post.", time: "12d", type: "like" },
];

const NotifIcon = ({ type }: { type: NotifType }) => {
  if (type === "like") return <Heart size={20} className="fill-accent text-accent" />;
  if (type === "comment") return <MessageCircle size={20} className="text-foreground" />;
  return null;
};

const Notifications = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <button className="text-foreground"><UserPlus size={24} /></button>
      </div>

      <div className="divide-y divide-border">
        {notifications.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-4 py-3"
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
            {n.type === "believe" ? (
              <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                Believe Back
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
