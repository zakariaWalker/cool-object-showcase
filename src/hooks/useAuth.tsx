import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export type { AppRole };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [{ data: roles, error: roleErr }, { data: prof, error: profErr }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).limit(1).maybeSingle(),
        supabase.from('profiles').select('full_name, avatar_url').eq('user_id', userId).maybeSingle(),
      ]);

      if (roleErr) console.error('Role fetch error:', roleErr.message);
      if (profErr) console.error('Profile fetch error:', profErr.message);

      if (roles) setRole(roles.role as AppRole);
      if (prof) setProfile(prof);
    } catch (err) {
      console.error('fetchUserData failed:', err);
    }
  }, []);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    // Bootstrap: load existing session synchronously first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Don't await here — Supabase docs discourage async calls inside this callback
        fetchUserData(session.user.id);
        setLoading(false);
      } else {
        clearAuthState();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, clearAuthState]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
