import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import bannerImg from "@/assets/profile-banner.jpg";

const EditProfile = () => {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarDeleted, setAvatarDeleted] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>((profile as any)?.cover_url || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverDeleted, setCoverDeleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
    setAvatarDeleted(false);
  };

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
    setCoverDeleted(false);
  };

  const handleDeleteAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarDeleted(true);
  };

  const handleDeleteCover = () => {
    setCoverPreview(null);
    setCoverFile(null);
    setCoverDeleted(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url || null;
      let cover_url = (profile as any)?.cover_url || null;

      if (avatarDeleted) {
        avatar_url = null;
      } else if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = `${publicUrl}?t=${Date.now()}`;
      }

      if (coverDeleted) {
        cover_url = null;
      } else if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${user.id}/cover.${ext}`;
        await supabase.storage.from("avatars").upload(path, coverFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        cover_url = publicUrl;
      }

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
        .update({
          display_name: displayName,
          username,
          avatar_url,
          cover_url,
          bio,
          location,
        })
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

      {/* Cover Picture */}
      <div className="relative w-full">
        <button onClick={() => coverRef.current?.click()} className="relative w-full block">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="h-36 w-full object-cover" />
          ) : (
            <div className="h-36 w-full bg-secondary flex items-center justify-center">
              <PuffyIcon name="camera" size={28} className="opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <PuffyIcon name="camera" size={28} className="invert" />
          </div>
        </button>
        {coverPreview && (
          <button
            onClick={handleDeleteCover}
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/80 text-destructive-foreground"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        )}
      </div>
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />

      {/* Avatar */}
      <div className="flex flex-col items-center -mt-12 pb-4">
        <div className="relative">
          <button onClick={() => fileRef.current?.click()}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-[40%] object-cover border-4 border-background" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[40%] bg-secondary border-4 border-background">
                <PuffyIcon name="user" size={40} />
              </div>
            )}
            <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary border-2 border-background">
              <PuffyIcon name="camera" size={14} className="brightness-0 invert" />
            </div>
          </button>
          {avatarPreview && (
            <button
              onClick={handleDeleteAvatar}
              className="absolute -top-1 -right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground border-2 border-background"
            >
              <span className="text-xs font-bold">✕</span>
            </button>
          )}
        </div>
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
        <div>
          <label className="text-xs text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell something about yourself..."
            rows={3}
            maxLength={160}
            className="mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-right text-[10px] text-muted-foreground mt-1">{bio.length}/160</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            className="mt-1 w-full rounded-lg bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
