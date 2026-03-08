import { motion } from "framer-motion";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

const VerifiedBadge = ({ size = 14, className = "" }: VerifiedBadgeProps) => (
  <motion.svg
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
  >
    <path
      d="M9.5 2l2.5 2.5L14.5 2l1.5 3 3.5.5-1 3.5 2.5 2.5-2.5 2.5 1 3.5-3.5.5-1.5 3-2.5-2.5L9.5 22 8 19l-3.5-.5 1-3.5L3 12.5 5.5 10l-1-3.5L8 6l1.5-3z"
      fill="hsl(210, 100%, 52%)"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

export default VerifiedBadge;
