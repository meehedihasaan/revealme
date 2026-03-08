import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { t } = useLanguage();
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const items = [
    { icon: "user", label: t("username"), value: profile?.username || "Not set" },
    { icon: "phone", label: t("phoneNumber"), value: "Not set" },
    { icon: "copy", label: t("syncContacts"), value: "" },
  ];

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword || deletePassword.length < 6) {
      toast.error("Please enter your password");
      return;
    }
    if (!user?.email) return;

    setDeleting(true);
    try {
      // Verify password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (signInError) {
        toast.error("Incorrect password");
        setDeleting(false);
        return;
      }

      // Delete user data
      await supabase.from("posts").delete().eq("user_id", user.id);
      await supabase.from("stories").delete().eq("user_id", user.id);
      await supabase.from("likes").delete().eq("user_id", user.id);
      await supabase.from("saved_posts").delete().eq("user_id", user.id);
      await supabase.from("follows").delete().eq("follower_id", user.id);
      await supabase.from("follows").delete().eq("following_id", user.id);
      await supabase.from("blocked_users").delete().eq("blocker_id", user.id);
      await supabase.from("profiles").delete().eq("user_id", user.id);

      await signOut();
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-8">
        <h1 className="text-3xl font-bold text-foreground">{t("account")}</h1>
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
          <span className="text-accent font-medium">{t("logOut")}</span>
        </button>
      </div>

      {/* Delete Account */}
      <div className="mt-8 px-4">
        {!showDelete ? (
          <button
            onClick={() => setShowDelete(true)}
            className="w-full rounded-lg border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors active:bg-destructive/10"
          >
            {t("deleteAccount")}
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-destructive">{t("deleteAccount")}</p>
            <p className="text-xs text-muted-foreground">{t("deleteWarning")}</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t("enterPassword")}
              className="w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDelete(false); setDeletePassword(""); }}
                className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
