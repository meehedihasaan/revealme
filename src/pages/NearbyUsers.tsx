import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import PuffyIcon from "@/components/PuffyIcon";
import searchAnimation from "@/assets/search-animation.json";
import { supabase } from "@/integrations/supabase/client";

interface NearbyUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
}

const NearbyUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, display_name, show_on_map")
        .eq("show_on_map", true);
      
      // Simulate search delay for animation effect
      setTimeout(() => {
        setUsers(
          (data || []).map((u: any) => ({
            user_id: u.user_id,
            username: u.username || "user",
            avatar_url: u.avatar_url,
            display_name: u.display_name,
          }))
        );
        setLoading(false);
        setSearching(false);
      }, 2500);
    };
    fetchUsers();
  }, []);

  // Position users in a circle
  const getCirclePosition = (index: number, total: number) => {
    const radius = 120;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-background">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground flex-1">Nearby Users</h1>
        <button onClick={() => navigate("/settings/location")} className="p-1">
          <PuffyIcon name="settings" size={20} />
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Center animation */}
        <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
          {/* Radar pulse rings */}
          {searching && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-primary/20"
                  initial={{ width: 60, height: 60, opacity: 0.6 }}
                  animate={{
                    width: [60, 280],
                    height: [60, 280],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          {/* Center Lottie */}
          <motion.div
            className="absolute z-10"
            style={{ width: 70, height: 70 }}
            animate={searching ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={searching ? { duration: 1.5, repeat: Infinity } : {}}
          >
            <Lottie animationData={searchAnimation} loop={searching} className="w-full h-full" />
          </motion.div>

          {/* User avatars in circle */}
          <AnimatePresence>
            {!loading && users.map((u, i) => {
              const pos = getCirclePosition(i, Math.max(users.length, 1));
              return (
                <motion.button
                  key={u.user_id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute z-20 flex flex-col items-center gap-1"
                  style={{
                    left: `calc(50% + ${pos.x}px - 28px)`,
                    top: `calc(50% + ${pos.y}px - 28px)`,
                  }}
                  onClick={() => navigate(`/user/${u.user_id}`)}
                  whileTap={{ scale: 0.9 }}
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.username}
                      className="h-14 w-14 rounded-[40%] object-cover border-2 border-primary shadow-lg"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[40%] bg-secondary border-2 border-primary shadow-lg">
                      <PuffyIcon name="user" size={22} />
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-foreground bg-background/80 px-1.5 py-0.5 rounded-full backdrop-blur-sm max-w-[64px] truncate">
                    @{u.username}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Status text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mt-6 text-center px-6"
        >
          {searching
            ? "Searching for nearby users..."
            : users.length === 0
            ? "No users found nearby. Enable your location in Settings to appear here!"
            : `Found ${users.length} user${users.length !== 1 ? "s" : ""} nearby — tap to view profile`}
        </motion.p>

        {/* Empty state CTA */}
        {!loading && users.length === 0 && (
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/settings/location")}
            className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Enable Location
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default NearbyUsers;
