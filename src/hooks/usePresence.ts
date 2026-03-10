import { useEffect, useRef } from "react";
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

    // Update last_online in profile
    const updateLastOnline = () => {
      supabase
        .from("profiles")
        .update({ last_online: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .then(() => {});
    };

    // Update immediately on mount
    updateLastOnline();

    // Join a global presence channel
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });

    // Update last_online every 60 seconds
    intervalRef.current = setInterval(updateLastOnline, 60000);

    // Update on visibility change (tab focus)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        updateLastOnline();
        channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      updateLastOnline(); // Final update when unmounting
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [user]);
};

/**
 * Hook to check if a specific user is online via the global presence channel.
 * Returns { isOnline, lastOnline } for the given userId.
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

    // Check global presence
    const channel = supabase.channel("global-presence");

    const checkPresence = () => {
      const state = channel.presenceState();
      setIsOnline(!!state[userId]);
    };

    channel.on("presence", { event: "sync" }, checkPresence);

    // If not already subscribed, subscribe
    if ((channel as any).state !== "joined") {
      channel.subscribe();
    } else {
      checkPresence();
    }

    return () => {
      // Don't remove the global channel here, it may be shared
    };
  }, [userId, user]);

  return { isOnline, lastOnline };
};

import { useState } from "react";
