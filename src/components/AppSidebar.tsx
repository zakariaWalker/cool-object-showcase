// ===== Unified left sidebar — workflow + studios + library + admin =====
import { Link, useLocation } from "react-router-dom";
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
  Compass,
  Sigma,
  BookOpen,
  Archive,
  FileEdit,
  Library,
  Sparkles,
  Network,
  Settings,
  ArrowLeftRight,
  BarChart3,
  Flag,
  ShieldQuestion,
  Wand2,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { QEDLogo } from "./QEDLogo";

type Item = { path: string; label: string; icon: LucideIcon };
type Group = { label: string; items: Item[]; adminOnly?: boolean; guestVisible?: boolean };

const GROUPS: Group[] = [
  {
    label: "المسار",
    guestVisible: true,
    items: [
      { path: "/home", label: "الرئيسية", icon: HomeIcon },
      { path: "/diagnostic", label: "التقييم التشخيصي", icon: Stethoscope },
      { path: "/gaps", label: "كشف الثغرات", icon: Target },
      { path: "/learn", label: "مسار التعلم", icon: MapIcon },
      { path: "/exercises", label: "التمارين", icon: PencilLine },
      { path: "/tutor", label: "المدرّس الذكي", icon: Bot },
    ],
  },
  {
    label: "الاستوديوهات",
    guestVisible: true,
    items: [
      { path: "/explore", label: "الاستكشاف", icon: Telescope },
      { path: "/whatif", label: "ماذا لو؟", icon: FlaskConical },
      { path: "/geometry-studio", label: "الهندسة", icon: Compass },
      { path: "/algebra-studio", label: "الجبر", icon: Sigma },
    ],
  },
  {
    label: "المكتبة",
    guestVisible: true,
    items: [
      { path: "/textbooks", label: "الكتب المدرسية", icon: BookOpen },
      { path: "/annales", label: "أرشيف الامتحانات", icon: Archive },
    ],
  },
  {
    label: "الإدارة",
    adminOnly: true,
    items: [
      { path: "/admin", label: "قاعدة المعرفة", icon: Settings },
      { path: "/admin/diagnostic-qa", label: "جودة التشخيص", icon: ShieldQuestion },
      { path: "/admin/question-templates", label: "مولّد الأسئلة", icon: Wand2 },
      { path: "/admin/exam-compare", label: "مقارنة الامتحانات", icon: ArrowLeftRight },
      { path: "/admin/analytics", label: "التحليلات", icon: BarChart3 },
      { path: "/admin/reports", label: "البلاغات", icon: Flag },
      { path: "/exams", label: "بناء الامتحانات", icon: FileEdit },
      { path: "/exam-kb", label: "KB امتحانات", icon: Library },
      { path: "/skills-kb", label: "KB المهارات", icon: Sparkles },
      { path: "/unified-kb", label: "KB موحدة", icon: Network },
      { path: "/textbook-upload", label: "رفع الكتب", icon: BookOpen },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, profile, isAdmin, signOut } = useAuth();
  const isGuest = !user;
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const visibleGroups = GROUPS.filter((g) => {
    if (g.adminOnly && !isAdmin) return false;
    if (isGuest && !g.guestVisible) return false;
    return true;
  });

  const isActive = (path: string) =>
    currentPath === path ||
    (path === "/exercises" &&
      ["/algebra", "/geometry", "/statistics", "/probability", "/functions"].includes(currentPath));

  return (
    <Sidebar collapsible="icon" side="right" dir="rtl">
      <SidebarHeader className={collapsed ? "border-b border-border/40 p-2 flex items-center justify-center" : "border-b border-border/40 p-4"}>
        <Link to="/" className={collapsed ? "flex items-center justify-center" : "flex items-center gap-3 group"}>
          {collapsed ? (
            <QEDLogo size="sm" markOnly />
          ) : (
            <>
              <QEDLogo size="sm" />
              <div className="text-[11px] font-bold text-sidebar-foreground/60 uppercase tracking-widest">
                منصّة الرياضيات
              </div>
            </>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={collapsed ? item.label : undefined}
                        className={
                          active
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                            : "hover:bg-muted/60"
                        }
                      >
                        <Link to={item.path}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        {user ? (
          <div className="space-y-1">
            <SidebarMenuButton
              asChild
              isActive={currentPath === "/profile"}
              tooltip={collapsed ? "الملف الشخصي" : undefined}
            >
              <Link to="/profile" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-primary">
                    {(profile?.full_name?.[0] || user.email?.[0] || "Q").toUpperCase()}
                  </span>
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-xs font-bold truncate">
                      {profile?.full_name || user.email?.split("@")[0]}
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                      {isAdmin ? "مدير" : profile?.grade?.replace("_", " ") || "تلميذ"}
                    </div>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
            <SidebarMenuButton
              onClick={signOut}
              tooltip={collapsed ? "تسجيل الخروج" : undefined}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </div>
        ) : (
          <SidebarMenuButton asChild tooltip={collapsed ? "دخول" : undefined}
            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-bold justify-center">
            <Link to="/auth">
              <User className="w-4 h-4" />
              <span>دخول</span>
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
