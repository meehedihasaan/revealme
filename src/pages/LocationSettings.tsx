import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const LocationSettings = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [showOnMap, setShowOnMap] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("latitude, longitude, show_on_map, location")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setShowOnMap(data.show_on_map ?? false);
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
        setLocationName(data.location || "");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support location detection." });
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
          );
          const data = await res.json();
          const city =
            data.address?.city || data.address?.town || data.address?.village ||
            data.address?.county || data.address?.state || "";
          if (city) setLocationName(city);
        } catch {}
        setDetecting(false);
        toast({ title: "Location detected!", description: `${locationName || "Your area"} found` });
      },
      () => {
        setDetecting(false);
        toast({ title: "Location access denied", description: "Please allow location access in your browser settings.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, any> = {
      show_on_map: showOnMap,
      location: locationName || null,
    };
    if (latitude !== null && longitude !== null) {
      updates.latitude = latitude;
      updates.longitude = longitude;
    }
    if (!showOnMap) {
      updates.latitude = null;
      updates.longitude = null;
    }
    await supabase.from("profiles").update(updates).eq("user_id", user.id);
    await refreshProfile();
    setSaving(false);
    toast({ title: "Location settings saved!" });
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button onClick={() => navigate(-1)}><PuffyIcon name="arrow-left" size={22} /></button>
          <h1 className="text-lg font-semibold text-foreground">Location</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}><PuffyIcon name="arrow-left" size={22} /></button>
        <h1 className="text-lg font-semibold text-foreground">Location</h1>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-6"
        >
          <div className="relative">
            <div className="h-20 w-20 rounded-[22px] bg-primary/10 flex items-center justify-center">
              <MapPin size={36} className="text-primary" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-[22px] border-2 border-primary/30"
            />
          </div>
          <h2 className="text-xl font-bold text-foreground mt-4">Location Settings</h2>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-[260px]">
            Control how others discover you on the map
          </p>
        </motion.div>

        {/* Visibility toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {showOnMap ? <Eye size={18} className="text-primary" /> : <EyeOff size={18} className="text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Visible on map</p>
                <p className="text-[11px] text-muted-foreground">
                  {showOnMap ? "Others can find you nearby" : "You're hidden from the map"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOnMap(!showOnMap)}
              className={`relative h-[28px] w-[50px] rounded-full transition-all duration-300 ${
                showOnMap ? "bg-primary" : "bg-muted"
              }`}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-background shadow-md ${
                  showOnMap ? "left-[25px]" : "left-[3px]"
                }`}
              />
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showOnMap && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Detect location */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Auto Detect</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  We'll detect your approximate area. Your exact address is never shared.
                </p>
                <button
                  onClick={detectLocation}
                  disabled={detecting}
                  className="flex items-center gap-2.5 rounded-xl bg-primary/10 text-primary px-4 py-3 text-sm font-semibold w-full justify-center active:scale-[0.98] transition-transform"
                >
                  {detecting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Navigation size={16} />
                  )}
                  {detecting ? "Detecting..." : "Detect My Location"}
                </button>

                <AnimatePresence>
                  {latitude !== null && longitude !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 rounded-xl bg-secondary px-4 py-3"
                    >
                      <MapPin size={14} className="text-primary shrink-0" />
                      <p className="text-xs text-foreground">
                        {locationName ? `${locationName} · ` : ""}
                        {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Manual location */}
              <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Manual Location</p>
                <p className="text-[11px] text-muted-foreground">
                  Or type your city/area name manually
                </p>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Dhaka, Sylhet, Chittagong..."
                  className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                />
              </div>

              {/* Privacy card */}
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Your privacy matters</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Only your approximate area is shown. Turn off anytime to remove your location.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold shadow-lg shadow-primary/20"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <PuffyIcon name="check" size={14} className="!filter-none" />}
          {saving ? "Saving..." : "Save Settings"}
        </motion.button>
      </div>
    </div>
  );
};

export default LocationSettings;
