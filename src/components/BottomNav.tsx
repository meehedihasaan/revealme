import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import createPostIcon from "@/assets/icons/create-post.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { icon: "feed", path: "/feed", label: "Feed" },
  { icon: "search", path: "/explore", label: "Explore" },
  { icon: "plus", path: "/create-post", label: "Create", isCreate: true },
  { icon: "bell", path: "/notifications", label: "Alerts", badgeKey: "notifications" },
  { icon: "user", path: "/profile", label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const lastFeedTapRef = useRef(0);

  // Fetch unread counts
  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadNotifs(notifCount || 0);

      // Unread messages
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (myConvs && myConvs.length > 0) {
        const convIds = myConvs.map(c => c.conversation_id);
        const { count: msgCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .eq("read", false)
          .neq("sender_id", user.id);
        setUnreadMessages(msgCount || 0);
      }
    };
    fetchCounts();

    // Real-time notifications badge - listen for INSERT and UPDATE
    const notifChannel = supabase
      .channel("bottomnav-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        setUnreadNotifs(prev => prev + 1);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        const old = payload.old as any;
        // If notification was marked as read, decrement
        if (updated.read === true && old.read === false) {
          setUnreadNotifs(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    // Real-time messages badge
    const msgChannel = supabase
      .channel("bottomnav-messages")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== user.id) {
          setUnreadMessages(prev => prev + 1);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);

  // Reset badge when visiting the page
  useEffect(() => {
    if (location.pathname === "/notifications") setUnreadNotifs(0);
    if (location.pathname === "/messages") setUnreadMessages(0);
  }, [location.pathname]);

  const getBadge = (badgeKey?: string) => {
    if (badgeKey === "notifications" && unreadNotifs > 0) return unreadNotifs;
    if (badgeKey === "messages" && unreadMessages > 0) return unreadMessages;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map(({ icon, path, label, badgeKey, isCreate }) => {
          const active = location.pathname === path || (path === "/feed" && location.pathname === "/");
          const badge = getBadge(badgeKey);
          return (
            <button
              key={path}
              onClick={() => {
                const isOnFeed = location.pathname === "/feed" || location.pathname === "/";
                if (path === "/feed" && isOnFeed) {
                  const now = Date.now();
                  if (now - lastFeedTapRef.current < 400) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    window.dispatchEvent(new CustomEvent("pull-to-refresh"));
                  }
                  lastFeedTapRef.current = now;
                  return;
                }
                navigate(path);
              }}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-opacity ${
                isCreate ? "opacity-100" : active ? "opacity-100" : "opacity-50"
              }`}
              aria-label={label}
            >
              {isCreate ? (
                <img src={createPostIcon} alt="Create" width={24} height={24} className="inline-block shrink-0 icon-adaptive" draggable={false} />
              ) : (
                <PuffyIcon name={icon} size={24} />
              )}
              {badge > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
