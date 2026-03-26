import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  full_name: string;
  grade: string;
  stream: string;
  avatar_url: string;
}

interface UserRole {
  role: "admin" | "student" | "teacher" | "parent";
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile and roles when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRoles([]);
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as Profile);
    };

    const fetchRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (data) setRoles((data as UserRole[]).map(r => r.role));
    };

    fetchProfile();
    fetchRoles();
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");
  const isStudent = roles.includes("student");
  const isParent = roles.includes("parent");

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  return { session, user, profile, roles, loading, isAdmin, isTeacher, isStudent, isParent, signOut };
}
