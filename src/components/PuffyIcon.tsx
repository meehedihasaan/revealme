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
import feed from "@/assets/icons/home.png";
import wave from "@/assets/icons/wave.png";
import comments from "@/assets/icons/comments.png";
// New puffy outline icons
import activity from "@/assets/icons/activity.png";
import database from "@/assets/icons/database.png";
import helpCircle from "@/assets/icons/help-circle.png";
import alertCircle from "@/assets/icons/alert-circle.png";
import fileText from "@/assets/icons/file-text.png";
import mapPin from "@/assets/icons/map-pin.png";
import eye from "@/assets/icons/eye.png";
import eyeOff from "@/assets/icons/eye-off.png";
import lock from "@/assets/icons/lock.png";
import globe from "@/assets/icons/globe.png";
import trash from "@/assets/icons/trash.png";
import xIcon from "@/assets/icons/x.png";
import imageIcon from "@/assets/icons/image.png";
import video from "@/assets/icons/video.png";
import download from "@/assets/icons/download.png";
import upload from "@/assets/icons/upload.png";
import refreshCw from "@/assets/icons/refresh-cw.png";
import star from "@/assets/icons/star.png";
import flag from "@/assets/icons/flag.png";
import link from "@/assets/icons/link.png";
import mail from "@/assets/icons/mail.png";
import clock from "@/assets/icons/clock.png";
import calendar from "@/assets/icons/calendar.png";
import filter from "@/assets/icons/filter.png";
import zap from "@/assets/icons/zap.png";
import volume2 from "@/assets/icons/volume-2.png";
import mic from "@/assets/icons/mic.png";

const iconMap: Record<string, string> = {
  "arrow-left": arrowLeft,
  camera,
  search,
  "message-circle": comments,
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
  // New puffy outline icons
  activity,
  database,
  "help-circle": helpCircle,
  "alert-circle": alertCircle,
  "file-text": fileText,
  "map-pin": mapPin,
  eye,
  "eye-off": eyeOff,
  lock,
  globe,
  trash,
  x: xIcon,
  image: imageIcon,
  video,
  download,
  upload,
  "refresh-cw": refreshCw,
  star,
  flag,
  link,
  mail,
  clock,
  calendar,
  filter,
  zap,
  "volume-2": volume2,
  mic,
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
  const lucideName = name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const LucideIcon = (icons as any)[lucideName];
  if (LucideIcon) {
    return <LucideIcon size={size} className={`inline-block shrink-0 ${className}`} style={style} />;
  }

  console.warn(`PuffyIcon: unknown icon "${name}"`);
  return null;
};

export default PuffyIcon;
