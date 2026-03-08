import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EditProfile = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url || null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = publicUrl;
      }

      // Check username availability if changed
      if (username !== profile?.username && username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          toast.error("Username already taken");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, username, avatar_url })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated!");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-bold text-primary disabled:opacity-40"
        >
          {saving ? "Saving..." : "Done"}
        </button>
      </div>

      <div className="flex flex-col items-center py-8">
        <button onClick={() => fileRef.current?.click()} className="relative">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
              <PuffyIcon name="user" size={40} />
            </div>
          )}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <PuffyIcon name="camera" size={14} />
          </div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
      </div>

      <div className="space-y-4 px-4">
        <div>
          <label className="text-xs text-muted-foreground">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            className="mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
