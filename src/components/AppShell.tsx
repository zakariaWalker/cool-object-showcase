// ===== App Shell — Unified layout with workflow navigation =====
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Home as HomeIcon,
  Stethoscope,
  Target,
  Map as MapIcon,
  PencilLine,
  Bot,
  Telescope,
  FlaskConical,
  FileEdit,
  Library,
  Sparkles,
  Network,
  BookOpen,
  Settings,
  Flag,
  Archive,
  ArrowLeftRight,
  Compass,
  Sigma,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { GamificationDashboard } from "./GamificationDashboard";
import { QEDLogo } from "./QEDLogo";
import { useAuth } from "@/hooks/useAuth";

type Step = { path: string; label: string; icon: LucideIcon; step: number; adminOnly?: boolean };

const WORKFLOW_STEPS: Step[] = [
  { path: "/profile", label: "الملف الشخصي", icon: User, step: 0 },
  { path: "/home", label: "الرئيسية", icon: HomeIcon, step: 1 },
  { path: "/diagnostic", label: "التقييم التشخيصي", icon: Stethoscope, step: 2 },
  { path: "/gaps", label: "كشف الثغرات", icon: Target, step: 3 },
  { path: "/learn", label: "مسار التعلم", icon: MapIcon, step: 4 },
  { path: "/exercises", label: "التمارين", icon: PencilLine, step: 5 },
  { path: "/tutor", label: "المدرّس الذكي", icon: Bot, step: 6 },
  { path: "/explore", label: "الاستكشاف", icon: Telescope, step: 7 },
  { path: "/whatif", label: "ماذا لو؟", icon: FlaskConical, step: 8 },
  { path: "/geometry-studio", label: "استوديو الهندسة", icon: Compass, step: 8 },
  { path: "/algebra-studio", label: "استوديو الجبر", icon: Sigma, step: 8 },
  { path: "/textbooks", label: "المكتبة", icon: BookOpen, step: 9 },
  { path: "/annales", label: "الأرشيف", icon: Archive, step: 9 },
  { path: "/exams", label: "الامتحانات", icon: FileEdit, step: 10, adminOnly: true },
  { path: "/exam-kb", label: "KB امتحانات", icon: Library, step: 11, adminOnly: true },
  { path: "/skills-kb", label: "KB المهارات", icon: Sparkles, step: 12, adminOnly: true },
  { path: "/unified-kb", label: "KB موحدة", icon: Network, step: 13, adminOnly: true },
  { path: "/textbook-upload", label: "الكتب المدرسية", icon: BookOpen, step: 14, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, profile, isAdmin, signOut } = useAuth();
  const isGuest = !user;

  useEffect(() => {
    const publicPaths = ["/", "/auth", "/onboarding", "/gaps", "/diagnostic", "/annales", "/geometry-studio", "/algebra-studio", "/textbooks"];
    const isPublic =
      publicPaths.includes(currentPath) ||
      currentPath.startsWith("/tma") ||
      currentPath.startsWith("/archive-solve") ||
      currentPath.startsWith("/textbooks/") ||
      currentPath.startsWith("/solve/");
    if (isGuest && !isPublic) {
      navigate("/auth");
    }
  }, [isGuest, currentPath, navigate]);

  // Don't show shell on landing, auth, onboarding, or TMA pages
  if (currentPath === "/" || currentPath === "/auth" || currentPath === "/onboarding" || currentPath.startsWith("/tma"))
    return <>{children}</>;

  const visibleSteps = WORKFLOW_STEPS.filter((step) => {
    if (isGuest) return step.path === "/gaps" || step.path === "/diagnostic" || step.path === "/geometry-studio" || step.path === "/algebra-studio";
    if (step.adminOnly && !isAdmin) return false;
    return true;
  });

  const currentStep = WORKFLOW_STEPS.find((s) => s.path === currentPath)?.step ?? -1;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
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
                    <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
                  <Settings className="w-4 h-4" /> <span className="hidden lg:inline">قاعدة المعرفة</span>
                </Link>
                <Link
                  to="/admin/exam-compare"
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-black transition-all border-2
                    ${
                      currentPath === "/admin/exam-compare"
                        ? "bg-accent border-accent text-accent-foreground shadow-lg shadow-accent/20"
                        : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
                    }
                  `}
                >
                  <ArrowLeftRight className="w-4 h-4" /> <span className="hidden lg:inline">مقارنة الامتحانات</span>
                </Link>
                <Link
                  to="/admin/analytics"
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-black transition-all border-2
                    ${
                      currentPath === "/admin/analytics"
                        ? "bg-accent border-accent text-accent-foreground shadow-lg shadow-accent/20"
                        : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
                    }
                  `}
                >
                  <BarChart3 className="w-4 h-4" /> <span className="hidden lg:inline">التحليلات</span>
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
                  <Flag className="w-4 h-4" /> <span className="hidden lg:inline">البلاغات</span>
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

      {currentPath !== "/" && <GamificationDashboard compact />}

      <main className="flex-1 overflow-y-auto custom-scrollbar">{children}</main>
    </div>
  );
}
