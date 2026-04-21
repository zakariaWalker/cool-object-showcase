// Wraps protected pages. If the logged-in user hasn't picked a country+grade yet,
// redirects them to /onboarding. Pass `optional` for pages where curriculum is nice-to-have.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: React.ReactNode;
  optional?: boolean;       // if true, only checks when user is signed in
  requireAuth?: boolean;    // if true, also redirects unauthenticated users to /auth
}

export function CurriculumGuard({ children, optional = false, requireAuth = false }: Props) {
  const { isComplete, loading } = useUserCurriculum();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (requireAuth) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
        return;
      }
      if (optional) return;
      if (!isComplete) {
        navigate(`/onboarding?redirect=${encodeURIComponent(location.pathname)}`);
      }
    })();
  }, [isComplete, loading, navigate, location.pathname, optional, requireAuth]);

  return <>{children}</>;
}
