import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { supabase } from "@/integrations/supabase/client";

interface MapUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
}

const UserMap = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url, display_name, show_on_map")
        .eq("show_on_map", true);
      setUsers(
        (data || []).map((u: any) => ({
          user_id: u.user_id,
          username: u.username || "user",
          avatar_url: u.avatar_url,
          display_name: u.display_name,
        }))
      );
      setLoading(false);
    };
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-background">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={24} />
        </button>
        <h1 className="text-lg font-semibold text-foreground flex-1">Nearby Users</h1>
        <button onClick={() => navigate("/settings/location")} className="p-1">
          <PuffyIcon name="settings" size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground px-6">
          <PuffyIcon name="user" size={48} className="opacity-30 mb-3" />
          <p className="text-sm font-medium text-foreground">No users found</p>
          <p className="text-xs text-muted-foreground mt-1">Go to Settings → Location to share yours!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {users.map((u) => (
            <button
              key={u.user_id}
              onClick={() => navigate(`/user/${u.user_id}`)}
              className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-secondary/50 transition-colors"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt={u.username} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
                  <PuffyIcon name="user" size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">@{u.username}</p>
                {u.display_name && <p className="text-xs text-muted-foreground truncate">{u.display_name}</p>}
              </div>
              <PuffyIcon name="chevron-right" size={16} className="opacity-40" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserMap;
