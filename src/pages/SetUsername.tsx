import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SetUsername = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
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
    navigate("/onboarding/discover");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
        {/* Hero section */}
        <div className="mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <span className="text-3xl font-black bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              @
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-3xl font-bold tracking-tight text-foreground"
          >
            Reserve your{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              username
            </span>{" "}
            fast
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-2 text-sm text-muted-foreground leading-relaxed"
          >
            The best ones go quick. Grab yours before someone else does.
          </motion.p>
        </div>

        {/* Username input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-5"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Username
          </label>
          <div className="group relative flex items-center rounded-2xl border-2 border-transparent bg-secondary px-4 py-3.5 transition-all focus-within:border-primary/40 focus-within:bg-secondary/80">
            <span className="mr-1 text-lg font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={handleChange}
              placeholder="yourname"
              maxLength={30}
              className="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            {username.length >= 3 && available !== null && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  available
                    ? "bg-green-500/15 text-green-500"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {available ? "✓" : "✗"}
              </motion.span>
            )}
          </div>
          {username.length >= 3 && available !== null && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-2 text-xs font-medium ${
                available ? "text-green-500" : "text-destructive"
              }`}
            >
              {available ? "This username is yours for the taking!" : "Already claimed — try another one"}
            </motion.p>
          )}
          {username.length > 0 && username.length < 3 && (
            <p className="mt-2 text-xs text-muted-foreground">
              At least 3 characters needed
            </p>
          )}
        </motion.div>

        {/* Location input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mb-4"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Location <span className="font-normal normal-case text-muted-foreground/60">(optional)</span>
          </label>
          <input
            type="text"
            value={userLocation}
            onChange={(e) => setUserLocation(e.target.value)}
            placeholder="City, Country"
            maxLength={60}
            className="w-full rounded-2xl border-2 border-transparent bg-secondary px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/40 focus:bg-secondary/80 focus:outline-none"
          />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-auto flex w-full flex-col gap-3 pt-8"
        >
          <button
            onClick={handleSubmit}
            disabled={loading || !available || username.length < 3}
            className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
                Setting up...
              </span>
            ) : (
              "Claim & Get Started"
            )}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SetUsername;
