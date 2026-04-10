import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ActivitySettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [showOnMap, setShowOnMap] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("show_on_map").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setShowOnMap(data.show_on_map);
    });
  }, [user]);

  const toggleActivityStatus = (checked: boolean) => {
    setShowActivityStatus(checked);
    toast.success(checked ? "Activity status visible" : "Activity status hidden");
  };

  const toggleShowOnMap = async (checked: boolean) => {
    if (!user) return;
    setShowOnMap(checked);
    await supabase.from("profiles").update({ show_on_map: checked }).eq("user_id", user.id);
    toast.success(checked ? "You're visible on the map" : "You're hidden from the map");
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-4 py-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h2>
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {children}
      </div>
    </div>
  );

  const Row = ({ label, desc, value, onToggle }: { label: string; desc?: string; value: boolean; onToggle: (v: boolean) => void }) => (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1 mr-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onToggle} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Activity & Status</h1>
      </div>

      <Section title="Online Status">
        <Row label="Show Activity Status" desc="Let others see when you're active" value={showActivityStatus} onToggle={toggleActivityStatus} />
      </Section>

      <Section title="Location">
        <Row label="Show on Map" desc="Allow others to see your location on the user map" value={showOnMap} onToggle={toggleShowOnMap} />
      </Section>

      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          When activity status is turned off, you won't be able to see the activity status of other accounts.
        </p>
      </div>
    </div>
  );
};

export default ActivitySettings;
