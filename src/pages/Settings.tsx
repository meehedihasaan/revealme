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
      label: "Account",
      items: [
        {
          icon: "user",
          title: t("account"),
          description: t("usernamePhoneEmail"),
          path: "/settings/account",
        },
        {
          icon: "shield",
          title: t("privacy"),
          description: "Password, blocked accounts, private mode",
          path: "/settings/privacy",
        },
      ],
    },
    {
      label: "Preferences",
      items: [
        {
          icon: "sliders",
          title: t("preference"),
          description: "Theme, language, appearance",
          path: "/settings/preference",
        },
        {
          icon: "bell",
          title: "Notifications",
          description: "Push, email, SMS notification settings",
          path: "/settings/notifications",
        },
        {
          icon: "activity",
          title: "Activity & Status",
          description: "Online status, map visibility",
          path: "/settings/activity",
        },
      ],
    },
    {
      label: "Data",
      items: [
        {
          icon: "database",
          title: "Data & Storage",
          description: "Cache, media downloads, storage",
          path: "/settings/data-storage",
        },
        {
          icon: "map-pin",
          title: "Location",
          description: "Share your location on the map",
          path: "/settings/location",
        },
      ],
    },
    {
      label: "Support",
      items: [
        {
          icon: "help-circle",
          title: "Help & Support",
          description: "FAQ, report a problem, terms",
          path: "/settings/help",
        },
        {
          icon: "info",
          title: t("about"),
          description: "App version, legal information",
          path: "/settings/help",
        },
      ],
    },
    ...(permissions?.isSuperAdmin ? [{
      label: "Administration",
      items: [{
        icon: "settings",
        title: "Admin Panel",
        description: "Users, roles, verifications & settings",
        path: "/admin",
      }],
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate("/profile")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        {profile?.avatar_url && (
          <img src={profile.avatar_url} alt="" className="h-8 w-8 avatar-leaf object-cover" />
        )}
        <span className="text-sm text-muted-foreground">@{profile?.username || "user"}</span>
      </div>

      <div className="px-4 pb-2 pt-6">
        <h1 className="text-3xl font-bold text-foreground">{t("settings")}</h1>
      </div>

      {sections.map((section) => (
        <div key={section.label} className="px-4 py-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {section.label}
          </h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
            {section.items.map((item) => (
              <button
                key={item.title + item.path}
                onClick={() => item.path && navigate(item.path)}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-secondary/50 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                  <PuffyIcon name={item.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
                <PuffyIcon name="chevron-right" size={16} className="opacity-40 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Settings;
