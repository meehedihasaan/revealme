import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface BlockedUser {
  id: string;
  blocked_id: string;
  username: string;
  avatar_url: string | null;
}

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [isPrivate, setIsPrivate] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"menu" | "password" | "blocked">("menu");

  useEffect(() => {
    if (profile) setIsPrivate((profile as any).is_private || false);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchBlocked = async () => {
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("id, blocked_id")
        .eq("blocker_id", user.id);
      if (!blocks || blocks.length === 0) { setBlockedUsers([]); return; }
      const ids = blocks.map(b => b.blocked_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, username, avatar_url").in("user_id", ids);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      setBlockedUsers(blocks.map(b => ({
        id: b.id,
        blocked_id: b.blocked_id,
        username: profileMap[b.blocked_id]?.username || "user",
        avatar_url: profileMap[b.blocked_id]?.avatar_url || null,
      })));
    };
    fetchBlocked();
  }, [user]);

  const togglePrivate = async (checked: boolean) => {
    if (!user) return;
    setIsPrivate(checked);
    await supabase.from("profiles").update({ is_private: checked } as any).eq("user_id", user.id);
    await refreshProfile();
    toast.success(checked ? "Account is now private" : "Account is now public");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveSection("menu");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (blockId: string) => {
    await supabase.from("blocked_users").delete().eq("id", blockId);
    setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
    toast.success("User unblocked");
  };

  if (activeSection === "password") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setActiveSection("menu")}>
            <PuffyIcon name="arrow-left" size={22} />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t("changePassword")}</h1>
        </div>
        <div className="space-y-4 px-4 pt-6">
          <div>
            <label className="text-xs text-muted-foreground">{t("newPassword")}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("confirmPassword")}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Saving..." : t("save")}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "blocked") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setActiveSection("menu")}>
            <PuffyIcon name="arrow-left" size={22} />
          </button>
          <h1 className="text-lg font-bold text-foreground">{t("blockedAccounts")}</h1>
        </div>
        {blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <PuffyIcon name="shield" size={48} className="opacity-30 mb-3" />
            <p className="text-sm">{t("noBlocked")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {blockedUsers.map((bu) => (
              <div key={bu.id} className="flex items-center gap-3 px-4 py-3">
                {bu.avatar_url ? (
                  <img src={bu.avatar_url} alt="" className="h-12 w-12 rounded-[40%] object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-[40%] bg-secondary">
                    <PuffyIcon name="user" size={20} />
                  </div>
                )}
                <span className="flex-1 font-semibold text-foreground">{bu.username}</span>
                <button
                  onClick={() => handleUnblock(bu.id)}
                  className="rounded-lg bg-destructive/20 px-4 py-1.5 text-xs font-semibold text-destructive"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">{t("privacy")}</h1>
      </div>

      <div className="divide-y divide-border">
        {/* Private Account */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <PuffyIcon name="shield" size={20} />
            <div>
              <p className="font-medium text-foreground">{t("privateAccount")}</p>
              <p className="text-xs text-muted-foreground">Only believers can see your posts</p>
            </div>
          </div>
          <Switch checked={isPrivate} onCheckedChange={togglePrivate} />
        </div>

        {/* Password */}
        <button
          onClick={() => setActiveSection("password")}
          className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
        >
          <PuffyIcon name="shield" size={20} />
          <span className="flex-1 text-foreground">{t("password")}</span>
          <PuffyIcon name="chevron-right" size={18} className="opacity-50" />
        </button>

        {/* Blocked Accounts */}
        <button
          onClick={() => setActiveSection("blocked")}
          className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
        >
          <PuffyIcon name="user" size={20} />
          <span className="flex-1 text-foreground">{t("blockedAccounts")}</span>
          <span className="text-sm text-muted-foreground">{blockedUsers.length}</span>
          <PuffyIcon name="chevron-right" size={18} className="opacity-50" />
        </button>
      </div>
    </div>
  );
};

export default PrivacySettings;
