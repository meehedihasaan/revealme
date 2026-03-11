import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PuffyIcon from "@/components/PuffyIcon";

const SetAvatar = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleContinue = async () => {
    if (!user) return;
    setLoading(true);

    if (file) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error("Failed to upload avatar");
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const avatarUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
    }

    await refreshProfile();
    setLoading(false);
    navigate("/onboarding/username");
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full flex-1 flex-col items-center"
      >
        <h1 className="mb-2 text-2xl font-bold text-foreground">Set your avatar</h1>
        <p className="mb-10 text-sm text-muted-foreground">Choose a photo that represents you</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative mb-8 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-secondary transition-colors hover:border-primary"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <PuffyIcon name="camera" size={32} className="opacity-50" />
              <span className="text-xs text-muted-foreground">Upload photo</span>
            </div>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-auto flex w-full flex-col gap-3 pt-8">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Continue"}
          </button>
          <button
            onClick={() => navigate("/onboarding/username")}
            className="text-sm text-muted-foreground"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SetAvatar;
