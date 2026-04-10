import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CreateReel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const video = selected.type.startsWith("video/");
    setIsVideo(video);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handlePost = async () => {
    if (!user || !file) return;
    setPosting(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("posts").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(path);

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption,
        post_type: "reel",
      });
      if (error) throw error;

      toast.success("Clip posted!");
      navigate("/reels");
    } catch (err: any) {
      toast.error(err.message || "Failed to post clip");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 safe-top z-10">
        <button onClick={() => navigate(-1)} className="text-white">
          <PuffyIcon name="arrow-left" size={24} className="!brightness-0 !invert" />
        </button>
        <h1 className="text-white text-lg font-bold">New Clip</h1>
        <button
          onClick={handlePost}
          disabled={!file || posting}
          className="text-sm font-bold text-primary disabled:opacity-40"
        >
          {posting ? "Posting..." : "Share"}
        </button>
      </div>

      {/* Preview / Upload Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {preview ? (
          <div className="relative h-full w-full">
            {isVideo ? (
              <video
                src={preview}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            )}
            <button
              onClick={() => { setPreview(null); setFile(null); setIsVideo(false); }}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center"
            >
              <PuffyIcon name="x" size={16} className="!brightness-0 !invert" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-4 text-white/60"
          >
            <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
              <PuffyIcon name="video" size={36} className="!brightness-0 !invert opacity-60" />
            </div>
            <span className="text-sm font-medium">Tap to select photo or video</span>
            <span className="text-xs text-white/30">Videos up to 60 seconds</span>
          </button>
        )}
      </div>

      {/* Caption input */}
      {preview && (
        <div className="px-4 py-3 border-t border-white/10 safe-bottom">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full bg-transparent text-white text-sm placeholder:text-white/40 outline-none"
            maxLength={500}
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export default CreateReel;
