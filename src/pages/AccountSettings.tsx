import { ArrowLeft, User, Phone, Copy, LogOut, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AccountSettings = () => {
  const navigate = useNavigate();

  const items = [
    { icon: User, label: "Username", value: "mehedihasan" },
    { icon: Phone, label: "Phone number", value: "" },
    { icon: Copy, label: "Sync contacts", value: "" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">Account</h1>
      </div>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <button key={item.label} className="flex w-full items-center gap-4 px-4 py-4 text-left">
            <item.icon size={20} className="shrink-0 text-foreground" />
            <span className="flex-1 text-foreground">{item.label}</span>
            <span className="text-sm text-muted-foreground">{item.value}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        ))}
        <button className="flex w-full items-center gap-4 px-4 py-4 text-left">
          <LogOut size={20} className="shrink-0 text-accent" />
          <span className="text-accent font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
