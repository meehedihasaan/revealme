import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ZoomIn, ZoomOut } from "lucide-react";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MapUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
}

// Bangladesh bounds
const BD_LAT_MIN = 20.5;
const BD_LAT_MAX = 26.7;
const BD_LNG_MIN = 87.8;
const BD_LNG_MAX = 92.8;
const SVG_W = 500;
const SVG_H = 600;

const geoToSvg = (lat: number, lng: number) => ({
  x: ((lng - BD_LNG_MIN) / (BD_LNG_MAX - BD_LNG_MIN)) * (SVG_W - 60) + 30,
  y: ((BD_LAT_MAX - lat) / (BD_LAT_MAX - BD_LAT_MIN)) * (SVG_H - 60) + 30,
});

// Simplified Bangladesh outline
const BD_PATH = `M 245 18 L 260 22 L 278 15 L 295 20 L 310 28 L 328 22 L 345 30 L 360 25 L 375 35
L 390 28 L 405 38 L 415 50 L 425 42 L 438 55 L 445 70 L 450 85 L 458 78 L 465 95
L 460 110 L 468 125 L 475 140 L 470 155 L 478 170 L 472 185 L 465 195 L 460 210
L 455 225 L 462 240 L 458 255 L 450 265 L 445 280 L 452 295 L 448 310 L 440 325
L 435 340 L 442 355 L 438 370 L 430 385 L 425 400 L 420 415 L 428 430 L 422 445
L 415 455 L 408 470 L 400 480 L 392 490 L 385 500 L 375 510 L 365 520 L 358 530
L 345 525 L 335 535 L 322 528 L 310 540 L 298 535 L 285 542 L 272 535 L 260 540
L 248 532 L 235 538 L 222 530 L 210 535 L 198 528 L 185 532 L 172 525 L 160 530
L 148 522 L 138 515 L 128 508 L 118 500 L 110 490 L 102 480 L 95 468 L 88 455
L 82 442 L 78 428 L 72 415 L 68 400 L 65 385 L 62 370 L 58 355 L 55 340
L 52 325 L 50 310 L 48 295 L 52 280 L 48 265 L 52 250 L 55 235 L 50 220
L 55 205 L 60 190 L 58 175 L 62 160 L 68 145 L 65 130 L 70 115 L 75 100
L 72 85 L 78 70 L 85 58 L 90 45 L 98 38 L 108 30 L 120 25 L 135 22
L 148 28 L 162 22 L 178 25 L 192 20 L 208 25 L 222 18 L 235 22 L 245 18 Z`;

const divisionLabels = [
  { name: "Rangpur", lat: 25.74, lng: 89.28 },
  { name: "Rajshahi", lat: 24.37, lng: 88.60 },
  { name: "Mymensingh", lat: 24.75, lng: 90.42 },
  { name: "Sylhet", lat: 24.89, lng: 91.87 },
  { name: "Dhaka", lat: 23.81, lng: 90.41 },
  { name: "Khulna", lat: 22.85, lng: 89.54 },
  { name: "Barishal", lat: 22.70, lng: 90.35 },
  { name: "Chattogram", lat: 22.36, lng: 91.78 },
];

const groupNearby = (users: (MapUser & { sx: number; sy: number })[]) => {
  const groups: Record<string, (MapUser & { sx: number; sy: number })[]> = {};
  users.forEach((u) => {
    let foundKey: string | null = null;
    for (const key of Object.keys(groups)) {
      const [gx, gy] = key.split("-").map(Number);
      if (Math.abs(gx - u.sx) < 15 && Math.abs(gy - u.sy) < 15) { foundKey = key; break; }
    }
    const key = foundKey || `${Math.round(u.sx)}-${Math.round(u.sy)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  });
  return groups;
};

const UserMap = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);

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
            username: u.username,
            avatar_url: u.avatar_url,
            latitude: u.latitude,
            longitude: u.longitude,
          }))
      );
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setScale((s) => Math.min(5, Math.max(0.5, s + delta)));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -0.2 : 0.2);
  }, [handleZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x) / scale,
      y: translateStart.current.y + (e.clientY - panStart.current.y) / scale,
    });
  };
  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateStart.current = { ...translate };
    } else if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      setTranslate({
        x: translateStart.current.x + (e.touches[0].clientX - panStart.current.x) / scale,
        y: translateStart.current.y + (e.touches[0].clientY - panStart.current.y) / scale,
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist.current > 0) handleZoom((dist - lastPinchDist.current) * 0.01);
      lastPinchDist.current = dist;
    }
  };
  const handleTouchEnd = () => { setIsPanning(false); lastPinchDist.current = 0; };

  const mapped = users.map((u) => {
    const { x, y } = geoToSvg(u.latitude, u.longitude);
    return { ...u, sx: x, sy: y };
  });
  const groups = groupNearby(mapped);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate(-1)}><PuffyIcon name="arrow-left" size={24} /></button>
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
        <div className="flex-1 relative overflow-hidden touch-none select-none">
          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
            <button onClick={() => handleZoom(0.3)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border shadow-md">
              <ZoomIn size={18} className="text-foreground" />
            </button>
            <button onClick={() => handleZoom(-0.3)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border shadow-md">
              <ZoomOut size={18} className="text-foreground" />
            </button>
            <button onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }} className="h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border shadow-md text-xs font-bold text-foreground">
              1:1
            </button>
          </div>

          <div
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.2s ease-out",
              }}
            >
              <div className="relative" style={{ width: "90%", maxWidth: 420, aspectRatio: "500/600" }}>
                <svg viewBox="0 0 500 600" className="w-full h-full" style={{ filter: "drop-shadow(0 2px 8px hsl(var(--foreground) / 0.1))" }}>
                  <rect x="0" y="0" width="500" height="600" fill="hsl(var(--background))" />
                  <path d={BD_PATH} fill="hsl(var(--secondary))" stroke="hsl(var(--primary) / 0.4)" strokeWidth="2" strokeLinejoin="round" />
                  {divisionLabels.map((d) => {
                    const pos = geoToSvg(d.lat, d.lng);
                    return (
                      <g key={d.name}>
                        <circle cx={pos.x} cy={pos.y} r="3" fill="hsl(var(--primary) / 0.15)" />
                        <text x={pos.x} y={pos.y - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontWeight="600" opacity={0.6}>
                          {d.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {Object.values(groups).map((group) => {
                  const { sx, sy } = group[0];
                  const pctX = (sx / SVG_W) * 100;
                  const pctY = (sy / SVG_H) * 100;
                  return (
                    <div
                      key={`${Math.round(sx)}-${Math.round(sy)}`}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${pctX}%`, top: `${pctY}%`, transform: "translate(-50%, -100%)" }}
                    >
                      <div className="flex -space-x-1.5">
                        {group.slice(0, 3).map((u) => (
                          <button
                            key={u.user_id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/user/${u.user_id}`); }}
                            className="relative z-10 hover:z-20 transition-transform hover:scale-125"
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.username} className="h-7 w-7 rounded-full object-cover border-2 border-background shadow-lg" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border-2 border-background shadow-lg">
                                <PuffyIcon name="user" size={12} />
                              </div>
                            )}
                          </button>
                        ))}
                        {group.length > 3 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background shadow-lg text-[10px] font-bold">
                            +{group.length - 3}
                          </div>
                        )}
                      </div>
                      <MapPin size={12} className="text-primary -mt-0.5 drop-shadow" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {mapped.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
              <MapPin size={40} className="text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground bg-card/90 rounded-xl px-5 py-3 shadow text-center">
                No users sharing their location yet.<br />
                <span className="text-xs">Go to Settings → Location to share yours!</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserMap;
