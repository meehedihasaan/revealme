import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";

interface MapUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
}

const BD_CENTER: L.LatLngExpression = [23.685, 90.356];

const UserMap = () => {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, latitude, longitude, show_on_map")
        .eq("show_on_map", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      setUsers(
        (data || [])
          .filter((u: any) => u.latitude != null && u.longitude != null)
          .map((u: any) => ({
            user_id: u.user_id,
            username: u.username || "user",
            avatar_url: u.avatar_url,
            latitude: u.latitude,
            longitude: u.longitude,
          }))
      );
      setLoading(false);
    };
    fetchUsers();
  }, []);

  // Initialize map
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BD_CENTER,
      zoom: 7,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    // Add markers
    users.forEach((u) => {
      const avatarHtml = u.avatar_url
        ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />`
        : `<span style="font-size:16px;font-weight:bold;color:white;">${(u.username[0] || "U").toUpperCase()}</span>`;

      const icon = L.divIcon({
        html: `<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;background:#6b7280;">
          ${avatarHtml}
        </div>`,
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([u.latitude, u.longitude], { icon }).addTo(map);

      const popupContent = document.createElement("div");
      popupContent.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;padding:2px;";
      popupContent.innerHTML = `
        ${u.avatar_url
          ? `<img src="${u.avatar_url}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;" />`
          : `<div style="width:32px;height:32px;border-radius:8px;background:#6b7280;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">${(u.username[0] || "U").toUpperCase()}</div>`
        }
        <div>
          <p style="font-weight:600;font-size:13px;margin:0;">@${u.username}</p>
          <p style="font-size:11px;color:#666;margin:0;">View profile →</p>
        </div>
      `;
      popupContent.addEventListener("click", () => {
        navigate(`/user/${u.user_id}`);
      });

      marker.bindPopup(popupContent, {
        className: "custom-leaflet-popup",
        closeButton: false,
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, users, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 z-[1000] bg-background relative">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground flex-1">Users on Map</h1>
        <button onClick={() => navigate("/settings/location")} className="p-1">
          <PuffyIcon name="settings" size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "calc(100vh - 57px)" }} />
          {users.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
              <div className="bg-card/95 rounded-xl px-5 py-4 shadow-lg text-center">
                <p className="text-sm font-medium text-foreground">No users on the map yet</p>
                <p className="text-xs text-muted-foreground mt-1">Go to Settings → Location to share yours!</p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 4px !important;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 8px 10px !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
};

export default UserMap;
