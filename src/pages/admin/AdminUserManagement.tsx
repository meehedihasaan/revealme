import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle, Shield, Search, User, UserX, UserPlus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_private: boolean;
  bio: string | null;
  created_at: string;
};

type NewUser = {
  email: string;
  password: string;
  display_name: string;
  username: string;
};

export default function AdminUserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newUser, setNewUser] = useState<NewUser>({ email: '', password: '', display_name: '', username: '' });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    }
  });

  const createUser = useMutation({
    mutationFn: async (userData: NewUser) => {
      // Create user account
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });
      
      if (authError) throw authError;
      
      // Update profile with additional info
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: userData.display_name,
            username: userData.username,
            onboarding_completed: true
          })
          .eq('user_id', data.user.id);
        
        if (profileError) throw profileError;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("User created successfully!");
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewUser({ email: '', password: '', display_name: '', username: '' });
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create user");
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete user");
    }
  });

  const toggleVerification = useMutation({
    mutationFn: async ({ user_id, is_verified }: { user_id: string; is_verified: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_verified }).eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User verification updated.");
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error("Failed to update verification")
  });

  const updateUserProfile = useMutation({
    mutationFn: async (profileData: Partial<Profile>) => {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', selectedUser?.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User profile updated!");
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEditDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile");
    }
  });

  const filtered = users?.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage all registered users on the platform.</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={newUser.display_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, display_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createUser.mutate(newUser)}
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
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
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{user.display_name || user.username || 'Unknown User'}</span>
                    {user.username && (
                      <span className="text-muted-foreground text-sm">@{user.username}</span>
                    )}
                    {user.is_verified && (
                      <Badge className="text-xs bg-primary/20 text-primary border border-primary/30">
                        <CheckCircle className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {user.is_private && (
                      <Badge variant="outline" className="text-xs">Private</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={user.is_verified
                      ? "gap-1 text-destructive hover:bg-destructive/10 border border-destructive/30"
                      : "gap-1 text-primary hover:bg-primary/10 border border-primary/30"}
                    onClick={() => toggleVerification.mutate({ user_id: user.user_id, is_verified: !user.is_verified })}
                    disabled={toggleVerification.isPending}
                  >
                    {user.is_verified
                      ? <><UserX className="h-4 w-4" /> Unverify</>
                      : <><Shield className="h-4 w-4" /> Verify</>
                    }
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {user.display_name || user.username}? This action cannot be undone and will permanently remove their account and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteUser.mutate(user.user_id)}
                        >
                          Delete User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_display_name">Display Name</Label>
                <Input
                  id="edit_display_name"
                  value={selectedUser.display_name || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, display_name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_username">Username</Label>
                <Input
                  id="edit_username"
                  value={selectedUser.username || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, username: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_bio">Bio</Label>
                <Input
                  id="edit_bio"
                  value={selectedUser.bio || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, bio: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_avatar_url">Avatar URL</Label>
                <Input
                  id="edit_avatar_url"
                  value={selectedUser.avatar_url || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, avatar_url: e.target.value } : null)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateUserProfile.mutate(selectedUser)}
                  disabled={updateUserProfile.isPending}
                >
                  {updateUserProfile.isPending ? 'Updating...' : 'Update Profile'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}