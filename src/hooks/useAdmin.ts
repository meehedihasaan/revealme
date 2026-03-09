import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      console.log('useAdmin: Checking admin status for user:', user?.id);
      if (!user) {
        console.log('useAdmin: No user found');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('useAdmin: Calling has_role RPC function');
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('useAdmin: RPC error:', error);
          throw error;
        }
        
        console.log('useAdmin: RPC result:', data);
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        console.log('useAdmin: Setting loading to false');
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};
