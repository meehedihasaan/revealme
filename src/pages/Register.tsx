import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInYears } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const Register = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState<Date>();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!dob || differenceInYears(new Date(), dob) < 18) {
      toast.error("You must be at least 18 years old to create an account");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Update profile with full name and gender
    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          display_name: fullName.trim() || null,
          gender: gender || null,
        })
        .eq("user_id", data.user.id);
    }

    setLoading(false);
    toast.success("Account created!");
    navigate("/onboarding/avatar");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        <h1 className="text-reveal mb-2 text-3xl text-foreground">Reveal.</h1>
        <p className="mb-8 text-muted-foreground">Create your account</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              maxLength={50}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
              placeholder="Min 6 characters"
              required
              minLength={6}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              minLength={6}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1.5 text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Gender</label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(option)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    gender === option
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !gender || !fullName.trim()}
            className="mt-2 w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <span className="text-primary">Terms of Use</span> &{" "}
          <span className="text-primary">Privacy Policy</span>.
        </p>

        <div className="mt-auto pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-foreground">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
