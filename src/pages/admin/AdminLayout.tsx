import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PageLoader from "@/components/PageLoader";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Users, CheckCircle, Image as ImageIcon, Settings, UserCog, Shield } from "lucide-react";

const getAdminItems = (permissions: any) => [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: permissions?.isAdmin },
  { title: "Verifications", url: "/admin/verifications", icon: CheckCircle, show: permissions?.canManageVerifications },
  { title: "Users", url: "/admin/users", icon: Users, show: permissions?.canManageVerifications },
  { title: "User Management", url: "/admin/user-management", icon: UserCog, show: permissions?.canManageUsers },
  { title: "Role Management", url: "/admin/roles", icon: Shield, show: permissions?.canManageRoles },
  { title: "Posts", url: "/admin/posts", icon: ImageIcon, show: permissions?.canManagePosts },
  { title: "App Settings", url: "/admin/settings", icon: Settings, show: permissions?.canManageAppSettings },
].filter(item => item.show);

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { data: permissions } = useUserPermissions();

  const adminItems = getAdminItems(permissions);

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === '/admin'}>
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const { data: permissions, isLoading } = useUserPermissions();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <h1 className="font-semibold">Admin Panel</h1>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
