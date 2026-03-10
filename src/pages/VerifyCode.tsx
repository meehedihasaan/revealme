import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const VerifyCode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Invalid code");
    } else {
      toast.success("Email verified!");
      navigate("/onboarding/avatar");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Code resent!");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col items-center"
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">Verify your email</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          We sent a 6-digit code to<br />
          <span className="font-medium text-foreground">{email || "your email"}</span>
        </p>

        <div className="mb-8">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-14 w-12 rounded-xl border-border bg-secondary text-lg font-bold text-foreground" />
              <InputOTPSlot index={1} className="h-14 w-12 rounded-xl border-border bg-secondary text-lg font-bold text-foreground" />
              <InputOTPSlot index={2} className="h-14 w-12 rounded-xl border-border bg-secondary text-lg font-bold text-foreground" />
              <InputOTPSlot index={3} className="h-14 w-12 rounded-xl border-border bg-secondary text-lg font-bold text-foreground" />
              <InputOTPSlot index={4} className="h-14 w-12 rounded-xl border-border bg-secondary text-lg font-bold text-foreground" />
              <InputOTPSlot index={5} className="h-14 w-12 rounded-xl border-border bg-secondary text-lg font-bold text-foreground" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || code.length < 6}
          className="mb-4 w-full rounded-xl bg-primary py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-muted-foreground"
        >
          {resending ? "Sending..." : "Didn't get a code? "}
          {!resending && <span className="font-bold text-primary">Resend</span>}
        </button>
      </motion.div>
    </div>
  );
};

export default VerifyCode;
