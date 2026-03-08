import { motion } from "framer-motion";

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="h-10 w-10 rounded-full border-[3px] border-muted border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  </div>
);

export default PageLoader;
