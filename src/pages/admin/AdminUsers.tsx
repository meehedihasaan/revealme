import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Shield, Search, User, UserX } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

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

  const filtered = users?.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Manage all registered users on the platform.</p>
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
