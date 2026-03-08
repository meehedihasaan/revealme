import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { useNavigate } from "react-router-dom";
import { usePostTags } from "@/hooks/usePostTags";
import { supabase } from "@/integrations/supabase/client";

interface PostImageCarouselProps {
  postId: string;
  mainImage: string;
  onDoubleTap: () => void;
  showHeart: boolean;
  HeartComponent: React.ComponentType;
}

const PostImageCarousel = ({ postId, mainImage, onDoubleTap, showHeart, HeartComponent }: PostImageCarouselProps) => {
  const navigate = useNavigate();
  const { tags } = usePostTags(postId);
  const [showTags, setShowTags] = useState(false);
  const [images, setImages] = useState<string[]>([mainImage]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from("post_images")
        .select("image_url, display_order")
        .eq("post_id", postId)
        .order("display_order", { ascending: true });
      if (data && data.length > 1) {
        setImages(data.map(d => d.image_url));
      }
    };
    fetchImages();
  }, [postId]);

  const handleTap = () => setShowTags(prev => !prev);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && currentIndex < images.length - 1) setCurrentIndex(i => i + 1);
      if (diff > 0 && currentIndex > 0) setCurrentIndex(i => i - 1);
    }
    setTouchStart(null);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="relative w-full cursor-pointer select-none"
        onDoubleClick={onDoubleTap}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="Post"
              className="min-w-full object-cover"
              style={{ maxHeight: "580px" }}
              draggable={false}
            />
          ))}
        </motion.div>

        {/* Tag indicators */}
        <AnimatePresence>
          {showTags && tags.length > 0 && tags.map(tag => (
            <motion.div
              key={tag.user_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute z-10 cursor-pointer"
              style={{ left: `${tag.x_position}%`, top: `${tag.y_position}%`, transform: "translate(-50%, -100%)" }}
              onClick={(e) => { e.stopPropagation(); navigate(`/user/${tag.user_id}`); }}
            >
              <div className="bg-black/80 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap flex items-center gap-1 shadow-lg">
                <PuffyIcon name="user" size={10} className="invert" />
                {tag.username}
              </div>
              <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/80" />
            </motion.div>
          ))}
        </AnimatePresence>

        {tags.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/60 rounded-full p-1.5">
            <PuffyIcon name="user" size={12} className="invert" />
          </div>
        )}

        <AnimatePresence>{showHeart && <HeartComponent />}</AnimatePresence>
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
          {currentIndex + 1}/{images.length}
        </div>
      )}
    </div>
  );
};

export default PostImageCarousel;
