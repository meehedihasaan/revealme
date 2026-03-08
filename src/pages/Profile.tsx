import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

import bannerImg from "@/assets/profile-banner.jpg";
import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore3 from "@/assets/explore3.jpg";
import explore4 from "@/assets/explore4.jpg";
import explore5 from "@/assets/explore5.jpg";
import explore6 from "@/assets/explore6.jpg";

const gridImages = [explore1, explore2, explore3, explore4, explore5, explore6];

const Profile = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"grid" | "tagged">("grid");

  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={() => navigate("/feed")} className="flex items-center gap-2 text-foreground">
          <PuffyIcon name="arrow-left" size={20} />
          <span className="text-lg font-bold">{profile?.username || "reveal"}</span>
        </button>
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="settings" size={22} />
        </button>
      </div>

      {/* Banner */}
      <img src={bannerImg} alt="Banner" className="h-48 w-full object-cover" />

      {/* Avatar + Info */}
      <div className="px-4">
        <div className="-mt-10 mb-3">
          <div className="inline-block rounded-2xl border-4 border-background bg-background overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-secondary">
                <PuffyIcon name="user" size={32} />
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
        {profile?.username && (
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        )}

        <div className="mt-2 flex gap-6">
          <div><span className="font-bold text-foreground">0</span> <span className="text-sm text-muted-foreground">Believers</span></div>
          <div><span className="font-bold text-foreground">0</span> <span className="text-sm text-muted-foreground">Believing</span></div>
          <div><span className="font-bold text-foreground">{gridImages.length}</span> <span className="text-sm text-muted-foreground">Posts</span></div>
        </div>

        <p className="mt-2 text-sm text-foreground">Hey there, Enjoy the world!</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>📧 {user?.email}</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/settings/account")}
          className="mt-4 w-full rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors"
        >
          Edit Profile
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-border">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-foreground" : "opacity-50"}`}
        >
          <PuffyIcon name="grid" size={22} />
        </button>
        <button
          onClick={() => setActiveTab("tagged")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "tagged" ? "border-b-2 border-foreground" : "opacity-50"}`}
        >
          <PuffyIcon name="user" size={22} />
        </button>
      </div>

      {/* Grid / Tagged */}
      {activeTab === "grid" ? (
        <div className="grid grid-cols-3 gap-0.5">
          {gridImages.map((img, i) => (
            <img key={i} src={img} alt={`Post ${i}`} className="aspect-square w-full object-cover" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No tagged posts yet</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;
