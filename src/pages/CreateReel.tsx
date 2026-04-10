import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_DURATION = 60; // 60 seconds max

const CreateReel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCaptionInput, setShowCaptionInput] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    // Check file size (100MB max)
    if (selected.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  // Get video duration and check limits
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const handleMeta = () => {
      setDuration(vid.duration);
      if (vid.duration > MAX_DURATION) {
        toast.info(`Video will be limited to ${MAX_DURATION}s`);
      }
    };
    const handleTime = () => setCurrentTime(vid.currentTime);
    vid.addEventListener("loadedmetadata", handleMeta);
    vid.addEventListener("timeupdate", handleTime);
    return () => {
      vid.removeEventListener("loadedmetadata", handleMeta);
      vid.removeEventListener("timeupdate", handleTime);
    };
  }, [preview]);

  const togglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPaused(false);
    } else {
      vid.pause();
      setIsPaused(true);
    }
  };

  const handlePost = async () => {
    if (!user || !file) return;
    setPosting(true);
    setUploadProgress(0);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) { clearInterval(progressInterval); return prev; }
          return prev + Math.random() * 15;
        });
      }, 300);

      const { error: uploadError } = await supabase.storage.from("posts").upload(path, file);
      clearInterval(progressInterval);

      if (uploadError) throw uploadError;
      setUploadProgress(90);

      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(path);

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption,
        post_type: "reel",
      });
      if (error) throw error;

      setUploadProgress(100);
      toast.success("Clip posted!");
      navigate("/reels");
    } catch (err: any) {
      toast.error(err.message || "Failed to post clip");
    } finally {
      setPosting(false);
    }
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / Math.min(duration, MAX_DURATION)) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 safe-top z-10">
        <button onClick={() => navigate(-1)} className="text-white">
          <PuffyIcon name="arrow-left" size={24} className="!brightness-0 !invert" />
        </button>
        <h1 className="text-white text-lg font-bold">New Clip</h1>
        {preview ? (
          <button
            onClick={handlePost}
            disabled={!file || posting}
            className="text-sm font-bold text-primary disabled:opacity-40"
          >
            {posting ? "Posting..." : "Share"}
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Upload progress bar */}
      {posting && (
        <div className="px-4 z-10">
          <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-white/60 text-xs text-center mt-1">{Math.round(uploadProgress)}% uploading...</p>
        </div>
      )}

      {/* Preview / Upload Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {preview ? (
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              src={preview}
              className="h-full w-full object-cover"
              autoPlay
              loop
              playsInline
              muted={isMuted}
            />

            {/* Video progress bar */}
            {duration > 0 && (
              <div className="absolute bottom-[120px] left-4 right-4 z-20">
                <div className="h-[3px] w-full rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white/80 transition-all duration-100" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/60 text-[10px]">{formatTime(currentTime)}</span>
                  <span className="text-white/60 text-[10px]">{formatTime(Math.min(duration, MAX_DURATION))}</span>
                </div>
              </div>
            )}

            {/* Pause overlay */}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <PuffyIcon name="play" size={28} className="!brightness-0 !invert" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Control buttons */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center"
              >
                <PuffyIcon name="volume-2" size={16} className="!brightness-0 !invert" />
                {isMuted && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-[1.5px] bg-white rotate-45 rounded-full" />
                  </div>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center"
              >
                <PuffyIcon name={isPaused ? "play" : "pause"} size={16} className="!brightness-0 !invert" />
              </button>
            </div>

            {/* Remove button */}
            <button
              onClick={() => { setPreview(null); setFile(null); setDuration(0); setCurrentTime(0); }}
              className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center z-20"
            >
              <PuffyIcon name="x" size={16} className="!brightness-0 !invert" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-white/60">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-4"
            >
              <div className="h-24 w-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/20">
                <PuffyIcon name="video" size={40} className="!brightness-0 !invert opacity-60" />
              </div>
              <span className="text-base font-semibold text-white/80">Select from Gallery</span>
              <span className="text-xs text-white/40">Videos up to {MAX_DURATION}s · Max 100MB</span>
            </button>
          </div>
        )}
      </div>

      {/* Caption input */}
      {preview && (
        <div className="px-4 py-3 border-t border-white/10 safe-bottom">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full bg-transparent text-white text-sm placeholder:text-white/40 outline-none"
                maxLength={500}
              />
            </div>
            <span className="text-white/30 text-xs">{caption.length}/500</span>
          </div>
          {/* Tags row */}
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-white/60 text-xs shrink-0">
              <PuffyIcon name="hash" size={12} className="!brightness-0 !invert opacity-60" />
              Hashtags
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-white/60 text-xs shrink-0">
              <PuffyIcon name="at-sign" size={12} className="!brightness-0 !invert opacity-60" />
              Mention
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-white/60 text-xs shrink-0">
              <PuffyIcon name="map-pin" size={12} className="!brightness-0 !invert opacity-60" />
              Location
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export default CreateReel;
