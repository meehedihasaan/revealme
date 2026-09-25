import { motion } from "framer-motion";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

/**
 * Twitter-blue verified badge with a white check (same in light & dark).
 * Shape matches the classic scalloped verified seal with an inner check.
 */
const VerifiedBadge = ({ size = 14, className = "" }: VerifiedBadgeProps) => (
  <motion.svg
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role="img"
    aria-label="Verified"
    className={`inline-block shrink-0 text-verified ${className}`}
    
  >
    <path
      fill="currentColor"
      d="M12 1.5l2.35 1.72 2.9-.24.9 2.77 2.4 1.65-.95 2.76.95 2.76-2.4 1.65-.9 2.77-2.9-.24L12 22.5l-2.35-1.72-2.9.24-.9-2.77-2.4-1.65.95-2.76-.95-2.76 2.4-1.65.9-2.77 2.9.24L12 1.5z"
    />
    <path
      d="M8 12.2l2.6 2.6L16.2 9.2"
      fill="none"
      stroke="hsl(var(--verified-foreground))"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

export default VerifiedBadge;
