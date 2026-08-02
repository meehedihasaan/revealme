interface ReachIconProps {
  size?: number;
  className?: string;
}

/**
 * "Increase" style reach icon (rising bars + upward arrow), monochrome.
 * Uses currentColor so it adapts to light and dark themes.
 */
const ReachIcon = ({ size = 22, className = "" }: ReachIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-label="Post reach"
    className={`inline-block shrink-0 text-foreground ${className}`}
  >
    <path d="M3 20h18" />
    <path d="M6 20v-4.5" />
    <path d="M11 20v-8" />
    <path d="M16 20v-6" />
    <path d="M21 20V8" />
    <path d="M4.5 10.5 9.5 6l3 2.5L19 3" />
    <path d="M15.5 3H19v3.5" />
  </svg>
);

export default ReachIcon;
