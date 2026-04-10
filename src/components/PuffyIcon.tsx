import { lazy, Suspense } from "react";
import { icons } from "lucide-react";
import arrowLeft from "@/assets/icons/arrow-left.png";
import camera from "@/assets/icons/camera.png";
import search from "@/assets/icons/search.png";
import messageCircle from "@/assets/icons/message-bubble.png";
import bell from "@/assets/icons/bell.png";
import user from "@/assets/icons/user.png";
import plus from "@/assets/icons/plus.png";
import heart from "@/assets/icons/heart.png";
import heartFilled from "@/assets/icons/heart-filled.png";
import send from "@/assets/icons/send.png";
import bookmark from "@/assets/icons/bookmark.png";
import moreHorizontal from "@/assets/icons/more-horizontal.png";
import edit from "@/assets/icons/edit.png";
import settings from "@/assets/icons/settings.png";
import userPlus from "@/assets/icons/user-plus.png";
import grid from "@/assets/icons/grid.png";
import sliders from "@/assets/icons/sliders.png";
import shield from "@/assets/icons/shield.png";
import info from "@/assets/icons/info.png";
import phone from "@/assets/icons/phone.png";
import copy from "@/assets/icons/copy.png";
import logOut from "@/assets/icons/log-out.png";
import chevronRight from "@/assets/icons/chevron-right.png";
import chevronDown from "@/assets/icons/chevron-down.png";
import check from "@/assets/icons/check.png";
import feed from "@/assets/icons/feed.png";
import wave from "@/assets/icons/wave.png";

const iconMap: Record<string, string> = {
  "arrow-left": arrowLeft,
  camera,
  search,
  "message-circle": messageCircle,
  bell,
  user,
  plus,
  heart,
  "heart-filled": heartFilled,
  send,
  bookmark,
  "more-horizontal": moreHorizontal,
  edit,
  settings,
  "user-plus": userPlus,
  grid,
  sliders,
  shield,
  info,
  phone,
  copy,
  "log-out": logOut,
  "chevron-right": chevronRight,
  "chevron-down": chevronDown,
  check,
  feed,
  wave,
};

// Map kebab-case names to PascalCase lucide icon names
const lucideNameMap: Record<string, string> = {
  "activity": "Activity",
  "database": "Database",
  "help-circle": "HelpCircle",
  "alert-circle": "AlertCircle",
  "file-text": "FileText",
  "map-pin": "MapPin",
  "eye": "Eye",
  "eye-off": "EyeOff",
  "lock": "Lock",
  "globe": "Globe",
  "trash": "Trash2",
  "x": "X",
  "image": "Image",
  "video": "Video",
  "download": "Download",
  "upload": "Upload",
  "refresh-cw": "RefreshCw",
  "star": "Star",
  "flag": "Flag",
  "link": "Link",
  "mail": "Mail",
  "clock": "Clock",
  "calendar": "Calendar",
  "filter": "Filter",
  "zap": "Zap",
  "volume-2": "Volume2",
  "mic": "Mic",
};

export type PuffyIconName = keyof typeof iconMap;

interface PuffyIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const PuffyIcon = ({ name, size = 24, className = "", style }: PuffyIconProps) => {
  const src = iconMap[name];
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`inline-block shrink-0 icon-adaptive ${className}`}
        style={style}
        draggable={false}
      />
    );
  }

  // Fallback to Lucide icon
  const lucideName = lucideNameMap[name] || name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const LucideIcon = (icons as any)[lucideName];
  if (LucideIcon) {
    return <LucideIcon size={size} className={`inline-block shrink-0 ${className}`} style={style} />;
  }

  console.warn(`PuffyIcon: unknown icon "${name}"`);
  return null;
};

export default PuffyIcon;
