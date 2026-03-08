import { useRef, useState } from "react";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";

interface TaggedUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  x: number;
  y: number;
}

interface ImageCarouselPreviewProps {
  images: string[];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  tagMode: boolean;
  taggedUsers: TaggedUser[];
  onImageTap: (x: number, y: number) => void;
  onRemoveImage: (idx: number) => void;
}

const ImageCarouselPreview = ({
  images,
  currentIndex,
  onIndexChange,
  tagMode,
  taggedUsers,
  onImageTap,
  onRemoveImage,
}: ImageCarouselPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && currentIndex < images.length - 1) onIndexChange(currentIndex + 1);
      if (diff > 0 && currentIndex > 0) onIndexChange(currentIndex - 1);
    }
    setTouchStart(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tagMode || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onImageTap(x, y);
  };

  return (
    <div className="relative w-full overflow-hidden" ref={containerRef}>
      <div
        ref={imgRef}
        className="relative w-full"
        onClick={handleImageClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {images.map((src, i) => (
            <div key={i} className="relative min-w-full">
              <img src={src} alt={`Photo ${i + 1}`} className="w-full object-cover" style={{ maxHeight: 400 }} />
              {/* Remove individual image button */}
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveImage(i); }}
                className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full h-7 w-7 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </motion.div>

        {/* Tag indicators on current image */}
        {taggedUsers.map((t) => (
          <div
            key={t.user_id}
            className="absolute pointer-events-none"
            style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -100%)" }}
          >
            <div className="bg-black/75 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1">
              <PuffyIcon name="user" size={10} className="invert" />
              {t.username}
            </div>
            <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/75" />
          </div>
        ))}

        {tagMode && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
            <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">Tap to tag someone</span>
          </div>
        )}
      </div>

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      {images.length > 1 && (
        <div className="absolute top-3 right-12 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
          {currentIndex + 1}/{images.length}
        </div>
      )}
    </div>
  );
};

export default ImageCarouselPreview;
