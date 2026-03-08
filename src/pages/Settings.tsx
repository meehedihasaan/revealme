import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { useAuth } from "@/contexts/AuthContext";

const sections = [
  {
    icon: "user",
    title: "Account",
    subtitle: "Username",
    description: "Username, Phone, Email, Password, Security, Verification request, Log out.",
    path: "/settings/account",
  },
  {
    icon: "sliders",
    title: "Preference",
    subtitle: "Adjust your account according",
    description: "Appearance, language",
    path: "",
  },
  {
    icon: "shield",
    title: "Privacy & Safety",
    subtitle: "Manage privacy and secure data",
    description: "Private account, password, blocked accounts",
    path: "",
  },
  {
    icon: "info",
    title: "About",
    subtitle: "",
    description: "",
    path: "",
  },
];

const Settings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate("/profile")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        {profile?.avatar_url && (
          <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
        )}
        <span className="text-sm text-muted-foreground">@{profile?.username || "user"}</span>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">Settings and privacy</h1>
      </div>

      <div className="divide-y divide-border">
        {sections.map((s) => (
          <button
            key={s.title}
            onClick={() => s.path && navigate(s.path)}
            className="flex w-full items-start gap-4 px-4 py-5 text-left active:bg-secondary/50 transition-colors"
          >
            <PuffyIcon name={s.icon} size={24} className="mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-foreground">{s.title}</p>
              {s.subtitle && <p className="text-sm text-foreground">{s.subtitle}</p>}
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
            </div>
            <PuffyIcon name="chevron-right" size={18} className="mt-1 opacity-50" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Settings;
