import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SetUsername = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState("");
  const [userLocation, setUserLocation] = useState(profile?.location || "");
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const checkAvailability = async (value: string) => {
    if (value.length < 3) {
      setAvailable(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value.toLowerCase())
      .maybeSingle();
    setAvailable(!data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
    setUsername(val);
    checkAvailability(val);
  };

  const handleSubmit = async () => {
    if (!user || !username || username.length < 3) return;
    if (available === false) {
      toast.error("Username is taken");
      return;
    }
    setLoading(true);

      const { error } = await supabase
      .from("profiles")
      .update({
        display_name: fullName || null,
        username,
        location: userLocation || null,
        onboarding_completed: true,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to set username");
      setLoading(false);
      return;
    }

    await refreshProfile();
    setLoading(false);
    toast.success("Welcome to Reveal!");
    navigate("/feed");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <h1 className="mb-2 text-2xl font-bold text-foreground">Complete your profile</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Set up your name and username
        </p>

        {/* Full Name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            maxLength={50}
            className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
          <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3">
            <span className="text-muted-foreground">@</span>
            <input
              type="text"
              value={username}
              onChange={handleChange}
              placeholder="username"
              maxLength={30}
              className="flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          {username.length >= 3 && available !== null && (
            <p className={`mt-2 text-sm ${available ? "text-success" : "text-accent"}`}>
              {available ? "✓ Username available" : "✗ Username taken"}
            </p>
          )}
          {username.length > 0 && username.length < 3 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Username must be at least 3 characters
            </p>
          )}
        </div>

        <div className="mt-auto flex w-full flex-col gap-3 pt-8">
          <button
            onClick={handleSubmit}
            disabled={loading || !available || username.length < 3}
            className="w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Get Started"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SetUsername;
