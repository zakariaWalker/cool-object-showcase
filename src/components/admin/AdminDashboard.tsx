import { useMemo } from "react";
import { Exercise, Deconstruction, AdminView } from "./useAdminKBStore";
import { useCountryGrades, CYCLE_LABELS_AR } from "@/hooks/useCountryGrades";

interface Props {
  exercises: Exercise[];
  deconstructions: Deconstruction[];
  stats: {
    total: number;
    classified: number;
    deconstructed: number;
    patternCount: number;
    cycleCounts: Record<string, number>;
    progress: number;
  };
  gradeFilter: string;
  setGradeFilter: (g: string) => void;
  setView: (v: AdminView) => void;
  loaded: boolean;
  onLoadExercises: () => void;
  countryCode: string;
}

const TYPE_LABELS: Record<string, string> = {
  compute: "حساب", simplify: "تبسيط", expand: "نشر", factor: "تفكيك",
  solve_equation: "حل معادلة", solve_inequality: "حل متراجحة",
  prove: "برهان", geometry: "هندسة", statistics: "إحصاء",
  probability: "احتمالات", functions: "دوال", sequences: "متتاليات",
  other: "أخرى", unclassified: "غير مصنف",
};

export function AdminDashboard({
  exercises, deconstructions, stats, gradeFilter, setGradeFilter, setView, loaded, onLoadExercises
}: Props) {
  const filtered = gradeFilter ? exercises.filter(e => e.grade === gradeFilter) : exercises;

  // Type distribution
  const typeCounts: Record<string, number> = {};
  filtered.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

  // Grade distribution
  const gradeCounts: Record<string, number> = {};
  exercises.forEach(e => { gradeCounts[e.grade] = (gradeCounts[e.grade] || 0) + 1; });

  // Recent deconstructions
  const recentDecons = deconstructions.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "مجموع التمارين", value: stats.total, sub: loaded ? `${stats.middleCount} متوسط + ${stats.secondaryCount} ثانوي` : "اضغط تحميل التمارين", color: "hsl(var(--primary))", onClick: () => setView("classify") },
          { label: "مصنّف", value: stats.classified, sub: "الخطوة 1", color: "hsl(var(--secondary))", onClick: () => setView("classify") },
          { label: "مفكَّك", value: stats.deconstructed, sub: "الخطوة 3", color: "hsl(var(--accent))", onClick: () => setView("deconstruct") },
          { label: "نمط في المكتبة", value: stats.patternCount, sub: "الخطوة 2", color: "hsl(var(--probability))", onClick: () => setView("patterns") },
        ].map((card, i) => (
          <div key={i} onClick={card.onClick}
            className="glass-card rounded-lg p-5 cursor-pointer card-hover text-center">
            <div className="text-3xl font-black mb-1" style={{ color: card.color }}>{card.value}</div>
            <div className="text-sm font-bold text-foreground">{card.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Load button if not loaded */}
      {!loaded && (
        <div className="text-center">
          <button onClick={onLoadExercises}
            className="px-6 py-3 rounded-lg font-bold text-primary-foreground transition-all btn-press"
            style={{ background: "hsl(var(--primary))" }}>
            تحميل التمارين
          </button>
        </div>
      )}

      {/* Grade filter */}
      <div className="flex gap-2 flex-wrap">
        {GRADES.map(g => (
          <button key={g.value}
            onClick={() => setGradeFilter(g.value)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
            style={{
              background: gradeFilter === g.value ? "hsl(var(--primary))" : "hsl(var(--card))",
              color: gradeFilter === g.value ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              borderColor: gradeFilter === g.value ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Workflow Steps */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { n: 1, label: "تصنيف", view: "classify" as AdminView },
          { n: 2, label: "أنماط", view: "patterns" as AdminView },
          { n: 3, label: "تفكيك", view: "deconstruct" as AdminView },
          { n: 4, label: "KB", view: "kb" as AdminView },
          { n: 5, label: "رسم بياني", view: "viz" as AdminView },
          { n: 6, label: "ذكاء اصطناعي", view: "dashboard" as AdminView },
        ].map(step => (
          <div key={step.n} onClick={() => setView(step.view)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-all card-hover"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
              style={{ background: "hsl(var(--primary))" }}>{step.n}</div>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type distribution */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center">
            <span className="text-sm font-bold text-foreground">توزيع الأنواع</span>
            <span className="text-[10px] font-mono text-muted-foreground">{gradeFilter || "الكل"}</span>
          </div>
          <div className="p-4 space-y-2">
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="flex-1 text-xs text-foreground">{TYPE_LABELS[type] || type}</div>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${(count / filtered.length) * 100}%`,
                    background: "hsl(var(--primary))",
                  }} />
                </div>
                <div className="text-xs text-muted-foreground w-8 text-left">{count}</div>
              </div>
            ))}
            {Object.keys(typeCounts).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات</div>
            )}
          </div>
        </div>

        {/* Grade distribution */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-foreground">توزيع المستويات</span>
          </div>
          <div className="p-4 space-y-2">
            {GRADES.filter(g => g.value).map(g => (
              <div key={g.value} className="flex items-center gap-2">
                <div className="flex-1 text-xs text-foreground">{g.label}</div>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${((gradeCounts[g.value] || 0) / Math.max(exercises.length, 1)) * 100}%`,
                    background: "hsl(var(--secondary))",
                  }} />
                </div>
                <div className="text-xs text-muted-foreground w-8 text-left">{gradeCounts[g.value] || 0}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deconstructions */}
      <div className="glass-card rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-foreground">آخر التفكيكات</span>
        </div>
        <div className="p-4">
          {recentDecons.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">لا توجد تفكيكات بعد</div>
          ) : (
            <div className="space-y-2">
              {recentDecons.map(d => (
                <div key={d.id} className="p-3 bg-muted/50 rounded-md text-xs">
                  <div className="font-medium text-foreground">{d.exerciseId}</div>
                  <div className="text-muted-foreground mt-1">{d.notes || "بدون ملاحظات"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
