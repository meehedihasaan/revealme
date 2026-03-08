import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";

type VerificationRequest = {
  id: string;
  user_id: string;
  full_name: string;
  category: string;
  reason: string;
  status: string;
  created_at: string;
};

type Profile = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

export default function AdminVerifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-verification-requests', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('status', activeTab)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VerificationRequest[];
    }
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-map', requests],
    queryFn: async () => {
      if (!requests || requests.length === 0) return {} as Record<string, Profile>;
      const ids = requests.map(r => r.user_id);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      const map: Record<string, Profile> = {};
      (data || []).forEach((p: Profile) => { map[p.user_id] = p; });
      return map;
    },
    enabled: !!requests && requests.length > 0,
  });

  const approveMutation = useMutation({
    mutationFn: async (req: VerificationRequest) => {
      const [updateReq, updateProfile] = await Promise.all([
        supabase.from('verification_requests').update({ status: 'approved' }).eq('id', req.id),
        supabase.from('profiles').update({ is_verified: true }).eq('user_id', req.user_id)
      ]);
      if (updateReq.error) throw updateReq.error;
      if (updateProfile.error) throw updateProfile.error;
    },
    onSuccess: () => {
      toast.success("Verification approved!");
      queryClient.invalidateQueries({ queryKey: ['admin-verification-requests'] });
    },
    onError: () => toast.error("Failed to approve")
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('verification_requests').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Verification rejected.");
      queryClient.invalidateQueries({ queryKey: ['admin-verification-requests'] });
    },
    onError: () => toast.error("Failed to reject")
  });

  const tabs: Array<{ key: 'pending' | 'approved' | 'rejected'; label: string; icon: React.ReactNode }> = [
    { key: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4" /> },
    { key: 'approved', label: 'Approved', icon: <CheckCircle className="h-4 w-4 text-success" /> },
    { key: 'rejected', label: 'Rejected', icon: <XCircle className="h-4 w-4 text-destructive" /> },
  ];

  const statusColor: Record<string, string> = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    approved: 'bg-success/20 text-success border-success/30',
    rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Verification Requests</h2>
        <p className="text-muted-foreground">Review and manage user verification applications.</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
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

        {!isLoading && requests?.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No {activeTab} verification requests.
            </CardContent>
          </Card>
        )}

        {requests?.map(req => {
          const profile = profiles?.[req.user_id];
          return (
            <Card key={req.id} className="transition-all hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{req.full_name}</span>
                      {profile?.username && (
                        <span className="text-muted-foreground text-sm">@{profile.username}</span>
                      )}
                      <Badge className={`text-xs border ${statusColor[req.status]}`}>{req.status}</Badge>
                      <Badge variant="outline" className="text-xs">{req.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{req.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {activeTab === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1 bg-success/20 hover:bg-success/40 text-success border border-success/30"
                        variant="ghost"
                        onClick={() => approveMutation.mutate(req)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
