import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PuffyIcon from "@/components/PuffyIcon";
import { toast } from "sonner";

const HelpSupportSettings = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<"menu" | "report" | "faq">("menu");
  const [reportText, setReportText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendReport = async () => {
    if (!reportText.trim()) {
      toast.error("Please describe the problem");
      return;
    }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success("Report submitted. Thank you!");
    setReportText("");
    setActiveSection("menu");
    setSending(false);
  };

  const faqs = [
    { q: "How do I change my username?", a: "Go to Settings → Account → Username to change your username." },
    { q: "How do I make my account private?", a: "Go to Settings → Privacy and toggle Private Account on." },
    { q: "How do I delete my account?", a: "Go to Settings → Account → scroll down and tap Delete Account." },
    { q: "How do I block someone?", a: "Visit the user's profile, tap the three dots menu, and select Block." },
    { q: "How do I report a post?", a: "Tap the three dots on any post and select Report." },
    { q: "How do I get verified?", a: "Go to Settings → Account → Verification Request and submit an application." },
    { q: "Can I recover deleted messages?", a: "No, deleted messages cannot be recovered once removed." },
    { q: "How do I turn off notifications?", a: "Go to Settings → Notifications to manage your notification preferences." },
  ];

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (activeSection === "report") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setActiveSection("menu")}>
            <PuffyIcon name="arrow-left" size={22} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Report a Problem</h1>
        </div>
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Describe the issue you're experiencing and we'll look into it.</p>
          <textarea
            value={reportText}
            onChange={e => setReportText(e.target.value)}
            placeholder="Describe the problem..."
            rows={6}
            className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <button
            onClick={handleSendReport}
            disabled={sending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {sending ? "Sending..." : "Submit Report"}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "faq") {
    return (
      <div className="min-h-screen bg-background pb-8">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setActiveSection("menu")}>
            <PuffyIcon name="arrow-left" size={22} />
          </button>
          <h1 className="text-lg font-bold text-foreground">FAQ</h1>
        </div>
        <div className="px-4 space-y-2 pt-2">
          {faqs.map((faq, i) => (
            <button
              key={i}
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              className="w-full text-left rounded-xl bg-card border border-border p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground pr-3">{faq.q}</p>
                <PuffyIcon name="chevron-down" size={16} className={`opacity-50 shrink-0 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
              </div>
              {expandedFaq === i && (
                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">{faq.a}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate("/settings")}>
          <PuffyIcon name="arrow-left" size={22} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Help & Support</h1>
      </div>

      <div className="px-4 py-3">
        <div className="rounded-xl bg-card border border-border divide-y divide-border">
          <button onClick={() => setActiveSection("report")} className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/30 transition-colors">
            <PuffyIcon name="alert-circle" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Report a Problem</p>
              <p className="text-xs text-muted-foreground">Let us know about bugs or issues</p>
            </div>
            <PuffyIcon name="chevron-right" size={16} className="opacity-40" />
          </button>

          <button onClick={() => setActiveSection("faq")} className="flex w-full items-center gap-4 px-4 py-4 text-left active:bg-secondary/30 transition-colors">
            <PuffyIcon name="help-circle" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">FAQ</p>
              <p className="text-xs text-muted-foreground">Frequently asked questions</p>
            </div>
            <PuffyIcon name="chevron-right" size={16} className="opacity-40" />
          </button>

          <div className="flex w-full items-center gap-4 px-4 py-4">
            <PuffyIcon name="file-text" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Terms of Service</p>
              <p className="text-xs text-muted-foreground">Read our terms and conditions</p>
            </div>
            <PuffyIcon name="chevron-right" size={16} className="opacity-40" />
          </div>

          <div className="flex w-full items-center gap-4 px-4 py-4">
            <PuffyIcon name="shield" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Privacy Policy</p>
              <p className="text-xs text-muted-foreground">How we handle your data</p>
            </div>
            <PuffyIcon name="chevron-right" size={16} className="opacity-40" />
          </div>

          <div className="flex w-full items-center gap-4 px-4 py-4">
            <PuffyIcon name="info" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">App Version</p>
              <p className="text-xs text-muted-foreground">RevealMe v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportSettings;
