import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Search, User, UserPlus, Trash2, Crown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type Profile = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type UserWithRoles = Profile & {
  roles: AppRole[];
};

const ROLE_CONFIG: Record<AppRole, { color: string; icon: typeof Crown; label: string }> = {
  admin: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: Crown, label: "Super Admin" },
  moderator: { color: "bg-primary/10 text-primary border-primary/30", icon: Shield, label: "Moderator" },
  user: { color: "bg-muted text-muted-foreground border-border", icon: User, label: "User" },
};

export default function AdminRoleManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const { data: permissions } = useUserPermissions();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role')
      ]);

      if (!profilesRes.data) return [];

      return profilesRes.data.map(profile => ({
        ...profile,
        roles: (rolesRes.data ?? [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role as AppRole),
      }));
    }
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (existing) throw new Error('User already has this role');

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setShowAssignDialog(false);
      setSelectedUserId(null);
      setSelectedRole('');
    },
    onError: (err: any) => toast.error(err.message || "Failed to assign role")
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed successfully!");
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove role")
  });

  const filtered = users?.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!permissions?.canManageRoles) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to manage user roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
        <p className="text-muted-foreground">Assign and manage user roles and permissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["admin", "moderator", "user"] as AppRole[]).map(role => {
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          const count = role === 'user'
            ? users?.filter(u => u.roles.length === 0 || u.roles.every(r => r === 'user')).length ?? 0
            : users?.filter(u => u.roles.includes(role)).length ?? 0;

          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}s</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}

        {!isLoading && filtered?.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">No users found.</CardContent>
          </Card>
        )}

        {filtered?.map(user => {
          const adminRoles = user.roles.filter(r => r !== 'user');

          return (
            <Card key={user.id} className="transition-all hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-medium">{user.display_name || user.username || 'Unknown User'}</span>
                      {user.username && <span className="text-muted-foreground text-sm">@{user.username}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {adminRoles.length === 0 && (
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" /> User
                        </Badge>
                      )}
                      {adminRoles.map(role => {
                        const config = ROLE_CONFIG[role];
                        const Icon = config.icon;
                        return (
                          <Badge key={role} className={`text-xs border ${config.color}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="ml-1 rounded-full p-0.5 hover:bg-foreground/10">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Role</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove "{config.label}" from {user.display_name || user.username}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeRole.mutate({ userId: user.user_id, role })}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <Dialog
                    open={showAssignDialog && selectedUserId === user.user_id}
                    onOpenChange={(open) => {
                      setShowAssignDialog(open);
                      if (!open) { setSelectedUserId(null); setSelectedRole(''); }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 shrink-0"
                        onClick={() => { setSelectedUserId(user.user_id); setShowAssignDialog(true); }}
                      >
                        <UserPlus className="h-4 w-4" /> Assign
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Role to {user.display_name || user.username}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Super Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                          </SelectContent>
                        </Select>

                        {selectedRole && (
                          <div className="bg-muted/50 p-3 rounded-lg text-sm border">
                            <p className="font-medium mb-2">
                              {ROLE_CONFIG[selectedRole as AppRole]?.label} Permissions:
                            </p>
                            {selectedRole === 'admin' && (
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• Full access to all admin sections</li>
                                <li>• Manage users and assign roles</li>
                                <li>• Change app name, logo, and settings</li>
                                <li>• Moderate posts and content</li>
                                <li>• Handle verification requests</li>
                              </ul>
                            )}
                            {selectedRole === 'moderator' && (
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• View user information</li>
                                <li>• Moderate posts and content</li>
                                <li>• Handle verification requests</li>
                                <li>• No access to role or settings management</li>
                              </ul>
                            )}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
                          <Button
                            onClick={() => selectedRole && assignRole.mutate({ userId: user.user_id, role: selectedRole as AppRole })}
                            disabled={!selectedRole || assignRole.isPending}
                          >
                            {assignRole.isPending ? 'Assigning...' : 'Assign Role'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}