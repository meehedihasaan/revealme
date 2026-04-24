import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHighlights, useCreateHighlight, useDeleteHighlight, Highlight } from "@/hooks/useHighlights";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PuffyIcon from "./PuffyIcon";

interface HighlightsRowProps {
  userId: string;
  isOwnProfile?: boolean;
}

const HighlightsRow = ({ userId, isOwnProfile = false }: HighlightsRowProps) => {
  const { data: highlights = [], isLoading } = useHighlights(userId);
  const createHighlight = useCreateHighlight();
  const deleteHighlight = useDeleteHighlight();
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim() || selectedFiles.length === 0) {
      toast.error("Add a title and at least one image");
      return;
    }
    setCreating(true);
    try {
      const urls: string[] = [];
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop();
        const path = `highlights/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('stories').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('stories').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      await createHighlight.mutateAsync({ title: newTitle.trim(), imageUrls: urls });
      toast.success("Highlight created!");
      setShowCreateDialog(false);
      setNewTitle("");
      setSelectedFiles([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to create highlight");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteHighlight.mutateAsync(id);
    toast.success("Highlight deleted");
  };

  if (isLoading) return null;
  if (!isOwnProfile && highlights.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-none">
        {isOwnProfile && (
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className="flex h-16 w-16 items-center justify-center avatar-leaf border-2 border-dashed border-muted-foreground/30">
              <Plus size={24} className="text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground max-w-[64px] truncate">New</span>
          </button>
        )}
        {highlights.map((h) => (
          <button
            key={h.id}
            onClick={() => { setViewingHighlight(h); setViewIndex(0); }}
            className="flex shrink-0 flex-col items-center gap-1 group relative"
          >
            <div className="h-16 w-16 avatar-leaf border-2 border-border overflow-hidden bg-secondary">
              {h.cover_image_url ? (
                <img src={h.cover_image_url} alt={h.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <PuffyIcon name="image" size={20} />
                </div>
              )}
            </div>
            <span className="text-[10px] text-foreground max-w-[64px] truncate">{h.title}</span>
          </button>
        ))}
      </div>

      {/* Highlight viewer */}
      <AnimatePresence>
        {viewingHighlight && viewingHighlight.items && viewingHighlight.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black flex flex-col"
            onClick={() => setViewingHighlight(null)}
          >
            {/* Progress bars */}
            <div className="flex gap-1 px-2 pt-2 safe-top">
              {viewingHighlight.items.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                  <div className={`h-full bg-white transition-all duration-300 ${i < viewIndex ? 'w-full' : i === viewIndex ? 'w-full' : 'w-0'}`} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-white font-semibold text-sm">{viewingHighlight.title}</span>
              <div className="ml-auto flex gap-2">
                {isOwnProfile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(viewingHighlight.id); setViewingHighlight(null); }}
                    className="p-1.5 rounded-full bg-white/10 text-white"
                  >
                    <PuffyIcon name="trash" size={16} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setViewingHighlight(null); }}
                  className="p-1.5 rounded-full bg-white/10 text-white"
                >
                  <PuffyIcon name="x" size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
              <img
                src={viewingHighlight.items[viewIndex].image_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
              {/* Tap zones */}
              <button
                className="absolute left-0 top-0 bottom-0 w-1/3"
                onClick={() => setViewIndex(i => Math.max(0, i - 1))}
              />
              <button
                className="absolute right-0 top-0 bottom-0 w-1/3"
                onClick={() => {
                  if (viewIndex < (viewingHighlight.items?.length || 1) - 1) {
                    setViewIndex(i => i + 1);
                  } else {
                    setViewingHighlight(null);
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create highlight dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateDialog(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-card p-5"
            >
              <div className="flex justify-center pb-3">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-4">New Highlight</h3>

              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Highlight name"
                maxLength={30}
                className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              />

              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 cursor-pointer mb-3 hover:bg-secondary/50 transition-colors">
                <PuffyIcon name="image" size={20} />
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.length > 0 ? `${selectedFiles.length} selected` : "Choose images"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
              </label>

              {selectedFiles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mb-4">
                  {selectedFiles.map((f, i) => (
                    <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 rounded-xl bg-secondary py-3 text-sm font-semibold text-secondary-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim() || selectedFiles.length === 0}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HighlightsRow;
