import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Loader2 } from "lucide-react";
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

        // Reverse geocode to get city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.address?.state ||
            "";
          if (city) setLocationName(city);
        } catch {
          // Reverse geocode failed, coordinates still saved
        }
        setDetecting(false);
        toast({ title: "Location detected!", description: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      },
      (err) => {
        setDetecting(false);
        toast({
          title: "Location access denied",
          description: "Please allow location access in your browser settings.",
          variant: "destructive",
        });
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
          <button onClick={() => navigate(-1)}><PuffyIcon name="arrow-left" size={24} /></button>
          <h1 className="text-lg font-semibold text-foreground">Location Settings</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}><PuffyIcon name="arrow-left" size={24} /></button>
        <h1 className="text-lg font-semibold text-foreground">Location Settings</h1>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Show on map toggle */}
        <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Show me on map</p>
              <p className="text-xs text-muted-foreground">Others can see your location on the map</p>
            </div>
          </div>
          <button
            onClick={() => setShowOnMap(!showOnMap)}
            className={`relative h-7 w-12 rounded-full transition-colors ${showOnMap ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                showOnMap ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {showOnMap && (
          <>
            {/* Auto detect */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Automatic Location</p>
              <p className="text-xs text-muted-foreground">
                Reveal will detect your location with your permission. Your exact address is never shared — only your approximate area is shown on the map.
              </p>
              <button
                onClick={detectLocation}
                disabled={detecting}
                className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold w-full justify-center"
              >
                {detecting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Navigation size={18} />
                )}
                {detecting ? "Detecting..." : "Detect My Location"}
              </button>
              {latitude !== null && longitude !== null && (
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5">
                  <MapPin size={14} className="text-primary shrink-0" />
                  <p className="text-xs text-foreground">
                    {locationName ? `${locationName} · ` : ""}
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            {/* Manual location */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Manual Location</p>
              <p className="text-xs text-muted-foreground">
                Or type your city/area name manually.
              </p>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Dhaka, Sylhet, Chittagong..."
                className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Privacy note */}
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
              <div className="flex gap-3">
                <PuffyIcon name="shield" size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Privacy</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your location is only used to show your approximate area on the map. You can turn this off anytime, and your location data will be removed.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <PuffyIcon name="check" size={16} className="!filter-none" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default LocationSettings;
