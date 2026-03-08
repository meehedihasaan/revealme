import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
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
      const { error: uploadError } = await supabase.storage.from("posts").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(path);

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption,
        location,
      });
      if (error) throw error;

      toast.success("Post shared!");
      navigate("/feed");
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">New Post</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePost}
          disabled={!preview || posting}
          className="text-sm font-bold text-primary disabled:opacity-40"
        >
          {posting ? "Posting..." : "Share"}
        </motion.button>
      </div>

      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-4 w-full py-32 text-muted-foreground"
        >
          <PuffyIcon name="camera" size={48} className="opacity-40" />
          <p className="text-sm">Tap to select a photo</p>
        </button>
      ) : (
        <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 400 }} />
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {preview && (
        <div className="px-4 py-4 space-y-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
            rows={3}
          />
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <PuffyIcon name="search" size={18} className="opacity-50" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={() => { setPreview(null); setFile(null); }}
            className="text-xs text-accent"
          >
            Remove photo
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
