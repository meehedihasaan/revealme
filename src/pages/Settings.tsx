import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";

const Settings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const { data: permissions } = useUserPermissions();

  const sections = [
    {
      icon: "user",
      title: t("account"),
      subtitle: t("username"),
      description: t("usernamePhoneEmail"),
      path: "/settings/account",
    },
    {
      icon: "sliders",
      title: t("preference"),
      subtitle: t("adjustAccount"),
      description: t("appearanceLanguage"),
      path: "/settings/preference",
    },
    {
      icon: "shield",
      title: t("privacy"),
      subtitle: t("managePrivacy"),
      description: t("privatePassBlocked"),
      path: "/settings/privacy",
    },
    {
      icon: "info",
      title: t("about"),
      subtitle: "",
      description: "",
      path: "",
    },
    ...(permissions?.isSuperAdmin ? [{
      icon: "settings",
      title: "Admin Panel",
      subtitle: "Manage platform",
      description: "Users, roles, verifications & settings",
      path: "/admin",
    }] : []),
  ];

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
        <h1 className="text-3xl font-bold text-foreground">{t("settings")}</h1>
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
