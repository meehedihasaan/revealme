import { useState } from "react";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import BottomNav from "@/components/BottomNav";

import explore1 from "@/assets/explore1.jpg";
import explore2 from "@/assets/explore2.jpg";
import explore3 from "@/assets/explore3.jpg";
import explore4 from "@/assets/explore4.jpg";
import explore5 from "@/assets/explore5.jpg";
import explore6 from "@/assets/explore6.jpg";

const allImages = [
  { src: explore1, tags: ["nature", "landscape"] },
  { src: explore2, tags: ["portrait", "people"] },
  { src: explore3, tags: ["urban", "city"] },
  { src: explore4, tags: ["nature", "travel"] },
  { src: explore5, tags: ["food", "lifestyle"] },
  { src: explore6, tags: ["portrait", "fashion"] },
  { src: explore1, tags: ["nature", "landscape"] },
  { src: explore3, tags: ["urban", "city"] },
  { src: explore5, tags: ["food", "lifestyle"] },
];

const Explore = () => {
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredImages = search.trim()
    ? allImages.filter((img) =>
        img.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
      )
    : allImages;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Explore</h1>
        <div className="flex items-center gap-3">
          <button><PuffyIcon name="plus" size={24} /></button>
          <button><PuffyIcon name="settings" size={22} /></button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5">
          <PuffyIcon name="search" size={18} className="opacity-50" />
          <input
            type="text"
            placeholder="Search (try: nature, portrait, urban, food)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground text-xs">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredImages.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-0.5"
        >
          {filteredImages.map((img, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.95 }}
              className={`overflow-hidden cursor-pointer ${i === 0 && !search ? "col-span-2 row-span-2" : ""}`}
              onClick={() => setSelectedImage(img.src)}
            >
              <img
                src={img.src}
                alt={`Explore ${i}`}
                className="h-full w-full object-cover"
                style={{ aspectRatio: "1" }}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PuffyIcon name="search" size={48} className="opacity-30 mb-3" />
          <p className="text-sm">No results for "{search}"</p>
        </div>
      )}

      {/* Image preview overlay */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Preview" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default Explore;
