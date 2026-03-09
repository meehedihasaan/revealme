import { motion } from "framer-motion";

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Outer track */}
      <div className="h-9 w-9 rounded-full border-[3px] border-muted" />
      {/* Spinning arc */}
      <motion.div
        className="absolute inset-0 h-9 w-9 rounded-full border-[3px] border-transparent border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  </div>
);

export default PageLoader;
