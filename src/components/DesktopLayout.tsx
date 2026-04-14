import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import PuffyIcon from "@/components/PuffyIcon";
import { Bell, Plus, Search, MessageCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const navItems = [
  { icon: "feed", path: "/feed", label: "Home" },
  { icon: "search", path: "/explore", label: "Explore" },
  { icon: "reels", path: "/reels", label: "Clips" },
  { icon: "bell", path: "/notifications", label: "Notifications" },
  { icon: "user", path: "/profile", label: "Profile" },
];

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[72px] xl:w-[220px] border-r border-border bg-background z-40 flex flex-col items-center xl:items-stretch py-4 gap-1">
      {navItems.map(({ icon, path, label }) => {
        const active = location.pathname === path || (path === "/feed" && location.pathname === "/");
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              active
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <PuffyIcon name={icon} size={24} />
            <span className="hidden xl:inline text-sm">{label}</span>
          </button>
        );
      })}
      <button
        onClick={() => navigate("/create-post")}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 mt-2"
      >
        <Plus size={24} />
        <span className="hidden xl:inline text-sm">Create</span>
      </button>
      <div className="flex-1" />
      <button
        onClick={() => navigate("/settings")}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 mb-2"
      >
        <Settings size={24} />
        <span className="hidden xl:inline text-sm">Settings</span>
      </button>
    </aside>
  );
};

const DesktopTopBar = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      if (!participations || participations.length === 0) { setUnreadCount(0); return; }
      const convIds = participations.map(p => p.conversation_id);
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("desktop-unread-msgs")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-background z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={() => navigate("/feed")} className="text-reveal text-xl tracking-wide text-foreground shrink-0">
          Revealme.
        </button>
        <form onSubmit={handleSearch} className="relative max-w-xs w-full hidden lg:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full bg-secondary border border-border pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/notifications")} className="relative text-foreground">
          <Bell size={20} />
        </button>
        <button onClick={() => navigate("/messages")} className="relative text-foreground">
          <MessageCircle size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="w-8 h-8 rounded-full overflow-hidden border border-border"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <PuffyIcon name="user" size={16} />
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

const RightSidebar = () => {
  const { user, profile } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchSuggested = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, display_name")
        .neq("user_id", user.id)
        .limit(5);
      setSuggestedUsers(data || []);
    };
    fetchSuggested();
  }, [user]);

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-[300px] border-l border-border bg-background z-40 p-4 overflow-y-auto scrollbar-hide">
      {/* Suggested users */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Suggested for you</h3>
        <div className="space-y-3">
          {suggestedUsers.map((u) => (
            <button
              key={u.user_id}
              onClick={() => navigate(`/user/${u.user_id}`)}
              className="flex items-center gap-3 w-full text-left hover:bg-secondary/50 rounded-lg p-1 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{u.username || "user"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.display_name || ""}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trending / placeholder */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Trending</h3>
        <p className="text-xs text-muted-foreground">Explore what's happening</p>
      </div>
    </aside>
  );
};

interface DesktopLayoutProps {
  children: React.ReactNode;
}

const DesktopLayout = ({ children }: DesktopLayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Pages that should NOT get the desktop wrapper (full-screen pages)
  const fullScreenPages = ["/reels", "/story", "/", "/login", "/register", "/reset-password", "/onboarding"];
  const isFullScreen = fullScreenPages.some(p =>
    p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
  );

  if (isMobile || isFullScreen) {
    return <div className="mx-auto w-full max-w-md min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DesktopTopBar />
      <DesktopSidebar />
      <main className="ml-[72px] xl:ml-[220px] mr-[300px] pt-16 min-h-screen">
        <div className="mx-auto max-w-2xl min-h-screen">
          {children}
        </div>
      </main>
      <RightSidebar />
    </div>
  );
};

export default DesktopLayout;
