import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PuffyIcon from "@/components/PuffyIcon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const categories = [
  { value: "creator", label: "Content Creator" },
  { value: "public_figure", label: "Public Figure" },
  { value: "brand", label: "Brand / Business" },
  { value: "journalist", label: "Journalist / Media" },
  { value: "other", label: "Other" },
];

const RequestVerification = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.display_name || "");
  const [category, setCategory] = useState("creator");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchExisting = async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingRequest(data);
      setLoading(false);
    };
    fetchExisting();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!fullName.trim() || !reason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        reason: reason.trim(),
        category,
      });
      if (error) throw error;
      toast.success("Verification request submitted!");
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = {
    pending: "text-warning",
    approved: "text-[hsl(var(--success))]",
    rejected: "text-destructive",
  };

  const inputClass =
    "w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Request Verification</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 space-y-6"
      >
        {/* Info card */}
        <div className="rounded-2xl bg-secondary/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <VerifiedBadge size={20} />
            <span className="font-bold text-foreground">Verified Badge</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A verified badge confirms that an account is the authentic presence of the public figure, celebrity, or brand it represents.
          </p>
        </div>

        {/* Already verified */}
        {profile?.is_verified && (
          <div className="rounded-2xl bg-[hsl(var(--success))]/10 p-4 flex items-center gap-3">
            <VerifiedBadge size={24} />
            <div>
              <p className="font-bold text-foreground">You're verified!</p>
              <p className="text-sm text-muted-foreground">Your account already has the verified badge.</p>
            </div>
          </div>
        )}

        {/* Existing pending request */}
        {existingRequest && !profile?.is_verified && (
          <div className="rounded-2xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground text-sm">Previous Request</p>
              <span className={`text-xs font-semibold capitalize ${statusColor[existingRequest.status as keyof typeof statusColor] || "text-muted-foreground"}`}>
                {existingRequest.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(existingRequest.created_at).toLocaleDateString()}
            </p>
            {existingRequest.status === "pending" && (
              <p className="text-xs text-muted-foreground">Your request is being reviewed. We'll notify you once a decision is made.</p>
            )}
          </div>
        )}

        {/* Form — only if not verified and no pending request */}
        {!profile?.is_verified && existingRequest?.status !== "pending" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full legal name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      category === c.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Why should you be verified?</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your account should receive a verified badge..."
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !fullName.trim() || !reason.trim()}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <VerifiedBadge size={16} />
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RequestVerification;
