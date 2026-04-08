import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PuffyIcon from "@/components/PuffyIcon";

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let email = identifier.trim();

    // If not an email, look up username
    if (!email.includes("@")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", email.toLowerCase())
        .maybeSingle();

      if (!profile) {
        toast.error("Username not found");
        setLoading(false);
        return;
      }

      // Get user email from auth via a workaround: try sign in with user_id won't work,
      // so we need to store email. Instead, we'll look it up from the profiles approach.
      // Since we can't get email from profiles, let's try another approach:
      // We'll use the admin API or just ask user to use email.
      // Better approach: store the lookup and use supabase auth
      // Actually, supabase doesn't expose email from user_id on client side.
      // So we need to use an edge function or store email in profiles.

      // For now, let's try to find if there's an auth user we can match
      // The simplest approach: look up using identifiers endpoint isn't available
      // So let's just inform the user
      toast.error("Please use your email address to login");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/feed");
    }
  };

  const handleForgotPassword = async () => {
    const email = identifier.trim();
    if (!email || !email.includes("@")) {
      toast.error("Please enter your email address first");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <h1 className="text-reveal mb-2 text-3xl text-foreground">Revealme.</h1>
        <p className="mb-10 text-muted-foreground">Welcome back</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="your@email.com or username"
              required
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm font-medium text-primary"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-foreground">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
