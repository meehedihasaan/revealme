import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";

const AccountSettings = () => {
  const navigate = useNavigate();

  const items = [
    { icon: "user", label: "Username", value: "mehedihasan" },
    { icon: "phone", label: "Phone number", value: "" },
    { icon: "copy", label: "Sync contacts", value: "" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">Account</h1>
      </div>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <button key={item.label} className="flex w-full items-center gap-4 px-4 py-4 text-left">
            <PuffyIcon name={item.icon} size={20} />
            <span className="flex-1 text-foreground">{item.label}</span>
            <span className="text-sm text-muted-foreground">{item.value}</span>
            <PuffyIcon name="chevron-right" size={18} className="opacity-50" />
          </button>
        ))}
        <button className="flex w-full items-center gap-4 px-4 py-4 text-left">
          <PuffyIcon name="log-out" size={20} />
          <span className="text-accent font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
