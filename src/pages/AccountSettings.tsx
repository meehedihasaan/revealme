import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Editable states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [usernameVal, setUsernameVal] = useState(profile?.username || "");
  const [emailVal, setEmailVal] = useState(user?.email || "");
  const [phoneVal, setPhoneVal] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSaveUsername = async () => {
    if (!user || !usernameVal) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameVal)
        .neq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        toast.error("Username already taken");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ username: usernameVal })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Username updated!");
      setEditingField(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailVal) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailVal });
      if (error) throw error;
      toast.success("Confirmation email sent to your new address");
      setEditingField(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update email");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneVal) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ phone: phoneVal });
      if (error) throw error;
      toast.success("Phone number updated!");
      setEditingField(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update phone");
    } finally {
      setSaving(false);
    }
  };

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (signInError) {
        toast.error("Incorrect password");
        setDeleting(false);
        return;
      }

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

  const inputClass =
    "mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

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
        {/* Username */}
        <div>
          <button
            onClick={() => setEditingField(editingField === "username" ? null : "username")}
            className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
          >
            <PuffyIcon name="user" size={20} />
            <span className="flex-1 text-foreground">{t("username")}</span>
            <span className="text-sm text-muted-foreground">@{profile?.username || "Not set"}</span>
            <PuffyIcon name="chevron-down" size={18} className={`opacity-50 transition-transform ${editingField === "username" ? "rotate-180" : ""}`} />
          </button>
          {editingField === "username" && (
            <div className="px-4 pb-4 space-y-2">
              <input
                value={usernameVal}
                onChange={(e) => setUsernameVal(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                placeholder="Enter new username"
                className={inputClass}
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingField(null)} className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">
                  {t("cancel")}
                </button>
                <button onClick={handleSaveUsername} disabled={saving} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                  {saving ? "Saving..." : t("save")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <button
            onClick={() => setEditingField(editingField === "phone" ? null : "phone")}
            className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
          >
            <PuffyIcon name="phone" size={20} />
            <span className="flex-1 text-foreground">{t("phoneNumber")}</span>
            <span className="text-sm text-muted-foreground">{user?.phone || "Not set"}</span>
            <PuffyIcon name="chevron-down" size={18} className={`opacity-50 transition-transform ${editingField === "phone" ? "rotate-180" : ""}`} />
          </button>
          {editingField === "phone" && (
            <div className="px-4 pb-4 space-y-2">
              <input
                value={phoneVal}
                onChange={(e) => setPhoneVal(e.target.value)}
                placeholder="+1234567890"
                type="tel"
                className={inputClass}
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingField(null)} className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">
                  {t("cancel")}
                </button>
                <button onClick={handleSavePhone} disabled={saving} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                  {saving ? "Saving..." : t("save")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <button
            onClick={() => setEditingField(editingField === "email" ? null : "email")}
            className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
          >
            <PuffyIcon name="send" size={20} />
            <span className="flex-1 text-foreground">Email</span>
            <span className="text-sm text-muted-foreground truncate max-w-[160px]">{user?.email || "Not set"}</span>
            <PuffyIcon name="chevron-down" size={18} className={`opacity-50 transition-transform ${editingField === "email" ? "rotate-180" : ""}`} />
          </button>
          {editingField === "email" && (
            <div className="px-4 pb-4 space-y-2">
              <input
                value={emailVal}
                onChange={(e) => setEmailVal(e.target.value)}
                placeholder="newemail@example.com"
                type="email"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">A confirmation will be sent to your new email</p>
              <div className="flex gap-2">
                <button onClick={() => setEditingField(null)} className="flex-1 rounded-lg bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">
                  {t("cancel")}
                </button>
                <button onClick={handleSaveEmail} disabled={saving} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                  {saving ? "Saving..." : t("save")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync Contacts */}
        <button className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors">
          <PuffyIcon name="copy" size={20} />
          <span className="flex-1 text-foreground">{t("syncContacts")}</span>
          <PuffyIcon name="chevron-right" size={18} className="opacity-50" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
        >
          <PuffyIcon name="log-out" size={20} />
          <span className="text-accent font-medium">{t("logOut")}</span>
        </button>
      </div>

      {/* Delete Account */}
      <div className="mt-8 px-4 pb-8">
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
