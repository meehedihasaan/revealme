import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MapUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  location: string;
}

// Bangladesh divisions/cities mapped to approximate positions on the SVG map (percentage-based)
const locationCoords: Record<string, { x: number; y: number }> = {
  dhaka: { x: 52, y: 48 },
  chittagong: { x: 72, y: 62 },
  chattogram: { x: 72, y: 62 },
  rajshahi: { x: 28, y: 38 },
  khulna: { x: 35, y: 62 },
  sylhet: { x: 72, y: 28 },
  barisal: { x: 48, y: 68 },
  barishal: { x: 48, y: 68 },
  rangpur: { x: 32, y: 18 },
  mymensingh: { x: 52, y: 32 },
  comilla: { x: 65, y: 50 },
  cumilla: { x: 65, y: 50 },
  gazipur: { x: 54, y: 44 },
  narayanganj: { x: 55, y: 50 },
  bogra: { x: 34, y: 28 },
  bogura: { x: 34, y: 28 },
  dinajpur: { x: 26, y: 14 },
  jessore: { x: 30, y: 56 },
  jashore: { x: 30, y: 56 },
  "cox's bazar": { x: 78, y: 78 },
  coxs bazar: { x: 78, y: 78 },
  "cox'sbazar": { x: 78, y: 78 },
  tangail: { x: 48, y: 38 },
  noakhali: { x: 68, y: 58 },
  feni: { x: 72, y: 55 },
  brahmanbaria: { x: 62, y: 42 },
  narsingdi: { x: 56, y: 43 },
  chandpur: { x: 62, y: 54 },
  pabna: { x: 38, y: 40 },
  natore: { x: 32, y: 34 },
  kushtia: { x: 32, y: 48 },
  bangladesh: { x: 50, y: 50 },
};

const getCoords = (location: string): { x: number; y: number } | null => {
  const loc = location.toLowerCase().trim();
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (loc.includes(key) || key.includes(loc)) return coords;
  }
  return null;
};

// Group users by location coordinates to stack them
const groupByLocation = (users: (MapUser & { coords: { x: number; y: number } })[]) => {
  const groups: Record<string, (MapUser & { coords: { x: number; y: number } })[]> = {};
  users.forEach((u) => {
    const key = `${u.coords.x}-${u.coords.y}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  });
  return groups;
};

const UserMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);

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

  const mappedUsers = users
    .map((u) => ({ ...u, coords: getCoords(u.location)! }))
    .filter((u) => u.coords);

  const groups = groupByLocation(mappedUsers);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Users on Map</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
          {/* Bangladesh Map SVG */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Simplified Bangladesh outline */}
            <path
              d="M 30 8 L 38 6 L 44 10 L 50 8 L 56 12 L 62 10 L 68 14 L 74 18 L 78 24 L 76 30 L 80 36 L 78 42 L 82 48 L 80 54 L 76 58 L 80 64 L 78 70 L 82 76 L 78 82 L 72 78 L 66 74 L 62 68 L 56 72 L 50 76 L 44 72 L 38 68 L 34 74 L 28 68 L 30 62 L 26 56 L 28 50 L 24 44 L 26 38 L 22 32 L 24 26 L 20 20 L 24 14 L 30 8 Z"
              fill="hsl(var(--secondary))"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              className="drop-shadow-sm"
            />
            {/* Division labels */}
            {[
              { name: "Rangpur", x: 32, y: 16 },
              { name: "Rajshahi", x: 28, y: 36 },
              { name: "Mymensingh", x: 52, y: 30 },
              { name: "Sylhet", x: 72, y: 26 },
              { name: "Dhaka", x: 52, y: 46 },
              { name: "Khulna", x: 35, y: 60 },
              { name: "Barishal", x: 48, y: 66 },
              { name: "Chattogram", x: 72, y: 60 },
            ].map((d) => (
              <text
                key={d.name}
                x={d.x}
                y={d.y}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="2.2"
                fontWeight="500"
                opacity={0.5}
              >
                {d.name}
              </text>
            ))}
          </svg>

          {/* User avatars overlaid on map */}
          {Object.values(groups).map((group) => {
            const { coords } = group[0];
            return (
              <div
                key={`${coords.x}-${coords.y}`}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${coords.x}%`,
                  top: `${coords.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                {/* Stacked avatars */}
                <div className="flex -space-x-2">
                  {group.slice(0, 4).map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => navigate(`/user/${u.user_id}`)}
                      className="relative z-10 hover:z-20 transition-transform hover:scale-110"
                    >
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.username}
                          className="h-8 w-8 rounded-full object-cover border-2 border-background shadow-md"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary border-2 border-background shadow-md">
                          <PuffyIcon name="user" size={14} />
                        </div>
                      )}
                    </button>
                  ))}
                  {group.length > 4 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background shadow-md text-xs font-bold">
                      +{group.length - 4}
                    </div>
                  )}
                </div>
                {/* Map pin below avatars */}
                <MapPin size={14} className="text-primary -mt-1 drop-shadow" />
              </div>
            );
          })}

          {mappedUsers.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground bg-background/80 rounded-lg px-4 py-2">
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
