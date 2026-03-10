import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global presence hook — tracks the current user as online
 * and periodically updates last_online in their profile.
 * Mount once at the app level.
 */
export const usePresence = () => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const updateLastOnline = () => {
      supabase
        .from("profiles")
        .update({ last_online: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .then(() => {});
    };

    updateLastOnline();

    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });

    intervalRef.current = setInterval(updateLastOnline, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateLastOnline();
        channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      updateLastOnline();
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [user]);
};

/**
 * Hook to check if a specific user is online via the global presence channel
 * and get their last_online timestamp.
 */
export const useUserOnlineStatus = (userId: string | undefined) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [lastOnline, setLastOnline] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !user) return;

    // Fetch last_online from profile
    supabase
      .from("profiles")
      .select("last_online")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) setLastOnline((data as any).last_online);
      });

    // Create a dedicated presence channel to watch the target user
    const channel = supabase.channel("presence-watch-" + userId, {
      config: { presence: { key: user.id } },
    });

    const checkPresence = () => {
      const state = channel.presenceState();
      // Check if the target userId has any presence entries
      setIsOnline(!!state[userId]);
    };

    channel
      .on("presence", { event: "sync" }, checkPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          // Check after a short delay to allow other presences to sync
          setTimeout(checkPresence, 1000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, user]);

  return { isOnline, lastOnline };
};

/**
 * Format last online time for display
 */
export const formatLastOnline = (lastOnline: string | null): string => {
  if (!lastOnline) return "Offline";
  const diff = Date.now() - new Date(lastOnline).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};
