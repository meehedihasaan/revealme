import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const NotificationSettings = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    pauseAll: false,
    likes: true,
    comments: true,
    commentLikes: true,
    followRequests: true,
    newFollowers: true,
    mentions: true,
    directMessages: true,
    messageRequests: true,
    storyReactions: true,
    liveVideos: false,
    emailNotifications: false,
    smsNotifications: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (key === "pauseAll" && !prev.pauseAll) {
        toast.info("All notifications paused");
      }
      return updated;
    });
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-4 py-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h2>
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {children}
      </div>
    </div>
  );

  const Row = ({ label, desc, value, onToggle }: { label: string; desc?: string; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1 mr-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onToggle} disabled={settings.pauseAll && label !== "Pause All"} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Notifications</h1>
      </div>

      <Section title="General">
        <Row label="Pause All" desc="Temporarily pause all notifications" value={settings.pauseAll} onToggle={() => toggle("pauseAll")} />
      </Section>

      <Section title="Posts & Stories">
        <Row label="Likes" desc="Someone liked your post" value={settings.likes} onToggle={() => toggle("likes")} />
        <Row label="Comments" desc="Someone commented on your post" value={settings.comments} onToggle={() => toggle("comments")} />
        <Row label="Comment Likes" desc="Someone liked your comment" value={settings.commentLikes} onToggle={() => toggle("commentLikes")} />
        <Row label="Story Reactions" desc="Someone reacted to your story" value={settings.storyReactions} onToggle={() => toggle("storyReactions")} />
      </Section>

      <Section title="People">
        <Row label="New Followers" desc="Someone started following you" value={settings.newFollowers} onToggle={() => toggle("newFollowers")} />
        <Row label="Follow Requests" desc="Someone requested to follow you" value={settings.followRequests} onToggle={() => toggle("followRequests")} />
        <Row label="Mentions" desc="Someone mentioned you" value={settings.mentions} onToggle={() => toggle("mentions")} />
      </Section>

      <Section title="Messages">
        <Row label="Direct Messages" desc="New message notifications" value={settings.directMessages} onToggle={() => toggle("directMessages")} />
        <Row label="Message Requests" desc="Messages from people you don't follow" value={settings.messageRequests} onToggle={() => toggle("messageRequests")} />
      </Section>

      <Section title="Other">
        <Row label="Email Notifications" desc="Receive email for important updates" value={settings.emailNotifications} onToggle={() => toggle("emailNotifications")} />
        <Row label="SMS Notifications" desc="Receive SMS for security alerts" value={settings.smsNotifications} onToggle={() => toggle("smsNotifications")} />
      </Section>
    </div>
  );
};

export default NotificationSettings;
