// ===== App Shell — Unified layout with workflow navigation =====
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GamificationDashboard } from "./GamificationDashboard";
import { QEDLogo } from "./QEDLogo";
import { useAuth } from "@/hooks/useAuth";

const WORKFLOW_STEPS = [
  { path: "/home",   label: "الرئيسية",      emoji: "🏠", step: 0 },
  { path: "/gaps",   label: "التقييم التشخيصي", emoji: "🔍", step: 1 },
  { path: "/learn",  label: "مسار التعلم",    emoji: "🗺️", step: 2 },
  { path: "/exercises", label: "التمارين",    emoji: "📝", step: 3 },
  { path: "/tutor",  label: "المدرّس الذكي",  emoji: "🤖", step: 4 },
  { path: "/explore", label: "الاستكشاف",    emoji: "🔭", step: 5 },
  { path: "/whatif", label: "ماذا لو؟",       emoji: "🔬", step: 6 },
  { path: "/exams", label: "الامتحانات",     emoji: "🏗️", step: 7 },
  { path: "/exam-kb", label: "KB امتحانات",  emoji: "📚", step: 8 },
];

const ADMIN_LINK = { path: "/admin", label: "لوحة الإدارة", emoji: "⚙️" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, profile, isAdmin, signOut } = useAuth();
  const isGuest = !user;

  // Protected routes check for guests
  // Guests can ONLY access landing ("/") and Diagnostic Assessment ("/gaps")
  useEffect(() => {
    if (isGuest && currentPath !== "/" && currentPath !== "/auth" && currentPath !== "/gaps" && !currentPath.startsWith("/tma")) {
      navigate("/auth");
    }
  }, [isGuest, currentPath, navigate]);

  // Don't show shell on landing, auth, or TMA pages
  if (currentPath === "/" || currentPath === "/auth" || currentPath.startsWith("/tma")) return <>{children}</>;

  // Filter steps for navigation: Guests only see Diagnostic, Students only see learning/practice
  const visibleSteps = WORKFLOW_STEPS.filter(step => {
    if (isGuest) return step.path === "/gaps"; 
    // Admin only steps
    if (!isAdmin && (step.path === "/exams" || step.path === "/exam-kb")) return false;
    return true;
  });

  const currentStep = WORKFLOW_STEPS.find(s => s.path === currentPath)?.step ?? -1;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top nav bar */}
      <nav
        dir="rtl"
        className="flex-shrink-0 border-b border-border bg-card"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center px-4 py-0 bg-card">
          {/* Brand */}
          <Link to="/" className="flex-shrink-0 py-2">
            <QEDLogo size="sm" />
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-2 flex-shrink-0" />

          {/* Workflow steps */}
          <div className="flex items-center gap-0.5 overflow-x-auto flex-1">
            {visibleSteps.map((item, i) => {
              const isActive = currentPath === item.path || 
                (item.path === "/exercises" && ["/algebra", "/geometry", "/statistics", "/probability", "/functions"].includes(currentPath));
              const isPast = item.step > 0 && item.step < currentStep;
              
              return (
                <div key={item.path} className="flex items-center flex-shrink-0">
                  {i > 0 && (
                    <div className={`w-4 h-px mx-0.5 ${isPast ? "bg-primary" : "bg-border"}`} />
                  )}
                  <Link
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : isPast
                          ? "text-primary/60 hover:bg-primary/5"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.step > 0 && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isPast
                            ? "bg-primary/30 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {isPast ? "✓" : item.step}
                      </span>
                    )}
                    <span>{item.emoji}</span>
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Right side: admin + user */}
          <div className="flex-shrink-0 flex items-center gap-2 mr-2">
            {isAdmin && (
              <Link
                to={ADMIN_LINK.path}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                  currentPath === ADMIN_LINK.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {ADMIN_LINK.emoji} <span className="hidden lg:inline">{ADMIN_LINK.label}</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-left">
                  <div className="text-[10px] font-bold text-foreground leading-none">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[8px] text-muted-foreground">
                    {profile?.grade?.replace("_", " ").toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-[10px] px-2 py-1 rounded-md bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
              >
                دخول
              </Link>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {!isGuest && currentStep >= 0 && (
          <div className="h-0.5 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStep / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
            />
          </div>
        )}
      </nav>

      {/* Compact gamification bar */}
      {currentPath !== "/" && <GamificationDashboard compact />}

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
