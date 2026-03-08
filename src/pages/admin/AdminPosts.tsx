import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Search, User, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  location: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Post[];
    }
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-posts-profiles', posts],
    queryFn: async () => {
      if (!posts || posts.length === 0) return {} as Record<string, Profile>;
      const ids = [...new Set(posts.map(p => p.user_id))];
      const { data } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', ids);
      const map: Record<string, Profile> = {};
      (data || []).forEach((p: Profile) => { map[p.user_id] = p; });
      return map;
    },
    enabled: !!posts && posts.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted.");
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete post")
  });

  const filtered = posts?.filter(p =>
    !search || p.caption?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Content Moderation</h2>
        <p className="text-muted-foreground">Review and moderate posts across the platform.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by caption..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-0"><Skeleton className="h-60 w-full" /></CardContent></Card>
        ))}

        {!isLoading && filtered?.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No posts found.
              </CardContent>
            </Card>
          </div>
        )}

        {filtered?.map(post => {
          const profile = profiles?.[post.user_id];
          return (
            <Card key={post.id} className="overflow-hidden group transition-all hover:border-primary/40">
              <div className="relative aspect-square bg-muted">
                <img
                  src={post.image_url}
                  alt={post.caption || 'Post'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="destructive"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteId(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate">@{profile?.username || 'unknown'}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                {post.caption && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.caption}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
