import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, ImageIcon, Activity, MessageCircle, Eye, Ban, Heart, Flag, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        usersCount,
        postsCount,
        pendingVerificationsCount,
        storiesCount,
        activeBansCount,
        commentsCount,
        likesCount,
        followsCount,
        pendingReportsCount,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('user_bans').select('*', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString()),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('likes').select('*', { count: 'exact', head: true }),
        supabase.from('follows').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      return {
        users: usersCount.count || 0,
        posts: postsCount.count || 0,
        pendingVerifications: pendingVerificationsCount.count || 0,
        stories: storiesCount.count || 0,
        activeBans: activeBansCount.count || 0,
        comments: commentsCount.count || 0,
        likes: likesCount.count || 0,
        follows: followsCount.count || 0,
        pendingReports: pendingReportsCount.count || 0,
      };
    }
  });

  const statCards = [
    { label: "Total Users", value: stats?.users, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Posts", value: stats?.posts, icon: ImageIcon, color: "text-accent", bg: "bg-accent/10" },
    { label: "Stories", value: stats?.stories, icon: Eye, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Comments", value: stats?.comments, icon: MessageCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Likes", value: stats?.likes, icon: Heart, color: "text-pink-400", bg: "bg-pink-400/10" },
    { label: "Follows", value: stats?.follows, icon: UserPlus, color: "text-violet-400", bg: "bg-violet-400/10" },
    { label: "Pending Verifications", value: stats?.pendingVerifications, icon: CheckCircle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "Pending Reports", value: stats?.pendingReports, icon: Flag, color: "text-orange-400", bg: "bg-orange-400/10" },
    { label: "Active Bans", value: stats?.activeBans, icon: Ban, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "System Status", value: "Healthy", icon: Activity, color: "text-green-400", bg: "bg-green-400/10", isText: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Platform overview at a glance.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className={`text-xl font-bold ${card.isText ? card.color : ''}`}>
                      {card.value}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
