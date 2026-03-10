import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

// Create custom avatar marker icon
const createAvatarIcon = (avatarUrl: string | null, username: string) => {
  const html = avatarUrl
    ? `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
        <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />
      </div>`
    : `<div style="width:36px;height:36px;border-radius:50%;background:#6b7280;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">
        ${(username || "U")[0].toUpperCase()}
      </div>`;

  return L.divIcon({
    html,
    className: "custom-avatar-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
};

// Bangladesh center and bounds
const BD_CENTER: [number, number] = [23.685, 90.356];
const BD_BOUNDS: [[number, number], [number, number]] = [
  [20.5, 87.8],
  [26.7, 92.8],
];

const UserMap = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
          <MapContainer
            center={BD_CENTER}
            zoom={7}
            minZoom={6}
            maxZoom={18}
            maxBounds={BD_BOUNDS}
            maxBoundsViscosity={0.8}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {users.map((u) => (
              <Marker
                key={u.user_id}
                position={[u.latitude, u.longitude]}
                icon={createAvatarIcon(u.avatar_url, u.username)}
              >
                <Popup>
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(`/user/${u.user_id}`)}
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.username}
                        style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        {(u.username || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>@{u.username}</p>
                      <p style={{ fontSize: 11, color: "#666", margin: 0 }}>View profile →</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {users.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
              <div className="bg-card/95 rounded-xl px-5 py-4 shadow-lg text-center">
                <p className="text-sm font-medium text-foreground">No users on the map yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to Settings → Location to share yours!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-avatar-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 4px !important;
        }
        .leaflet-popup-content {
          margin: 8px 10px !important;
        }
      `}</style>
    </div>
  );
};

export default UserMap;
