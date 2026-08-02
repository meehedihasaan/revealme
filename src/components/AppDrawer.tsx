import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Moon, Sun, LogOut, Shield, ChevronRight } from "lucide-react";

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const items = [
  { icon: "user", label: "Profile", path: "/profile" },
  { icon: "search", label: "Explore", path: "/explore" },
  { icon: "reels", label: "Clips", path: "/reels" },
  { icon: "bell", label: "Notifications", path: "/notifications" },
  { icon: "message-circle", label: "Messages", path: "/messages" },
  { icon: "bookmark", label: "Saved", path: "/profile?tab=saved" },
  { icon: "user-plus", label: "Discover people", path: "/discover-people" },
  { icon: "map-pin", label: "Nearby", path: "/nearby" },
  { icon: "star", label: "Get verified", path: "/request-verification" },
  { icon: "settings", label: "Settings", path: "/settings" },
];

const AppDrawer = ({ open, onOpenChange }: AppDrawerProps) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, setTheme } = useTheme();
  const [counts, setCounts] = useState({ followers: 0, following: 0, posts: 0 });

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      const [followers, following, posts] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setCounts({
        followers: followers.count || 0,
        following: following.count || 0,
        posts: posts.count || 0,
      });
    };
    load();
  }, [open, user]);

  const level = Math.floor(counts.posts / 10);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col bg-background">
        {/* Account header */}
        <div className="px-4 pt-6 pb-4 border-b border-border">
          <button onClick={() => go("/profile")} className="flex items-center gap-3 text-left w-full">
            <div className="avatar-leaf h-12 w-12 overflow-hidden bg-secondary shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Your avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <PuffyIcon name="user" size={22} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold text-foreground truncate">
                {profile?.display_name || profile?.username || "You"}
                <VerifiedBadge size={13} />
              </p>
              <p className="text-xs text-muted-foreground truncate">@{profile?.username || "user"}</p>
            </div>
          </button>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => go("/following")} className="hover:text-foreground">
              <span className="font-semibold text-foreground">{counts.following}</span> Following
            </button>
            <button onClick={() => go("/profile")} className="hover:text-foreground">
              <span className="font-semibold text-foreground">{counts.followers}</span> Followers
            </button>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-foreground">Lv {level}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {items.map(({ icon, label, path }) => (
            <button
              key={label}
              onClick={() => go(path)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
            >
              <PuffyIcon name={icon} size={22} />
              <span className="flex-1 text-[15px] font-medium text-foreground">{label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={() => go("/admin")}
              className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
            >
              <Shield size={22} className="text-foreground" />
              <span className="flex-1 text-[15px] font-medium text-foreground">Admin panel</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-4 px-2 py-3 text-left rounded-xl hover:bg-secondary/60"
          >
            {theme === "dark" ? <Sun size={20} className="text-foreground" /> : <Moon size={20} className="text-foreground" />}
            <span className="text-[15px] font-medium text-foreground">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
          <button
            onClick={async () => { onOpenChange(false); await signOut(); navigate("/login"); }}
            className="flex w-full items-center gap-4 px-2 py-3 text-left rounded-xl hover:bg-secondary/60"
          >
            <LogOut size={20} className="text-destructive" />
            <span className="text-[15px] font-medium text-destructive">Log out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppDrawer;
