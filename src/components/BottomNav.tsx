import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Search, MessageCircle, Bell, User } from "lucide-react";

const tabs = [
  { icon: Camera, path: "/feed", label: "Feed" },
  { icon: Search, path: "/explore", label: "Explore" },
  { icon: MessageCircle, path: "/messages", label: "Messages" },
  { icon: Bell, path: "/notifications", label: "Alerts" },
  { icon: User, path: "/profile", label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map(({ icon: Icon, path, label }) => {
          const active = location.pathname === path || (path === "/feed" && location.pathname === "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
              aria-label={label}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 1.5} />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
