import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Search, User, UserPlus, Trash2, Crown, UserCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";

type Profile = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type UserWithRoles = Profile & {
  roles: Array<{ role: string }>;
};

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-800 border-red-300",
  moderator: "bg-blue-100 text-blue-800 border-blue-300",
  user: "bg-gray-100 text-gray-800 border-gray-300"
};

const ROLE_ICONS = {
  admin: Crown,
  moderator: Shield,
  user: User
};

export default function AdminRoleManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const { data: permissions } = useUserPermissions();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles!inner(role)
        `)
        .order('created_at', { ascending: false });

      // Also get users without roles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allProfiles) return [];

      // Merge profiles with their roles
      const usersWithRoles = allProfiles.map(profile => {
        const userRoles = profiles
          ?.filter(p => p.user_id === profile.user_id)
          ?.map(p => ({ role: (p as any).user_roles.role })) || [];
        
        // If no roles, assign default 'user' role
        return {
          ...profile,
          roles: userRoles.length > 0 ? userRoles : [{ role: 'user' }]
        };
      });

      return usersWithRoles as UserWithRoles[];
    }
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // First check if user already has this role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

      if (existingRole) {
        throw new Error('User already has this role');
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      setShowAssignDialog(false);
      setSelectedUser(null);
      setSelectedRole('');
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign role");
    }
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
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
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove role");
    }
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">Assign and manage user roles and permissions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Crown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-2xl font-bold">
                  {users?.filter(u => u.roles.some(r => r.role === 'admin')).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moderators</p>
                <p className="text-2xl font-bold">
                  {users?.filter(u => u.roles.some(r => r.role === 'moderator')).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regular Users</p>
                <p className="text-2xl font-bold">
                  {users?.filter(u => !u.roles.some(r => ['admin', 'moderator'].includes(r.role))).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by username or name..."
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
            <CardContent className="p-12 text-center text-muted-foreground">
              No users found.
            </CardContent>
          </Card>
        )}

        {filtered?.map(user => (
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
                    {user.username && (
                      <span className="text-muted-foreground text-sm">@{user.username}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((roleObj, idx) => {
                      const role = roleObj.role as keyof typeof ROLE_COLORS;
                      const IconComponent = ROLE_ICONS[role] || User;
                      
                      return (
                        <Badge 
                          key={idx}
                          className={`text-xs ${ROLE_COLORS[role] || ROLE_COLORS.user} flex items-center gap-1`}
                        >
                          <IconComponent className="h-3 w-3" />
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                          {role !== 'user' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="ml-1 hover:bg-black/10 rounded-full p-0.5">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Role</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove the "{role}" role from {user.display_name || user.username}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => removeRole.mutate({ userId: user.user_id, role })}
                                  >
                                    Remove Role
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Dialog open={showAssignDialog && selectedUser?.user_id === user.user_id} onOpenChange={(open) => {
                    setShowAssignDialog(open);
                    if (!open) {
                      setSelectedUser(null);
                      setSelectedRole('');
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowAssignDialog(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4" /> Assign Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Role to {user.display_name || user.username}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Role</label>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Super Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="font-medium mb-2">Role Permissions:</p>
                          {selectedRole === 'admin' && (
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Full access to all admin features</li>
                              <li>• Manage users and roles</li>
                              <li>• Manage app settings</li>
                              <li>• Moderate posts and content</li>
                              <li>• Handle verification requests</li>
                            </ul>
                          )}
                          {selectedRole === 'moderator' && (
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Moderate posts and content</li>
                              <li>• Handle verification requests</li>
                              <li>• View user information</li>
                              <li>• Limited admin access</li>
                            </ul>
                          )}
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => selectedRole && assignRole.mutate({ userId: user.user_id, role: selectedRole })}
                            disabled={!selectedRole || assignRole.isPending}
                          >
                            {assignRole.isPending ? 'Assigning...' : 'Assign Role'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}