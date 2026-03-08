import { motion } from "framer-motion";
import verifiedIcon from "@/assets/icons/verified.png";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

const VerifiedBadge = ({ size = 14, className = "" }: VerifiedBadgeProps) => (
  <motion.img
    src={verifiedIcon}
    alt="Verified"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
    width={size}
    height={size}
    className={`inline-block shrink-0 ${className}`}
    draggable={false}
  />
);

export default VerifiedBadge;
