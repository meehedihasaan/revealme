import { useLocation, useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";

const tabs = [
  { icon: "camera", path: "/feed", label: "Feed" },
  { icon: "search", path: "/explore", label: "Explore" },
  { icon: "message-circle", path: "/messages", label: "Messages" },
  { icon: "bell", path: "/notifications", label: "Alerts" },
  { icon: "user", path: "/profile", label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map(({ icon, path, label }) => {
          const active = location.pathname === path || (path === "/feed" && location.pathname === "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-opacity ${
                active ? "opacity-100" : "opacity-50"
              }`}
              aria-label={label}
            >
              <PuffyIcon name={icon} size={24} />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
