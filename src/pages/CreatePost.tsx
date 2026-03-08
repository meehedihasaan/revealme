import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TaggedUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  x: number;
  y: number;
}

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [posting, setPosting] = useState(false);

  // Tag people
  const [tagMode, setTagMode] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tagMode || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPosition({ x, y });
    setSearchOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .neq("user_id", user?.id || "")
        .ilike("username", `%${searchQuery}%`)
        .limit(10);
      // Filter out already tagged
      const taggedIds = new Set(taggedUsers.map(t => t.user_id));
      setSearchResults((data || []).filter(p => !taggedIds.has(p.user_id)));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user, taggedUsers]);

  const selectUser = (p: any) => {
    if (!pendingPosition) return;
    setTaggedUsers(prev => [...prev, {
      user_id: p.user_id,
      username: p.username,
      avatar_url: p.avatar_url,
      x: pendingPosition.x,
      y: pendingPosition.y,
    }]);
    setSearchOpen(false);
    setPendingPosition(null);
  };

  const removeTag = (userId: string) => {
    setTaggedUsers(prev => prev.filter(t => t.user_id !== userId));
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

      const { data: postData, error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption,
        location,
      }).select("id").single();
      if (error) throw error;

      // Insert tags
      if (taggedUsers.length > 0 && postData) {
        await supabase.from("post_tags").insert(
          taggedUsers.map(t => ({
            post_id: postData.id,
            tagged_user_id: t.user_id,
            x_position: t.x,
            y_position: t.y,
          }))
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
        <div ref={imgRef} className="relative w-full" onClick={handleImageTap}>
          <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 400 }} />
          {/* Tag indicators on image */}
          {taggedUsers.map((t) => (
            <div
              key={t.user_id}
              className="absolute pointer-events-none"
              style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -100%)" }}
            >
              <div className="bg-black/75 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1">
                <PuffyIcon name="user" size={10} className="invert" />
                {t.username}
              </div>
              <div className="w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/75" />
            </div>
          ))}
          {tagMode && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
              <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">Tap to tag someone</span>
            </div>
          )}
        </div>
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

          {/* Tag people button */}
          <button
            onClick={() => setTagMode(!tagMode)}
            className={`flex items-center gap-3 border-t border-border pt-4 w-full text-left ${tagMode ? "text-primary" : "text-foreground"}`}
          >
            <PuffyIcon name="user-plus" size={18} className={tagMode ? "" : "opacity-50"} />
            <span className="text-sm flex-1">Tag people</span>
            {taggedUsers.length > 0 && (
              <span className="text-xs text-muted-foreground">{taggedUsers.length} tagged</span>
            )}
          </button>

          {/* Tagged users list */}
          {taggedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {taggedUsers.map(t => (
                <div key={t.user_id} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <PuffyIcon name="user" size={12} />
                  )}
                  <span className="text-xs font-medium text-foreground">@{t.username}</span>
                  <button onClick={() => removeTag(t.user_id)} className="ml-1">
                    <span className="text-muted-foreground text-xs">✕</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setPreview(null); setFile(null); setTaggedUsers([]); setTagMode(false); }}
            className="text-xs text-accent"
          >
            Remove photo
          </button>
        </div>
      )}

      {/* Search user bottom sheet */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => { setSearchOpen(false); setPendingPosition(null); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-card border-t border-border max-h-[60vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
              </div>
              <p className="text-center text-sm font-semibold text-foreground pb-2">Tag a person</p>
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2.5">
                  <PuffyIcon name="search" size={16} className="opacity-50" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 pb-8">
                {searchResults.map(p => (
                  <button
                    key={p.user_id}
                    onClick={() => selectUser(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary/50"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <PuffyIcon name="user" size={18} />
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">@{p.username}</span>
                  </button>
                ))}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreatePost;
