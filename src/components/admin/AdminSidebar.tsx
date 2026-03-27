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

const NAV_ITEMS: { id: AdminView; icon: string; label: string; badge?: keyof Props["stats"]; section?: string }[] = [
  { id: "dashboard", icon: "◈", label: "لوحة التحكم", section: "نظرة عامة" },
  { id: "classify", icon: "⊞", label: "1. التصنيف", badge: "classified", section: "سير العمل" },
  { id: "patterns", icon: "◎", label: "2. الأنماط", badge: "patternCount" },
  { id: "deconstruct", icon: "⊡", label: "3. التفكيك", badge: "deconstructed" },
  { id: "kb", icon: "⊛", label: "قاعدة المعرفة", badge: "deconstructed", section: "المخرجات" },
  { id: "viz", icon: "◉", label: "شبكة المعرفة" },
];

export function AdminSidebar({ view, setView, stats, onImport, onExport }: Props) {
  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{ background: "hsl(213 35% 28%)" }}>
      {/* Logo */}
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="text-lg font-bold text-primary-foreground tracking-tight">
          📐 قاعدة معرفة الرياضيات
        </div>
        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          المنهاج الجزائري الكامل
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex justify-between text-xs mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
          <span>تقدم التفكيك</span>
          <span>{stats.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.progress}%`, background: "linear-gradient(90deg, #60a5fa, #3b82f6)" }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            {item.section && (
              <div className="px-5 py-2 text-[11px] uppercase tracking-wider font-semibold"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                {item.section}
              </div>
            )}
            <div
              onClick={() => setView(item.id)}
              className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all"
              style={{
                color: view === item.id ? "#fff" : "rgba(255,255,255,0.7)",
                background: view === item.id ? "hsl(213 35% 35%)" : "transparent",
                borderRight: view === item.id ? "3px solid #60a5fa" : "3px solid transparent",
              }}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[11px] px-2 py-0.5 rounded-full min-w-[24px] text-center font-semibold"
                  style={{
                    background: view === item.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                    color: view === item.id ? "#fff" : "rgba(255,255,255,0.8)",
                  }}>
                  {stats[item.badge]}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Tools section */}
        <div className="px-5 py-2 text-[11px] uppercase tracking-wider font-semibold"
          style={{ color: "rgba(255,255,255,0.35)" }}>أدوات</div>
        <div onClick={onImport}
          className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all"
          style={{ color: "rgba(255,255,255,0.7)" }}>
          <span className="text-base w-5 text-center">↑</span>
          <span>استيراد JSON</span>
        </div>
        <div onClick={onExport}
          className="flex items-center gap-3 px-5 py-2.5 cursor-pointer text-sm font-medium transition-all"
          style={{ color: "rgba(255,255,255,0.7)" }}>
          <span className="text-base w-5 text-center">↓</span>
          <span>تصدير الكل</span>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 text-xs leading-relaxed"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
        {stats.total || 2711} تمرين — 18 مستوى/شعبة<br />
        من 1AM إلى 3AS — منهاج DZ<br />
        الأنماط أولاً ← ثم الذكاء الاصطناعي
      </div>
    </aside>
  );
}
