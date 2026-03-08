import { useState, useRef, useCallback, ReactNode } from "react";
import { motion } from "framer-motion";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const threshold = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    pulling.current = false;
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || refreshing) && (
        <motion.div
          className="flex items-center justify-center"
          style={{ height: refreshing ? 48 : pullDistance }}
          animate={{ height: refreshing ? 48 : pullDistance }}
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 3 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
            className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent"
          />
        </motion.div>
      )}
      {children}
    </div>
  );
};

export default PullToRefresh;
