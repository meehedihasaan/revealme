import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Ban, Search, User, ShieldOff, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, addDays, addHours } from "date-fns";

type BanRecord = {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  banned_at: string;
  expires_at: string;
};

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function AdminBanManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('7d');
  const [unbanId, setUnbanId] = useState<string | null>(null);

  const { data: bans, isLoading: bansLoading } = useQuery({
    queryKey: ['admin-bans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bans')
        .select('*')
        .order('banned_at', { ascending: false });
      if (error) throw error;
      return data as BanRecord[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-ban-profiles', bans],
    queryFn: async () => {
      if (!bans || bans.length === 0) return {} as Record<string, Profile>;
      const ids = [...new Set([...bans.map(b => b.user_id), ...bans.map(b => b.banned_by)])];
      const { data } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').in('user_id', ids);
      const map: Record<string, Profile> = {};
      (data || []).forEach(p => { map[p.user_id] = p; });
      return map;
    },
    enabled: !!bans && bans.length > 0,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['admin-all-users-for-ban'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url').order('username');
      return data as Profile[];
    },
  });

  const banUser = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: string; reason: string; duration: string }) => {
      if (!user) throw new Error("Not authenticated");
      let expiresAt: Date;
      switch (duration) {
        case '1h': expiresAt = addHours(new Date(), 1); break;
        case '24h': expiresAt = addHours(new Date(), 24); break;
        case '7d': expiresAt = addDays(new Date(), 7); break;
        case '30d': expiresAt = addDays(new Date(), 30); break;
        case '90d': expiresAt = addDays(new Date(), 90); break;
        case '365d': expiresAt = addDays(new Date(), 365); break;
        default: expiresAt = addDays(new Date(), 7);
      }
      const { error } = await supabase.from('user_bans').insert({
        user_id: userId,
        banned_by: user.id,
        reason,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User banned successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-bans'] });
      setShowBanDialog(false);
      setBanReason('');
      setSelectedUserId(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to ban user"),
  });

  const unbanUser = useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase.from('user_bans').delete().eq('id', banId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ban removed");
      queryClient.invalidateQueries({ queryKey: ['admin-bans'] });
      setUnbanId(null);
    },
    onError: () => toast.error("Failed to remove ban"),
  });

  const activeBans = bans?.filter(b => new Date(b.expires_at) > new Date()) || [];
  const expiredBans = bans?.filter(b => new Date(b.expires_at) <= new Date()) || [];

  const filteredUsers = allUsers?.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const durations = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '365d', label: '1 Year' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ban Management</h2>
          <p className="text-sm text-muted-foreground">Temporarily ban users from the platform.</p>
        </div>
        <Button onClick={() => setShowBanDialog(true)} className="gap-2" variant="destructive">
          <Ban className="h-4 w-4" /> Ban User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-destructive/10">
              <Ban className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeBans.length}</p>
              <p className="text-xs text-muted-foreground">Active Bans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiredBans.length}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active bans */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Bans</h3>
        <div className="space-y-2">
          {bansLoading && Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
          {activeBans.length === 0 && !bansLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">No active bans.</CardContent>
            </Card>
          )}
          {activeBans.map(ban => {
            const p = profiles?.[ban.user_id];
            return (
              <Card key={ban.id} className="border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p?.avatar_url || ''} />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{p?.display_name || p?.username || 'Unknown'}</span>
                        <Badge variant="destructive" className="text-[10px]">Banned</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ban.reason}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Expires {formatDistanceToNow(new Date(ban.expires_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setUnbanId(ban.id)}>
                      <ShieldOff className="h-3 w-3" /> Unban
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ban dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Search User</Label>
              <Input
                placeholder="Search by username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && filteredUsers && filteredUsers.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-card">
                  {filteredUsers.slice(0, 10).map(u => (
                    <button
                      key={u.user_id}
                      onClick={() => { setSelectedUserId(u.user_id); setSearch(u.username || u.display_name || ''); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-secondary/50 text-sm ${selectedUserId === u.user_id ? 'bg-primary/10' : ''}`}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                      <span>@{u.username || 'unknown'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="mb-2 block">Duration</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {durations.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Reason</Label>
              <Textarea
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Reason for ban..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBanDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={!selectedUserId || !banReason.trim() || banUser.isPending}
                onClick={() => selectedUserId && banUser.mutate({ userId: selectedUserId, reason: banReason, duration: banDuration })}
              >
                {banUser.isPending ? 'Banning...' : 'Ban User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unban confirmation */}
      <AlertDialog open={!!unbanId} onOpenChange={() => setUnbanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Ban</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this ban? The user will regain access immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => unbanId && unbanUser.mutate(unbanId)}>Remove Ban</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
