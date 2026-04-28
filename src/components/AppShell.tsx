// ===== App Shell — Left sidebar layout =====
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GamificationDashboard } from "./GamificationDashboard";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const isGuest = !user;

  useEffect(() => {
    const publicPaths = [
      "/", "/auth", "/onboarding", "/gaps", "/diagnostic",
      "/annales", "/geometry-studio", "/algebra-studio", "/textbooks",
    ];
    const isPublic =
      publicPaths.includes(currentPath) ||
      currentPath.startsWith("/tma") ||
      currentPath.startsWith("/archive-solve") ||
      currentPath.startsWith("/textbooks/") ||
      currentPath.startsWith("/solve/");
    if (isGuest && !isPublic) navigate("/");
  }, [isGuest, currentPath, navigate]);

  // Bare layout for landing/auth/onboarding/TMA, and for guests on /diagnostic
  if (
    currentPath === "/" ||
    currentPath === "/auth" ||
    currentPath === "/onboarding" ||
    currentPath.startsWith("/tma") ||
    (isGuest && currentPath === "/diagnostic")
  ) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen>
      <div dir="rtl" className="min-h-screen flex w-full bg-background font-sans">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between gap-3 px-4 border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-40">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <GamificationDashboard compact />
          </header>

          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
