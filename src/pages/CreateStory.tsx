import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CreateStory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!file || !user) return;
    setPosting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("stories").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: publicUrl,
      });
      if (error) throw error;

      toast.success("Story shared!");
      navigate("/feed");
    } catch (err: any) {
      toast.error(err.message || "Failed to post story");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">New Story</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePost}
          disabled={!preview || posting}
          className="text-sm font-bold text-primary disabled:opacity-40"
        >
          {posting ? "Sharing..." : "Share"}
        </motion.button>
      </div>

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground"
        >
          <PuffyIcon name="camera" size={56} className="opacity-40" />
          <p className="text-sm">Tap to add a story</p>
        </button>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-secondary/30">
          <img src={preview} alt="Story preview" className="max-h-[70vh] w-full object-contain" />
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

export default CreateStory;
