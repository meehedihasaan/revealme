import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flag, CheckCircle, XCircle, Clock, User, Eye, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  report_type: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function AdminReportedContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed" | "dismissed">("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports", activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("status", activeTab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-report-profiles", reports],
    queryFn: async () => {
      if (!reports || reports.length === 0) return {} as Record<string, Profile>;
      const ids = [...new Set([
        ...reports.map(r => r.reporter_id),
        ...reports.filter(r => r.reported_user_id).map(r => r.reported_user_id!),
      ])];
      const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", ids);
      const map: Record<string, Profile> = {};
      (data || []).forEach(p => { map[p.user_id] = p; });
      return map;
    },
    enabled: !!reports && reports.length > 0,
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status, admin_notes: notes || null, reviewed_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedReport(null);
      setAdminNotes("");
    },
    onError: () => toast.error("Failed to update report"),
  });

  const deleteReportedPost = useMutation({
    mutationFn: async (postId: string) => {
      // Delete related data first
      await supabase.from("post_images").delete().eq("post_id", postId);
      await supabase.from("post_tags").delete().eq("post_id", postId);
      await supabase.from("comments").delete().eq("post_id", postId);
      await supabase.from("likes").delete().eq("post_id", postId);
      await supabase.from("saved_posts").delete().eq("post_id", postId);
      await supabase.from("notifications").delete().eq("post_id", postId);
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reported post deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const tabs = [
    { key: "pending" as const, label: "Pending", icon: <Clock className="h-4 w-4" />, count: 0 },
    { key: "reviewed" as const, label: "Reviewed", icon: <CheckCircle className="h-4 w-4 text-green-400" />, count: 0 },
    { key: "dismissed" as const, label: "Dismissed", icon: <XCircle className="h-4 w-4 text-muted-foreground" />, count: 0 },
  ];

  const typeIcon: Record<string, React.ReactNode> = {
    post: <Flag className="h-3.5 w-3.5" />,
    user: <User className="h-3.5 w-3.5" />,
    comment: <MessageSquare className="h-3.5 w-3.5" />,
  };

  const statusColor: Record<string, string> = {
    pending: "bg-warning/20 text-warning border-warning/30",
    reviewed: "bg-green-400/20 text-green-400 border-green-400/30",
    dismissed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reported Content</h2>
        <p className="text-sm text-muted-foreground">Review content flagged by users for violations.</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}

        {!isLoading && (!reports || reports.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No {activeTab} Reports</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "pending" ? "No content has been reported yet." : `No ${activeTab} reports.`}
              </p>
            </CardContent>
          </Card>
        )}

        {reports?.map(report => {
          const reporter = profiles?.[report.reporter_id];
          const reportedUser = report.reported_user_id ? profiles?.[report.reported_user_id] : null;

          return (
            <Card key={report.id} className="transition-all hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                    {typeIcon[report.report_type] || <Flag className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-[10px] border ${statusColor[report.status]}`}>
                        {report.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{report.report_type}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{report.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={reporter?.avatar_url || ""} />
                          <AvatarFallback className="text-[8px]">U</AvatarFallback>
                        </Avatar>
                        @{reporter?.username || "unknown"}
                      </span>
                      {reportedUser && (
                        <span>→ @{reportedUser.username || "unknown"}</span>
                      )}
                    </div>
                    {report.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded p-2 border">
                        Admin: {report.admin_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedReport(report); setAdminNotes(report.admin_notes || ""); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {activeTab === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-400 hover:bg-green-400/10"
                          onClick={() => updateReport.mutate({ id: report.id, status: "reviewed" })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                          onClick={() => updateReport.mutate({ id: report.id, status: "dismissed" })}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {report.reported_post_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => report.reported_post_id && deleteReportedPost.mutate(report.reported_post_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Report Type</p>
                <Badge variant="outline">{selectedReport.report_type}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3 border">{selectedReport.reason}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this report..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => updateReport.mutate({ id: selectedReport.id, status: "dismissed", notes: adminNotes })}
                >
                  Dismiss
                </Button>
                <Button
                  onClick={() => updateReport.mutate({ id: selectedReport.id, status: "reviewed", notes: adminNotes })}
                >
                  Mark Reviewed
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
