import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Tags,
  Layers,
  Wrench,
  Database,
  Network,
  Upload,
  Download,
  Flag,
  Globe,
  Users,
  FileCheck,
  CreditCard,
  BarChart3,
  Settings,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { AdminView } from "./useAdminKBStore";

interface Props {
  view: AdminView;
  setView: (v: AdminView) => void;
  stats: {
    total: number;
    classified: number;
    patternCount: number;
    deconstructed: number;
    progress: number;
  };
  onImport: () => void;
  onExport: () => void;
}

type NavItem = {
  id: AdminView;
  icon: LucideIcon;
  label: string;
  badge?: keyof Props["stats"];
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "لوحة التحكم", section: "نظرة عامة" },
  { id: "classify", icon: Tags, label: "1. التصنيف", badge: "classified", section: "سير العمل" },
  { id: "patterns", icon: Layers, label: "2. الأنماط", badge: "patternCount" },
  { id: "deconstruct", icon: Wrench, label: "3. التفكيك", badge: "deconstructed" },
  { id: "kb", icon: Database, label: "قاعدة المعرفة", badge: "deconstructed", section: "المخرجات" },
  { id: "viz", icon: Network, label: "شبكة المعرفة" },
];

type RouteItem = { path: string; icon: LucideIcon; label: string; section?: string };

const ROUTE_ITEMS: RouteItem[] = [
  { path: "/admin/curricula", icon: Globe, label: "المناهج والدول", section: "إدارة المنصة" },
  { path: "/admin/users", icon: Users, label: "المستخدمون" },
  { path: "/admin/content", icon: FileCheck, label: "مراجعة المحتوى" },
  { path: "/admin/analytics", icon: BarChart3, label: "التحليلات" },
  { path: "/admin/billing", icon: CreditCard, label: "الفوترة" },
  { path: "/admin/config", icon: Settings, label: "الإعدادات" },
  { path: "/textbook-upload", icon: BookOpen, label: "رفع الكتب" },
];

export function AdminSidebar({ view, setView, stats, onImport, onExport }: Props) {
  const navigate = useNavigate();

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ background: "hsl(var(--primary))" }}>
      {/* Logo */}
      <div className="p-5 pb-4 flex items-center gap-3" style={{ borderBottom: "1px solid hsl(var(--primary-foreground) / 0.15)" }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "hsl(var(--accent))" }}>
          <Database className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
        </div>
        <div>
          <div className="text-sm font-bold text-primary-foreground tracking-tight">قاعدة معرفة الرياضيات</div>
          <div className="text-[10px]" style={{ color: "hsl(var(--primary-foreground) / 0.55)" }}>
            متعدد المناهج
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid hsl(var(--primary-foreground) / 0.1)" }}>
        <div className="flex justify-between text-xs mb-2" style={{ color: "hsl(var(--primary-foreground) / 0.65)" }}>
          <span>تقدم التفكيك</span>
          <span>{Math.min(100, stats.progress)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--primary-foreground) / 0.18)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, stats.progress)}%`, background: "hsl(var(--accent))" }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <div key={item.id}>
              {item.section && (
                <div className="px-5 py-2 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>
                  {item.section}
                </div>
              )}
              <div
                onClick={() => setView(item.id)}
                className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all"
                style={{
                  color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--primary-foreground) / 0.72)",
                  background: isActive ? "hsl(var(--primary-foreground) / 0.12)" : "transparent",
                  borderRight: isActive ? "3px solid hsl(var(--accent))" : "3px solid transparent",
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full min-w-[24px] text-center font-semibold"
                    style={{
                      background: isActive ? "hsl(var(--primary-foreground) / 0.25)" : "hsl(var(--primary-foreground) / 0.15)",
                      color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--primary-foreground) / 0.8)",
                    }}>
                    {stats[item.badge]}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Platform Admin routes */}
        {ROUTE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.path}>
              {item.section && (
                <div className="px-5 py-2 text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>
                  {item.section}
                </div>
              )}
              <div onClick={() => navigate(item.path)}
                className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all hover:bg-white/5"
                style={{ color: "hsl(var(--primary-foreground) / 0.72)" }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
              </div>
            </div>
          );
        })}

        {/* Tools section */}
        <div className="px-5 py-2 mt-2 text-[11px] uppercase tracking-wider font-semibold"
          style={{ color: "hsl(var(--primary-foreground) / 0.4)" }}>أدوات</div>
        <div onClick={onImport}
          className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: "hsl(var(--primary-foreground) / 0.72)" }}>
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span>استيراد JSON</span>
        </div>
        <div onClick={onExport}
          className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: "hsl(var(--primary-foreground) / 0.72)" }}>
          <Download className="w-4 h-4 flex-shrink-0" />
          <span>تصدير الكل</span>
        </div>
        <div onClick={() => navigate("/admin/reports")}
          className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: "hsl(var(--primary-foreground) / 0.72)" }}>
          <Flag className="w-4 h-4 flex-shrink-0" />
          <span>بلاغات الأخطاء</span>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 text-[11px] leading-relaxed"
        style={{ borderTop: "1px solid hsl(var(--primary-foreground) / 0.1)", color: "hsl(var(--primary-foreground) / 0.45)" }}>
        {stats.total || 2711} تمرين · منهاج DZ + OM<br />
        الأنماط أولاً ← ثم الذكاء الاصطناعي
      </div>
    </aside>
  );
}
