import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const PreferenceSettings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">{t("preference")}</h1>
      </div>

      {/* Appearance */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("appearance")}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => { setTheme("dark"); toast.success("Dark mode enabled"); }}
            className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
              theme === "dark" ? "border-primary bg-primary/10" : "border-border bg-secondary"
            }`}
          >
            <div className="h-16 w-16 rounded-xl bg-background border border-border flex items-center justify-center">
              <span className="text-2xl">🌙</span>
            </div>
            <span className={`text-sm font-semibold ${theme === "dark" ? "text-primary" : "text-foreground"}`}>
              {t("dark")}
            </span>
          </button>
          <button
            onClick={() => { setTheme("light"); toast.success("Light mode enabled"); }}
            className={`flex-1 flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
              theme === "light" ? "border-primary bg-primary/10" : "border-border bg-secondary"
            }`}
          >
            <div className="h-16 w-16 rounded-xl bg-foreground/10 border border-border flex items-center justify-center">
              <span className="text-2xl">☀️</span>
            </div>
            <span className={`text-sm font-semibold ${theme === "light" ? "text-primary" : "text-foreground"}`}>
              {t("light")}
            </span>
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="px-4 py-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("language")}
        </h2>
        <div className="space-y-2">
          {([
            { value: "en" as const, label: "English", native: "English" },
            { value: "bn" as const, label: "Bengali", native: "বাংলা" },
          ]).map((lang) => (
            <button
              key={lang.value}
              onClick={() => { setLanguage(lang.value); toast.success(`Language set to ${lang.label}`); }}
              className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-4 transition-colors ${
                language === lang.value ? "border-primary bg-primary/10" : "border-border bg-secondary"
              }`}
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-foreground">{lang.label}</span>
                <span className="text-sm text-muted-foreground">{lang.native}</span>
              </div>
              {language === lang.value && (
                <PuffyIcon name="check" size={20} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreferenceSettings;
