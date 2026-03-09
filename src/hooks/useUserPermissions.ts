import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = 'admin' | 'moderator' | 'user';

export type UserPermissions = {
  canManageUsers: boolean;
  canManagePosts: boolean;
  canManageVerifications: boolean;
  canManageAppSettings: boolean;
  canManageRoles: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isAdmin: boolean;
};

export function useUserPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async (): Promise<UserPermissions> => {
      if (!user?.id) {
        return {
          canManageUsers: false,
          canManagePosts: false,
          canManageVerifications: false,
          canManageAppSettings: false,
          canManageRoles: false,
          isSuperAdmin: false,
          isModerator: false,
          isAdmin: false,
        };
      }

      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRoles = roles?.map(r => r.role) || [];
      const isSuperAdmin = userRoles.includes('admin');
      const isModerator = userRoles.includes('moderator');
      const isAdmin = isSuperAdmin || isModerator;

      return {
        canManageUsers: isSuperAdmin,
        canManagePosts: isAdmin,
        canManageVerifications: isAdmin,
        canManageAppSettings: isSuperAdmin,
        canManageRoles: isSuperAdmin,
        isSuperAdmin,
        isModerator,
        isAdmin,
      };
    },
    enabled: !!user?.id,
  });
}

export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async (): Promise<UserRole[]> => {
      if (!user?.id) return [];

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      return roles?.map(r => r.role as UserRole) || [];
    },
    enabled: !!user?.id,
  });
}