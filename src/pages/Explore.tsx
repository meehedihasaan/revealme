import { Search, Plus, Settings } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore3 from "@/assets/explore3.jpg";
import explore4 from "@/assets/explore4.jpg";
import explore5 from "@/assets/explore5.jpg";
import explore6 from "@/assets/explore6.jpg";

const images = [explore1, explore2, explore3, explore4, explore5, explore6, explore1, explore3, explore5];

const Explore = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Explore</h1>
        <div className="flex items-center gap-3">
          <button className="text-foreground"><Plus size={24} /></button>
          <button className="text-foreground"><Settings size={22} /></button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-3 gap-0.5"
      >
        {images.map((img, i) => (
          <div
            key={i}
            className={`overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
          >
            <img
              src={img}
              alt={`Explore ${i}`}
              className="h-full w-full object-cover"
              style={{ aspectRatio: i === 0 ? "1" : "1" }}
            />
          </div>
        ))}
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Explore;
