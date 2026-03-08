import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, Grid3X3, User } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

import bannerImg from "@/assets/profile-banner.jpg";
import logoImg from "@/assets/reveal-logo.png";
import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore3 from "@/assets/explore3.jpg";
import explore4 from "@/assets/explore4.jpg";
import explore5 from "@/assets/explore5.jpg";
import explore6 from "@/assets/explore6.jpg";

const gridImages = [explore1, explore2, explore3, explore4, explore5, explore6];

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"grid" | "tagged">("grid");
  const [believing, setBelieving] = useState(true);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground">
          <ArrowLeft size={20} />
          <span className="text-lg font-bold">reveal</span>
          <span className="text-primary">✓</span>
        </button>
        <button className="text-foreground"><MoreHorizontal size={24} /></button>
      </div>

      {/* Banner */}
      <img src={bannerImg} alt="Banner" className="h-48 w-full object-cover" />

      {/* Avatar + Info */}
      <div className="px-4">
        <div className="-mt-10 mb-3">
          <div className="inline-block rounded-2xl border-4 border-background bg-background p-2">
            <img src={logoImg} alt="Reveal" className="h-16 w-16 rounded-xl" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground">Reveal</h2>

        <div className="mt-1 flex gap-6">
          <div><span className="font-bold text-foreground">538</span> <span className="text-sm text-muted-foreground">Believers</span></div>
          <div><span className="font-bold text-foreground">22</span> <span className="text-sm text-muted-foreground">Believing</span></div>
          <div><span className="font-bold text-foreground">13</span> <span className="text-sm text-muted-foreground">Post</span></div>
        </div>

        <p className="mt-2 text-sm text-foreground">Hey there, Enjoy the world!</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>🎭 Entertainer</span>
          <span>📍 Born 14 March 2019</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setBelieving(!believing)}
          className={`mt-4 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            believing
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {believing ? "Believing" : "Believe"}
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-border">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex-1 py-3 ${activeTab === "grid" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}
        >
          <Grid3X3 size={22} className="mx-auto" />
        </button>
        <button
          onClick={() => setActiveTab("tagged")}
          className={`flex-1 py-3 ${activeTab === "tagged" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}
        >
          <User size={22} className="mx-auto" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {gridImages.map((img, i) => (
          <img key={i} src={img} alt={`Post ${i}`} className="aspect-square w-full object-cover" />
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
