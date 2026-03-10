import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { uploadProgress } from "@/hooks/useUploadProgress";
import ImageCarouselPreview from "@/components/ImageCarouselPreview";
import TagSearchSheet from "@/components/TagSearchSheet";
import ImageEffectsEditor from "@/components/ImageEffectsEditor";

interface TaggedUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  x: number;
  y: number;
}

type PostTab = "photo" | "text";
type Step = "upload" | "effects" | "publish";

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<PostTab>("photo");
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<Step>("upload");
  const [filterStyles, setFilterStyles] = useState<React.CSSProperties[]>([]);

  const [tagMode, setTagMode] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const total = [...files, ...selected].slice(0, 10);
    setFiles(total);
    const newPreviews = total.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
    // Auto-advance to effects step
    setStep("effects");
  };

  const removeImage = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (currentIndex >= newPreviews.length) setCurrentIndex(Math.max(0, newPreviews.length - 1));
    if (newFiles.length === 0) { setTaggedUsers([]); setTagMode(false); setStep("upload"); }
  };

  const handleImageTap = (x: number, y: number) => {
    if (!tagMode) return;
    setPendingPosition({ x, y });
    setSearchOpen(true);
  };

  const selectUser = (p: { user_id: string; username: string; avatar_url: string | null }) => {
    if (!pendingPosition) return;
    setTaggedUsers(prev => [...prev, { ...p, x: pendingPosition.x, y: pendingPosition.y }]);
    setSearchOpen(false);
    setPendingPosition(null);
  };

  const removeTag = (userId: string) => setTaggedUsers(prev => prev.filter(t => t.user_id !== userId));

  const canPost = activeTab === "photo" ? previews.length > 0 : caption.trim().length > 0;

  const applyFilterToCanvas = async (imgSrc: string, filterStyle: React.CSSProperties): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.filter = (filterStyle.filter as string) || "none";
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/jpeg", 0.92);
      };
      img.onerror = reject;
      img.src = imgSrc;
    });
  };

  const handlePost = async () => {
    if (!user || !canPost) return;
    setPosting(true);
    try {
      let imageUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const style = filterStyles[i];
        const hasFilter = style && style.filter && style.filter !== "none" && style.filter !== "";

        let uploadData: Blob | File = file;
        if (hasFilter) {
          try {
            uploadData = await applyFilterToCanvas(previews[i], style);
          } catch {
            uploadData = file;
          }
        }

        const ext = hasFilter ? "jpg" : file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("posts").upload(path, uploadData);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(path);
        imageUrls.push(publicUrl);
      }

      const { data: postData, error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: imageUrls.length > 0 ? imageUrls[0] : null,
        caption,
        location,
      }).select("id").single();
      if (error) throw error;

      if (postData && imageUrls.length > 0) {
        await supabase.from("post_images").insert(
          imageUrls.map((url, i) => ({ post_id: postData.id, image_url: url, display_order: i }))
        );
      }

      if (taggedUsers.length > 0 && postData) {
        await supabase.from("post_tags").insert(
          taggedUsers.map(t => ({ post_id: postData.id, tagged_user_id: t.user_id, x_position: t.x, y_position: t.y }))
        );
      }

      toast.success("Post shared!");
      navigate("/feed");
    } catch (err: any) {
      toast.error(err.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  // Effects step
  if (step === "effects" && activeTab === "photo" && previews.length > 0) {
    return (
      <ImageEffectsEditor
        images={previews}
        onApply={(styles) => {
          setFilterStyles(styles);
          setStep("publish");
        }}
        onBack={() => setStep("upload")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => {
          if (step === "publish" && activeTab === "photo") {
            setStep("effects");
          } else {
            navigate(-1);
          }
        }}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">
          {step === "publish" ? "New Post" : "New Post"}
        </h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePost}
          disabled={!canPost || posting}
          className="text-sm font-bold text-primary disabled:opacity-40"
        >
          {posting ? "Posting..." : "Share"}
        </motion.button>
      </div>

      {/* Tabs - only show in upload step */}
      {step === "upload" && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("photo")}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              activeTab === "photo" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"
            }`}
          >
            Photo
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              activeTab === "text" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"
            }`}
          >
            Text
          </button>
        </div>
      )}

      {activeTab === "photo" ? (
        <>
          {step === "upload" && previews.length === 0 ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-4 w-full py-20 text-muted-foreground"
            >
              <PuffyIcon name="camera" size={48} className="opacity-40" />
              <p className="text-sm">Tap to select photos</p>
            </button>
          ) : step === "publish" ? (
            <>
              <ImageCarouselPreview
                images={previews}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                tagMode={tagMode}
                taggedUsers={taggedUsers}
                onImageTap={handleImageTap}
                onRemoveImage={removeImage}
                filterStyles={filterStyles}
              />

              <div className="px-4 py-4 space-y-4">
                {files.length < 10 && (
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-primary font-medium">
                    <PuffyIcon name="plus" size={16} />
                    Add more photos ({files.length}/10)
                  </button>
                )}

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
                  onClick={() => setTagMode(!tagMode)}
                  className={`flex items-center gap-3 border-t border-border pt-4 w-full text-left ${tagMode ? "text-primary" : "text-foreground"}`}
                >
                  <PuffyIcon name="user-plus" size={18} className={tagMode ? "" : "opacity-50"} />
                  <span className="text-sm flex-1">Tag people</span>
                  {taggedUsers.length > 0 && <span className="text-xs text-muted-foreground">{taggedUsers.length} tagged</span>}
                </button>

                {taggedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {taggedUsers.map(t => (
                      <div key={t.user_id} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
                        {t.avatar_url ? <img src={t.avatar_url} className="h-4 w-4 rounded-sm object-cover" /> : <PuffyIcon name="user" size={12} />}
                        <span className="text-xs font-medium text-foreground">@{t.username}</span>
                        <button onClick={() => removeTag(t.user_id)} className="ml-1"><span className="text-muted-foreground text-xs">✕</span></button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setPreviews([]); setFiles([]); setTaggedUsers([]); setTagMode(false); setCurrentIndex(0); setStep("upload"); setFilterStyles([]); }}
                  className="text-xs text-accent"
                >
                  Remove all photos
                </button>
              </div>
            </>
          ) : null}

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </>
      ) : (
        /* Text post tab */
        <div className="px-4 py-4 space-y-4">
          <textarea
            autoFocus
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[200px]"
            rows={8}
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
        </div>
      )}

      <TagSearchSheet
        isOpen={searchOpen}
        onClose={() => { setSearchOpen(false); setPendingPosition(null); }}
        onSelect={selectUser}
        taggedUserIds={taggedUsers.map(t => t.user_id)}
      />
    </div>
  );
};

export default CreatePost;
