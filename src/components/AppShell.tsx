// ===== App Shell — Unified layout with workflow navigation =====
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GamificationDashboard } from "./GamificationDashboard";
import { QEDLogo } from "./QEDLogo";
import { useAuth } from "@/hooks/useAuth";

const WORKFLOW_STEPS = [
  { path: "/profile", label: "الملف الشخصي", emoji: "👤", step: 0 },
  { path: "/home", label: "الرئيسية", emoji: "🏠", step: 1 },
  { path: "/diagnostic", label: "التقييم التشخيصي", emoji: "🔍", step: 2 },
  { path: "/gaps", label: "كشف الثغرات", emoji: "🎯", step: 3 },
  { path: "/learn", label: "مسار التعلم", emoji: "🗺️", step: 4 },
  { path: "/exercises", label: "التمارين", emoji: "📝", step: 5 },
  { path: "/tutor", label: "المدرّس الذكي", emoji: "🤖", step: 6 },
  { path: "/explore", label: "الاستكشاف", emoji: "🔭", step: 7 },
  { path: "/whatif", label: "ماذا لو؟", emoji: "🔬", step: 8 },
  { path: "/exams", label: "الامتحانات", emoji: "🏗️", step: 9 },
  { path: "/exam-kb", label: "KB امتحانات", emoji: "📚", step: 10 },
  { path: "/skills-kb", label: "KB المهارات", emoji: ":-)", step: 11 },
  { path: "/unified-kb", label: "KB عامة", emoji: ":-(", step: 12 },
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
    const publicPaths = ["/", "/auth", "/gaps", "/diagnostic", "/annales"];
    const isPublic =
      publicPaths.includes(currentPath) || currentPath.startsWith("/tma") || currentPath.startsWith("/archive-solve");
    if (isGuest && !isPublic) {
      navigate("/auth");
    }
  }, [isGuest, currentPath, navigate]);

  // Don't show shell on landing, auth, or TMA pages
  if (currentPath === "/" || currentPath === "/auth" || currentPath.startsWith("/tma")) return <>{children}</>;

  // Filter steps for navigation: Guests only see Diagnostic, Students only see learning/practice
  const visibleSteps = WORKFLOW_STEPS.filter((step) => {
    if (isGuest) return step.path === "/gaps" || step.path === "/diagnostic";
    // Admin only steps
    if (
      !isAdmin &&
      (step.path === "/exams" || step.path === "/exam-kb" || step.path === "/skill-kb" || step.path === "/unified-kb")
    )
      return false;
    return true;
  });

  const currentStep = WORKFLOW_STEPS.find((s) => s.path === currentPath)?.step ?? -1;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      {/* Top nav bar with Glassmorphism */}
      <nav
        dir="rtl"
        className="flex-shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-xl sticky top-0 z-50 px-6 h-20 flex items-center shadow-lg shadow-black/5"
      >
        <div className="flex items-center w-full max-w-[1600px] mx-auto">
          {/* Brand */}
          <Link to="/" className="flex-shrink-0 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <QEDLogo size="sm" />
            </div>
          </Link>

          {/* Divider */}
          <div className="w-px h-10 bg-border/40 mx-6 flex-shrink-0" />

          {/* Workflow steps */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 no-scrollbar py-2">
            {visibleSteps.map((item, i) => {
              const isActive =
                currentPath === item.path ||
                (item.path === "/exercises" &&
                  ["/algebra", "/geometry", "/statistics", "/probability", "/functions"].includes(currentPath));
              const isPast = item.step > 0 && item.step < currentStep;

              return (
                <div key={item.path} className="flex items-center flex-shrink-0 px-1">
                  {i > 0 && (
                    <div className={`w-3 h-0.5 mx-1 rounded-full ${isPast ? "bg-primary/40" : "bg-border/20"}`} />
                  )}
                  <Link
                    to={item.path}
                    className={`
                      relative group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[13px] font-black transition-all whitespace-nowrap
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                          : isPast
                            ? "text-primary/70 hover:bg-primary/5"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-bg"
                        className="absolute inset-0 bg-primary rounded-2xl -z-10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <span className="text-lg group-hover:scale-125 transition-transform">{item.emoji}</span>
                    <span className="hidden xl:inline">{item.label}</span>

                    {isPast && !isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 border border-primary/20" />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Right side: admin + user */}
          <div className="flex-shrink-0 flex items-center gap-4 mr-4">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Link
                  to="/admin"
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-black transition-all border-2
                    ${
                      currentPath === "/admin"
                        ? "bg-accent border-accent text-accent-foreground shadow-lg shadow-accent/20"
                        : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
                    }
                  `}
                >
                  ⚙️ <span className="hidden lg:inline">قاعدة المعرفة</span>
                </Link>
                <Link
                  to="/admin/reports"
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-black transition-all border-2
                    ${
                      currentPath === "/admin/reports"
                        ? "bg-destructive/10 border-destructive/20 text-destructive shadow-lg shadow-destructive/5"
                        : "border-border/40 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                    }
                  `}
                >
                  🚩 <span className="hidden lg:inline">البلاغات</span>
                </Link>
              </div>
            )}

            {user ? (
              <Link to="/profile" className="flex items-center gap-3 group">
                <div className="hidden sm:block text-left">
                  <div className="text-[12px] font-black text-foreground leading-none group-hover:text-primary transition-colors">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-70">
                    {profile?.grade?.replace("_", " ").toUpperCase() || "تلميذ"}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-xl blur-[2px] opacity-20 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-xl bg-muted border border-border/40 overflow-hidden flex items-center justify-center">
                    <span className="text-lg font-black text-primary">
                      {(profile?.full_name?.[0] || user.email?.[0] || "Q").toUpperCase()}
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                to="/auth"
                className="text-[12px] px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                دخول
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Progress Glow Line */}
        {!isGuest && currentStep >= 0 && (
          <div className="absolute bottom-0 right-0 left-0 h-[1.5px] bg-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
              className="h-full bg-gradient-to-l from-primary via-cyan-400 to-transparent shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
              transition={{ duration: 0.8 }}
            />
          </div>
        )}
      </nav>

      {/* Compact gamification bar */}
      {currentPath !== "/" && <GamificationDashboard compact />}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">{children}</main>
    </div>
  );
}
