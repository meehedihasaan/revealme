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
  location: string;
}

// Accurate Bangladesh outline path (simplified from real geo data, viewBox 0 0 500 600)
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

// Division boundaries (inner lines)
const BD_DIVISIONS = [
  // Rangpur-Rajshahi border
  "M 50 220 L 120 215 L 180 220 L 240 215",
  // Rajshahi-Khulna border  
  "M 50 340 L 120 335 L 180 340 L 230 335",
  // Dhaka-Mymensingh border
  "M 240 215 L 300 210 L 360 215",
  // Sylhet eastern border
  "M 360 215 L 365 180 L 370 145 L 380 110",
  // Dhaka-Chittagong border
  "M 340 330 L 380 325 L 420 330",
  // Barisal area
  "M 230 420 L 280 415 L 340 420",
];

// Real lat/lng to SVG coordinates (approximate mapping for Bangladesh)
// Bangladesh bounds: lat 20.5-26.6, lng 88.0-92.7
const geoToSvg = (lat: number, lng: number) => ({
  x: ((lng - 88.0) / (92.7 - 88.0)) * 400 + 50,
  y: ((26.6 - lat) / (26.6 - 20.5)) * 540 + 30,
});

// Bangladesh cities/locations with real coordinates
const locationGeo: Record<string, { lat: number; lng: number }> = {
  dhaka: { lat: 23.8103, lng: 90.4125 },
  chittagong: { lat: 22.3569, lng: 91.7832 },
  chattogram: { lat: 22.3569, lng: 91.7832 },
  rajshahi: { lat: 24.3745, lng: 88.6042 },
  khulna: { lat: 22.8456, lng: 89.5403 },
  sylhet: { lat: 24.8949, lng: 91.8687 },
  barisal: { lat: 22.701, lng: 90.3535 },
  barishal: { lat: 22.701, lng: 90.3535 },
  rangpur: { lat: 25.7439, lng: 89.2752 },
  mymensingh: { lat: 24.7471, lng: 90.4203 },
  comilla: { lat: 23.4607, lng: 91.1809 },
  cumilla: { lat: 23.4607, lng: 91.1809 },
  gazipur: { lat: 23.9999, lng: 90.4203 },
  narayanganj: { lat: 23.6238, lng: 90.5 },
  bogra: { lat: 24.8465, lng: 89.3773 },
  bogura: { lat: 24.8465, lng: 89.3773 },
  dinajpur: { lat: 25.6279, lng: 88.6332 },
  jessore: { lat: 23.1665, lng: 89.2135 },
  jashore: { lat: 23.1665, lng: 89.2135 },
  "cox's bazar": { lat: 21.4272, lng: 92.0058 },
  "coxs bazar": { lat: 21.4272, lng: 92.0058 },
  tangail: { lat: 24.2513, lng: 89.9164 },
  noakhali: { lat: 22.8696, lng: 91.0995 },
  feni: { lat: 23.0159, lng: 91.3976 },
  brahmanbaria: { lat: 23.9571, lng: 91.1115 },
  narsingdi: { lat: 23.9322, lng: 90.7151 },
  chandpur: { lat: 23.2333, lng: 90.6712 },
  pabna: { lat: 24.0064, lng: 89.2372 },
  natore: { lat: 24.4206, lng: 89.0001 },
  kushtia: { lat: 23.9013, lng: 89.1201 },
  satkhira: { lat: 22.3155, lng: 89.1115 },
  manikganj: { lat: 23.8617, lng: 90.0047 },
  kishoreganj: { lat: 24.444, lng: 90.7766 },
  habiganj: { lat: 24.374, lng: 91.4168 },
  moulvibazar: { lat: 24.482, lng: 91.7775 },
  sunamganj: { lat: 25.0658, lng: 91.3953 },
  netrokona: { lat: 24.8706, lng: 90.7279 },
  sherpur: { lat: 25.0204, lng: 90.0137 },
  jamalpur: { lat: 24.9375, lng: 89.9372 },
  munshiganj: { lat: 23.5422, lng: 90.5305 },
  madaripur: { lat: 23.164, lng: 90.1869 },
  gopalganj: { lat: 23.0049, lng: 89.8266 },
  faridpur: { lat: 23.6072, lng: 89.8429 },
  rajbari: { lat: 23.7574, lng: 89.6445 },
  shariatpur: { lat: 23.2423, lng: 90.435 },
  lakshmipur: { lat: 22.9425, lng: 90.828 },
  pirojpur: { lat: 22.5841, lng: 89.9759 },
  jhalokati: { lat: 22.6406, lng: 90.1987 },
  barguna: { lat: 22.151, lng: 90.1266 },
  patuakhali: { lat: 22.3596, lng: 90.3298 },
  bhola: { lat: 22.6859, lng: 90.6482 },
  bandarban: { lat: 22.1953, lng: 92.2184 },
  rangamati: { lat: 22.7324, lng: 92.2985 },
  khagrachari: { lat: 23.1193, lng: 91.9847 },
  bangladesh: { lat: 23.685, lng: 90.3563 },
  "": { lat: 23.685, lng: 90.3563 },
};

const getCoords = (location: string): { x: number; y: number } | null => {
  const loc = location.toLowerCase().trim();
  for (const [key, geo] of Object.entries(locationGeo)) {
    if (key && (loc.includes(key) || key.includes(loc))) {
      return geoToSvg(geo.lat, geo.lng);
    }
  }
  return null;
};

const groupByLocation = (users: (MapUser & { coords: { x: number; y: number } })[]) => {
  const groups: Record<string, (MapUser & { coords: { x: number; y: number } })[]> = {};
  users.forEach((u) => {
    // Group nearby users (within 15px)
    let foundKey: string | null = null;
    for (const key of Object.keys(groups)) {
      const [gx, gy] = key.split("-").map(Number);
      if (Math.abs(gx - u.coords.x) < 15 && Math.abs(gy - u.coords.y) < 15) {
        foundKey = key;
        break;
      }
    }
    const key = foundKey || `${Math.round(u.coords.x)}-${Math.round(u.coords.y)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  });
  return groups;
};

// Division labels with real coordinates
const divisionLabels = [
  { name: "Rangpur", lat: 25.7, lng: 89.25 },
  { name: "Rajshahi", lat: 24.37, lng: 88.6 },
  { name: "Mymensingh", lat: 24.75, lng: 90.4 },
  { name: "Sylhet", lat: 24.9, lng: 91.87 },
  { name: "Dhaka", lat: 23.81, lng: 90.41 },
  { name: "Khulna", lat: 22.85, lng: 89.54 },
  { name: "Barishal", lat: 22.7, lng: 90.35 },
  { name: "Chattogram", lat: 22.36, lng: 91.78 },
];

const UserMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, location")
        .not("location", "is", null)
        .neq("location", "");
      setUsers((data || []).filter((u) => u.location && getCoords(u.location)));
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setScale((s) => Math.min(5, Math.max(0.5, s + delta)));
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -0.2 : 0.2);
  }, [handleZoom]);

  // Pan - mouse
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

  // Touch pan + pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateStart.current = { ...translate };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDist.current = dist;
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
      if (lastPinchDist.current > 0) {
        const delta = (dist - lastPinchDist.current) * 0.01;
        handleZoom(delta);
      }
      lastPinchDist.current = dist;
    }
  };
  const handleTouchEnd = () => {
    setIsPanning(false);
    lastPinchDist.current = 0;
  };

  const mappedUsers = users
    .map((u) => ({ ...u, coords: getCoords(u.location)! }))
    .filter((u) => u.coords);
  const groups = groupByLocation(mappedUsers);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground flex-1">Users on Map</h1>
        <span className="text-xs text-muted-foreground">{mappedUsers.length} users</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden touch-none select-none">
          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
            <button
              onClick={() => handleZoom(0.3)}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border shadow-md"
            >
              <ZoomIn size={18} className="text-foreground" />
            </button>
            <button
              onClick={() => handleZoom(-0.3)}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border shadow-md"
            >
              <ZoomOut size={18} className="text-foreground" />
            </button>
            <button
              onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-card border border-border shadow-md text-xs font-bold text-foreground"
            >
              1:1
            </button>
          </div>

          {/* Map container */}
          <div
            ref={containerRef}
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
                {/* SVG Map */}
                <svg viewBox="0 0 500 600" className="w-full h-full" style={{ filter: "drop-shadow(0 2px 8px hsl(var(--foreground) / 0.1))" }}>
                  {/* Water/background */}
                  <rect x="0" y="0" width="500" height="600" fill="hsl(var(--background))" />

                  {/* Country fill */}
                  <path
                    d={BD_PATH}
                    fill="hsl(var(--secondary))"
                    stroke="hsl(var(--primary) / 0.4)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />

                  {/* Division borders */}
                  {BD_DIVISIONS.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.8"
                      strokeDasharray="4 3"
                      opacity={0.5}
                    />
                  ))}

                  {/* Division labels */}
                  {divisionLabels.map((d) => {
                    const pos = geoToSvg(d.lat, d.lng);
                    return (
                      <g key={d.name}>
                        <circle cx={pos.x} cy={pos.y} r="3" fill="hsl(var(--primary) / 0.15)" />
                        <text
                          x={pos.x}
                          y={pos.y - 8}
                          textAnchor="middle"
                          fill="hsl(var(--muted-foreground))"
                          fontSize="11"
                          fontWeight="600"
                          opacity={0.6}
                        >
                          {d.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* User avatars */}
                {Object.values(groups).map((group) => {
                  const { coords } = group[0];
                  const pctX = (coords.x / 500) * 100;
                  const pctY = (coords.y / 600) * 100;
                  return (
                    <div
                      key={`${Math.round(coords.x)}-${Math.round(coords.y)}`}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${pctX}%`,
                        top: `${pctY}%`,
                        transform: "translate(-50%, -100%)",
                      }}
                    >
                      <div className="flex -space-x-1.5">
                        {group.slice(0, 3).map((u) => (
                          <button
                            key={u.user_id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/user/${u.user_id}`); }}
                            className="relative z-10 hover:z-20 transition-transform hover:scale-125"
                          >
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.username}
                                className="h-7 w-7 rounded-full object-cover border-2 border-background shadow-lg"
                              />
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

          {mappedUsers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground bg-card/90 rounded-xl px-5 py-3 shadow">
                No users with locations found
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserMap;
