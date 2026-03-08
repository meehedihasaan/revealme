import { ArrowLeft, User, SlidersHorizontal, Shield, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    icon: User,
    title: "Account",
    subtitle: "Username",
    description: "Username, Phone, Email, Password, Security, Verification request, Log out.",
    path: "/settings/account",
  },
  {
    icon: SlidersHorizontal,
    title: "Preference",
    subtitle: "Adjust your account according",
    description: "Appearance, language",
  },
  {
    icon: Shield,
    title: "Privacy & Safety",
    subtitle: "Manage privacy and secure data",
    description: "Private account, password, blocked accounts",
  },
  {
    icon: Info,
    title: "About",
    subtitle: "",
    description: "",
  },
];

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">Settings and privacy</h1>
      </div>

      <div className="divide-y divide-border">
        {sections.map((s) => (
          <button
            key={s.title}
            onClick={() => s.path && navigate(s.path)}
            className="flex w-full items-start gap-4 px-4 py-5 text-left"
          >
            <s.icon size={24} className="mt-0.5 shrink-0 text-foreground" />
            <div>
              <p className="font-bold text-foreground">{s.title}</p>
              {s.subtitle && <p className="text-sm text-foreground">{s.subtitle}</p>}
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Settings;
