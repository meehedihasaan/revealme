import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  onboarding_completed: boolean;
  is_private: boolean;
  is_verified: boolean;
  gender: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const initialized = useRef(false);
  const mounted = useRef(true);
  const currentUserId = useRef<string | null>(null);
  const profileCache = useRef<Record<string, Profile | null>>({});

  const setStableAuthState = useCallback((nextSession: Session | null, forceUserObject = false) => {
    const nextUser = nextSession?.user ?? null;
    currentUserId.current = nextUser?.id ?? null;

    setSession((prev) => {
      if (!prev && !nextSession) return prev;
      if (
        prev &&
        nextSession &&
        prev.user.id === nextSession.user.id &&
        prev.access_token === nextSession.access_token
      ) {
        return prev;
      }
      return nextSession;
    });

    setUser((prev) => {
      if (!forceUserObject && prev?.id === nextUser?.id) {
        return prev;
      }
      return nextUser;
    });
  }, []);

  const fetchProfile = useCallback(async (userId: string, force = false) => {
    if (!force && userId in profileCache.current) {
      const cachedProfile = profileCache.current[userId];
      if (mounted.current && currentUserId.current === userId) {
        setProfile(cachedProfile);
      }
      return cachedProfile;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const nextProfile = (data as Profile | null) ?? null;
    profileCache.current[userId] = nextProfile;

    if (mounted.current && currentUserId.current === userId) {
      setProfile(nextProfile);
    }

    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!currentUserId.current) return;
    delete profileCache.current[currentUserId.current];
    await fetchProfile(currentUserId.current, true);
  }, [fetchProfile]);

  useEffect(() => {
    mounted.current = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted.current) return;

        const nextUserId = initialSession?.user?.id ?? null;
        setStableAuthState(initialSession, true);

        if (nextUserId) {
          await fetchProfile(nextUserId);
        } else {
          setProfile(null);
        }
      } finally {
        initialized.current = true;
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!initialized.current || !mounted.current) return;

      const previousUserId = currentUserId.current;
      const nextUserId = nextSession?.user?.id ?? null;

      setStableAuthState(nextSession, event === "USER_UPDATED");

      if (!nextUserId) {
        profileCache.current = {};
        setProfile(null);
        return;
      }

      if (previousUserId !== nextUserId) {
        setProfile(null);
      }

      const shouldRefreshProfile =
        previousUserId !== nextUserId ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        !(nextUserId in profileCache.current);

      if (shouldRefreshProfile) {
        void fetchProfile(nextUserId, event === "SIGNED_IN" || event === "USER_UPDATED");
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, setStableAuthState]);

  const signOut = useCallback(async () => {
    profileCache.current = {};
    currentUserId.current = null;
    setProfile(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
