import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import Lottie from "lottie-react";
import searchAnimation from "@/assets/search-animation.json";

const features = [
  {
    icon: "search" as const,
    title: "Find Nearby Users",
    desc: "Discover people around you who have opted in to share their location.",
  },
  {
    icon: "shield" as const,
    title: "Privacy First",
    desc: "Only users who enable 'Show on Map' in Settings → Location will appear.",
  },
  {
    icon: "user" as const,
    title: "View Profiles",
    desc: "Tap any user to visit their profile, follow them, or start a conversation.",
  },
  {
    icon: "settings" as const,
    title: "Control Your Visibility",
    desc: "You can enable or disable your presence anytime from Location Settings.",
  },
];

const UserMap = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-background">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground flex-1">Nearby Search</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-6 overflow-y-auto">
        {/* Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-36 h-36 mb-4"
        >
          <Lottie animationData={searchAnimation} loop className="w-full h-full" />
        </motion.div>

        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-foreground mb-1 text-center"
        >
          Discover People Nearby
        </motion.h2>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground text-center mb-6 max-w-[280px]"
        >
          Search for users near your location and connect with them instantly.
        </motion.p>

        {/* Feature cards */}
        <div className="w-full space-y-3 mb-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <PuffyIcon name={f.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-6 pt-2 shrink-0">
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/nearby-users")}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg active:shadow-md transition-shadow"
        >
          Tap to Search
        </motion.button>
      </div>
    </div>
  );
};

export default UserMap;
