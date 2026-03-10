import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EFFECTS = [
  { id: "none", label: "Normal", filter: "" },
  { id: "grayscale", label: "B&W", filter: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", filter: "sepia(80%)" },
  { id: "vivid", label: "Vivid", filter: "saturate(1.8) contrast(1.1)" },
  { id: "warm", label: "Warm", filter: "sepia(30%) saturate(1.4)" },
  { id: "cool", label: "Cool", filter: "hue-rotate(30deg) saturate(1.2)" },
  { id: "fade", label: "Fade", filter: "contrast(0.8) brightness(1.1) saturate(0.8)" },
];

const EMOJIS = ["😍", "🔥", "😂", "💯", "🎉", "✨", "❤️", "😎", "🤩", "💀", "🥳", "👑", "🌈", "⭐", "🦋", "🌸"];

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface EmojiOverlay {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

const TEXT_COLORS = ["#ffffff", "#000000", "#ff3b5c", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

const CreateStory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [activeEffect, setActiveEffect] = useState("none");
  const [showEffects, setShowEffects] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [emojis, setEmojis] = useState<EmojiOverlay[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const addText = () => {
    if (!textInput.trim()) return;
    setTexts(prev => [...prev, {
      id: Date.now().toString(),
      text: textInput.trim(),
      x: 50,
      y: 50,
      color: textColor,
      fontSize: 24,
    }]);
    setTextInput("");
    setShowTextInput(false);
  };

  const addEmoji = (emoji: string) => {
    setEmojis(prev => [...prev, {
      id: Date.now().toString(),
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      size: 36,
    }]);
  };

  const handlePost = async () => {
    if (!file || !user) return;
    setPosting(true);
    try {
      // Create a canvas to render the final image with overlays
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = preview!;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;

      // Apply filter
      const effect = EFFECTS.find(e => e.id === activeEffect);
      if (effect?.filter) ctx.filter = effect.filter;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";

      // Draw text overlays
      for (const t of texts) {
        const scale = canvas.width / 100;
        ctx.font = `bold ${t.fontSize * (canvas.width / 400)}px sans-serif`;
        ctx.fillStyle = t.color;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(t.text, t.x * scale, t.y * (canvas.height / 100));
        ctx.shadowBlur = 0;
      }

      // Draw emoji overlays
      for (const e of emojis) {
        const scale = canvas.width / 100;
        ctx.font = `${e.size * (canvas.width / 400)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(e.emoji, e.x * scale, e.y * (canvas.height / 100));
      }

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
      );

      const ext = "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("stories").upload(path, blob);
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

  const currentFilter = EFFECTS.find(e => e.id === activeEffect)?.filter || "";

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <PuffyIcon name="arrow-left" size={22} className="icon-adaptive" />
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
          <PuffyIcon name="camera" size={56} className="opacity-40 icon-adaptive" />
          <p className="text-sm">Tap to add a story</p>
        </button>
      ) : (
        <div className="flex-1 relative overflow-hidden" ref={canvasRef}>
          {/* Image with filter */}
          <img
            src={preview}
            alt="Story preview"
            className="h-full w-full object-contain"
            style={{ filter: currentFilter }}
          />

          {/* Text overlays - draggable */}
          {texts.map((t) => (
            <motion.div
              key={t.id}
              drag
              dragMomentum={false}
              dragConstraints={canvasRef}
              onDragEnd={(_, info) => {
                const container = canvasRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const newX = ((info.point.x - rect.left) / rect.width) * 100;
                const newY = ((info.point.y - rect.top) / rect.height) * 100;
                setTexts(prev => prev.map(item => item.id === t.id ? { ...item, x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) } : item));
              }}
              className="absolute cursor-grab active:cursor-grabbing select-none z-10"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: "translate(-50%, -50%)",
                color: t.color,
                fontSize: t.fontSize,
                fontWeight: "bold",
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                pointerEvents: "auto",
                touchAction: "none",
              }}
            >
              {t.text}
            </motion.div>
          ))}

          {/* Emoji overlays - draggable */}
          {emojis.map((e) => (
            <motion.div
              key={e.id}
              drag
              dragMomentum={false}
              dragConstraints={canvasRef}
              onDragEnd={(_, info) => {
                const container = canvasRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const newX = ((info.point.x - rect.left) / rect.width) * 100;
                const newY = ((info.point.y - rect.top) / rect.height) * 100;
                setEmojis(prev => prev.map(item => item.id === e.id ? { ...item, x: Math.max(5, Math.min(95, newX)), y: Math.max(5, Math.min(95, newY)) } : item));
              }}
              className="absolute cursor-grab active:cursor-grabbing select-none z-10"
              style={{
                left: `${e.x}%`,
                top: `${e.y}%`,
                transform: "translate(-50%, -50%)",
                fontSize: e.size,
                pointerEvents: "auto",
                touchAction: "none",
              }}
            >
              {e.emoji}
            </motion.div>
          ))}

          {/* Tools overlay */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowTextInput(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm"
            >
              <span className="text-foreground text-lg font-bold">Aa</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowEmojis(!showEmojis)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm"
            >
              <span className="text-xl">😀</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowEffects(!showEffects)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 backdrop-blur-sm"
            >
              <PuffyIcon name="sliders" size={18} className="icon-adaptive" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Text input modal */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="w-[85%] flex flex-col items-center gap-4">
              <input
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your text..."
                className="w-full bg-transparent text-center text-2xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none"
                style={{ color: textColor }}
              />
              <div className="flex gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`h-7 w-7 rounded-full border-2 ${textColor === c ? "border-foreground" : "border-muted-foreground/30"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowTextInput(false)} className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-foreground">
                  Cancel
                </button>
                <button onClick={addText} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                  Add Text
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker */}
      <AnimatePresence>
        {showEmojis && preview && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md rounded-t-2xl px-4 py-4 border-t border-border"
          >
            <div className="grid grid-cols-8 gap-3">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button onClick={() => setShowEmojis(false)} className="mt-3 w-full text-center text-sm text-muted-foreground">
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Effects picker */}
      <AnimatePresence>
        {showEffects && preview && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md rounded-t-2xl px-4 py-4 border-t border-border"
          >
            <div className="flex gap-3 overflow-x-auto pb-2">
              {EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  onClick={() => setActiveEffect(effect.id)}
                  className={`shrink-0 flex flex-col items-center gap-1 ${
                    activeEffect === effect.id ? "opacity-100" : "opacity-60"
                  }`}
                >
                  <div className="h-16 w-16 rounded-xl overflow-hidden border-2 border-border">
                    <img
                      src={preview}
                      alt={effect.label}
                      className="h-full w-full object-cover"
                      style={{ filter: effect.filter }}
                    />
                  </div>
                  <span className="text-[10px] text-foreground font-medium">{effect.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowEffects(false)} className="mt-2 w-full text-center text-sm text-muted-foreground">
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

export default CreateStory;
