import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
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
  const profileCache = useRef<Record<string, Profile | null>>({});

  const fetchProfile = async (userId: string) => {
    // Use cache to avoid re-fetching on every auth event
    if (profileCache.current[userId]) {
      setProfile(profileCache.current[userId]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    const prof = data as Profile | null;
    if (prof) profileCache.current[userId] = prof;
    setProfile(prof);
  };

  const refreshProfile = async () => {
    if (user) {
      // Clear cache to force fresh fetch
      delete profileCache.current[user.id];
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).then(() => {
          initialized.current = true;
          setLoading(false);
        });
      } else {
        initialized.current = true;
        setLoading(false);
      }
    });

    // Then listen for changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        // Skip if this is the initial event before getSession resolves
        if (!initialized.current) return;

        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          // Only refetch profile on actual auth changes, not token refreshes
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            delete profileCache.current[s.user.id];
            await fetchProfile(s.user.id);
          }
        } else {
          setProfile(null);
          profileCache.current = {};
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    profileCache.current = {};
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
