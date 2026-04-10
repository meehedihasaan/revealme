import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const DataStorageSettings = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    autoDownloadPhotos: true,
    autoDownloadVideos: false,
    highQualityUploads: true,
    dataSaver: false,
    saveOriginalPhotos: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    localStorage.removeItem("theme");
    toast.success("Cache cleared successfully");
  };

  const handleClearSearchHistory = () => {
    localStorage.removeItem("search_history");
    toast.success("Search history cleared");
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-4 py-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h2>
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {children}
      </div>
    </div>
  );

  const Row = ({ label, desc, value, onToggle }: { label: string; desc?: string; value: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1 mr-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onToggle} />
    </div>
  );

  const ActionRow = ({ label, desc, onClick, destructive }: { label: string; desc?: string; onClick: () => void; destructive?: boolean }) => (
    <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-3.5 text-left active:bg-secondary/30 transition-colors">
      <div className="flex-1">
        <p className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <PuffyIcon name="chevron-right" size={16} className="opacity-40" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Data & Storage</h1>
      </div>

      <Section title="Media">
        <Row label="Auto-Download Photos" desc="Automatically download photos on WiFi" value={settings.autoDownloadPhotos} onToggle={() => toggle("autoDownloadPhotos")} />
        <Row label="Auto-Download Videos" desc="Automatically download videos on WiFi" value={settings.autoDownloadVideos} onToggle={() => toggle("autoDownloadVideos")} />
        <Row label="High Quality Uploads" desc="Upload photos at full resolution" value={settings.highQualityUploads} onToggle={() => toggle("highQualityUploads")} />
        <Row label="Save Original Photos" desc="Save photos to your device after posting" value={settings.saveOriginalPhotos} onToggle={() => toggle("saveOriginalPhotos")} />
      </Section>

      <Section title="Data Usage">
        <Row label="Data Saver" desc="Reduce data usage when on mobile data" value={settings.dataSaver} onToggle={() => toggle("dataSaver")} />
      </Section>

      <Section title="Storage">
        <ActionRow label="Clear Cache" desc="Free up storage space" onClick={handleClearCache} />
        <ActionRow label="Clear Search History" desc="Remove all recent searches" onClick={handleClearSearchHistory} />
      </Section>
    </div>
  );
};

export default DataStorageSettings;
