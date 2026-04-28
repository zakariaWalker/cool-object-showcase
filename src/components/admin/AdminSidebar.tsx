// ===== KB workflow toolbar (horizontal) — replaces the old left sidebar =====
// The global app sidebar already provides admin navigation; this component
// now only exposes the KB pipeline view switcher + import/export tools.
import {
  LayoutDashboard,
  Tags,
  Layers,
  Wrench,
  Database,
  Network,
  Upload,
  Download,
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

type Tab = { id: AdminView; icon: LucideIcon; label: string; badge?: keyof Props["stats"] };

const TABS: Tab[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "لوحة التحكم" },
  { id: "classify", icon: Tags, label: "تصنيف", badge: "classified" },
  { id: "patterns", icon: Layers, label: "أنماط", badge: "patternCount" },
  { id: "deconstruct", icon: Wrench, label: "تفكيك", badge: "deconstructed" },
  { id: "kb", icon: Database, label: "قاعدة المعرفة" },
  { id: "viz", icon: Network, label: "شبكة المعرفة" },
];

export function AdminSidebar({ view, setView, stats, onImport, onExport }: Props) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-card">
      {/* Progress strip */}
      <div className="px-5 py-2 flex items-center gap-3 border-b border-border/50">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          تقدم التفكيك
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted max-w-md">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, stats.progress)}%`, background: "hsl(var(--primary))" }}
          />
        </div>
        <span className="text-xs font-bold text-foreground tabular-nums">
          {Math.min(100, stats.progress)}%
        </span>
        <span className="text-[11px] text-muted-foreground">
          {stats.total || 0} تمرين
        </span>
      </div>

      {/* Tabs row */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap"
              style={{
                background: active ? "hsl(var(--primary))" : "transparent",
                color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: active ? "hsl(var(--primary-foreground) / 0.2)" : "hsl(var(--muted))",
                    color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  }}
                >
                  {stats[tab.badge]}
                </span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-muted transition-all"
        >
          <Upload className="w-3.5 h-3.5" /> استيراد
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-muted transition-all"
        >
          <Download className="w-3.5 h-3.5" /> تصدير
        </button>
      </div>
    </div>
  );
}
