import { Card, CardContent } from "@/components/ui/card";
import { Flag } from "lucide-react";

export default function AdminReportedContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reported Content</h2>
        <p className="text-sm text-muted-foreground">Review content that has been flagged by users.</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Reports</h3>
          <p className="text-sm text-muted-foreground">No content has been reported yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
