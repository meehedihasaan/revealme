import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PageLoader from "@/components/PageLoader";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Users, CheckCircle, Image as ImageIcon, Settings, UserCog, Shield, Ban, Filter, Flag, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const getAdminItems = (permissions: any) => [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: permissions?.isAdmin, group: "Overview" },
  { title: "Verifications", url: "/admin/verifications", icon: CheckCircle, show: permissions?.canManageVerifications, group: "Users" },
  { title: "Users", url: "/admin/users", icon: Users, show: permissions?.canManageVerifications, group: "Users" },
  { title: "User Management", url: "/admin/user-management", icon: UserCog, show: permissions?.canManageUsers, group: "Users" },
  { title: "Role Management", url: "/admin/roles", icon: Shield, show: permissions?.canManageRoles, group: "Users" },
  { title: "Ban Management", url: "/admin/bans", icon: Ban, show: permissions?.canManageUsers, group: "Moderation" },
  { title: "Content", url: "/admin/posts", icon: ImageIcon, show: permissions?.canManagePosts, group: "Moderation" },
  { title: "Reports", url: "/admin/reports", icon: Flag, show: permissions?.canManagePosts, group: "Moderation" },
  { title: "Word Filter", url: "/admin/word-filter", icon: Filter, show: permissions?.canManageAppSettings, group: "Settings" },
  { title: "App Settings", url: "/admin/settings", icon: Settings, show: permissions?.canManageAppSettings, group: "Settings" },
].filter(item => item.show);

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { data: permissions } = useUserPermissions();

  const adminItems = getAdminItems(permissions);
  const groups = [...new Set(adminItems.map(i => i.group))];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar-background">
      <SidebarContent>
        <div className="px-3 py-4">
          {!collapsed && (
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to App
            </button>
          )}
        </div>
        {groups.map(group => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              {group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.filter(i => i.group === group).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} end={item.url === '/admin'}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const { data: permissions, isLoading } = useUserPermissions();

  if (isLoading) return <PageLoader />;
  if (!permissions?.isAdmin) return <Navigate to="/feed" replace />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-12 flex items-center border-b border-border/50 px-4 shrink-0 bg-background sticky top-0 z-10">
            <SidebarTrigger className="mr-3" />
            <h1 className="text-sm font-semibold text-foreground">Admin</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-5xl w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
