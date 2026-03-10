import { useState } from "react";
import { motion } from "framer-motion";

export interface ImageFilter {
  name: string;
  style: React.CSSProperties;
}

const FILTERS: ImageFilter[] = [
  { name: "Normal", style: {} },
  { name: "Clarendon", style: { filter: "contrast(1.2) saturate(1.35)" } },
  { name: "Gingham", style: { filter: "brightness(1.05) hue-rotate(-10deg)" } },
  { name: "Moon", style: { filter: "grayscale(1) contrast(1.1) brightness(1.1)" } },
  { name: "Lark", style: { filter: "contrast(0.9) brightness(1.15) saturate(1.2)" } },
  { name: "Reyes", style: { filter: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)" } },
  { name: "Juno", style: { filter: "contrast(1.15) saturate(1.8) brightness(1.05) sepia(0.08)" } },
  { name: "Slumber", style: { filter: "saturate(0.66) brightness(1.05) sepia(0.15)" } },
  { name: "Crema", style: { filter: "sepia(0.3) contrast(0.9) brightness(1.1) saturate(0.85)" } },
  { name: "Ludwig", style: { filter: "contrast(1.05) saturate(1.3) brightness(1.05)" } },
  { name: "Aden", style: { filter: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)" } },
  { name: "Perpetua", style: { filter: "brightness(1.1) saturate(1.1) contrast(1.05)" } },
];

interface ImageEffectsEditorProps {
  images: string[];
  onApply: (filterStyles: React.CSSProperties[]) => void;
  onBack: () => void;
}

const ImageEffectsEditor = ({ images, onApply, onBack }: ImageEffectsEditorProps) => {
  const [selectedFilters, setSelectedFilters] = useState<number[]>(images.map(() => 0));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"filters" | "adjust">("filters");

  // Adjustments per image
  const [adjustments, setAdjustments] = useState(
    images.map(() => ({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, fade: 0, sharpen: 0 }))
  );

  const currentFilter = FILTERS[selectedFilters[currentImageIndex]];
  const currentAdj = adjustments[currentImageIndex];

  const getAdjustmentStyle = (adj: typeof currentAdj): React.CSSProperties => ({
    filter: `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%) sepia(${adj.fade}%) ${adj.warmth > 0 ? `hue-rotate(${adj.warmth}deg)` : adj.warmth < 0 ? `hue-rotate(${adj.warmth}deg)` : ""}`.trim(),
  });

  const getCombinedStyle = (imgIdx: number): React.CSSProperties => {
    const filterStyle = FILTERS[selectedFilters[imgIdx]].style;
    const adjStyle = getAdjustmentStyle(adjustments[imgIdx]);
    // Combine filter strings
    const filterStr = [filterStyle.filter || "", adjStyle.filter || ""].filter(Boolean).join(" ");
    return { filter: filterStr || undefined };
  };

  const updateAdjustment = (key: string, value: number) => {
    setAdjustments(prev => prev.map((a, i) => i === currentImageIndex ? { ...a, [key]: value } : a));
  };

  const handleApply = () => {
    onApply(images.map((_, i) => getCombinedStyle(i)));
  };

  const sliders = [
    { key: "brightness", label: "Brightness", min: 50, max: 150, default: 100 },
    { key: "contrast", label: "Contrast", min: 50, max: 150, default: 100 },
    { key: "saturation", label: "Saturation", min: 0, max: 200, default: 100 },
    { key: "warmth", label: "Warmth", min: -30, max: 30, default: 0 },
    { key: "fade", label: "Fade", min: 0, max: 50, default: 0 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={onBack} className="text-foreground">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-foreground">Edit</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleApply}
          className="text-sm font-bold text-primary"
        >
          Next
        </motion.button>
      </div>

      {/* Image preview - 4:5 aspect ratio like Instagram */}
      <div className="relative w-full bg-black" style={{ aspectRatio: "4/5" }}>
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full z-10">
            {currentImageIndex + 1}/{images.length}
          </div>
        )}
        <img
          src={images[currentImageIndex]}
          alt="Preview"
          className="w-full h-full object-cover"
          style={getCombinedStyle(currentImageIndex)}
        />
      </div>

      {/* Image selector dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2 bg-background">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentImageIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("filters")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${
            activeTab === "filters" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"
          }`}
        >
          Filters
        </button>
        <button
          onClick={() => setActiveTab("adjust")}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${
            activeTab === "adjust" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground"
          }`}
        >
          Adjust
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "filters" ? (
          <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
            {FILTERS.map((f, idx) => (
              <button
                key={f.name}
                onClick={() => setSelectedFilters(prev => prev.map((v, i) => i === currentImageIndex ? idx : v))}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                    selectedFilters[currentImageIndex] === idx ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img
                    src={images[currentImageIndex]}
                    alt={f.name}
                    className="w-full h-full object-cover"
                    style={f.style}
                  />
                </div>
                <span className={`text-[10px] font-medium ${
                  selectedFilters[currentImageIndex] === idx ? "text-primary" : "text-muted-foreground"
                }`}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-3 space-y-4">
            {sliders.map(s => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(currentAdj as any)[s.key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  value={(currentAdj as any)[s.key]}
                  onChange={(e) => updateAdjustment(s.key, Number(e.target.value))}
                  className="w-full h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            ))}
            <button
              onClick={() => setAdjustments(prev => prev.map((a, i) => i === currentImageIndex ? { brightness: 100, contrast: 100, saturation: 100, warmth: 0, fade: 0, sharpen: 0 } : a))}
              className="text-xs text-primary font-medium"
            >
              Reset adjustments
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEffectsEditor;
