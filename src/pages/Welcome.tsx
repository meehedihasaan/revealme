import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-reveal text-3xl text-foreground"
      >
        Revealme.
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-8"
      >
        <h2 className="text-center font-display text-4xl font-bold leading-tight text-foreground">
          " Let's see what universe holds for you "
        </h2>

        <button
          onClick={() => navigate("/register")}
          className="w-full max-w-xs rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-transform active:scale-95"
        >
          Create Account
        </button>

        <p className="text-center text-sm text-muted-foreground">
          By signing up, you agree to our{" "}
          <span className="text-primary">Terms of Use</span> &{" "}
          <span className="text-primary">Privacy Policy</span>.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center gap-1"
      >
        <p className="text-sm text-muted-foreground">Already have an account?</p>
        <button
          onClick={() => navigate("/login")}
          className="text-lg font-bold text-foreground"
        >
          Log in
        </button>
      </motion.div>
    </div>
  );
};

export default Welcome;
