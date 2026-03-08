import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PuffyIcon from "@/components/PuffyIcon";
import { toast } from "sonner";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const items = [
    { icon: "user", label: "Username", value: profile?.username || "Not set" },
    { icon: "phone", label: "Phone number", value: "Not set" },
    { icon: "copy", label: "Sync contacts", value: "" },
  ];

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">Account</h1>
        {user?.email && (
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <button key={item.label} className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors">
            <PuffyIcon name={item.icon} size={20} />
            <span className="flex-1 text-foreground">{item.label}</span>
            <span className="text-sm text-muted-foreground">{item.value}</span>
            <PuffyIcon name="chevron-right" size={18} className="opacity-50" />
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
        >
          <PuffyIcon name="log-out" size={20} />
          <span className="text-accent font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
