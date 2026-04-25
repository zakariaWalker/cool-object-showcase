// ===== KB Insight Dashboard — Actionable Analytics =====

import { useMemo, useState, lazy, Suspense } from "react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";
import { motion } from "framer-motion";
import { KBNetworkGraph } from "./KBNetworkGraph";
import { ruleBasedDeconstruct } from "./ruleBasedDeconstructor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KnowledgeGraph3D = lazy(() => import("./KnowledgeGraph3D"));

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  deconstructions: Deconstruction[];
  countryCode?: string;
  onAdd?: (d: Deconstruction) => void;
  reload?: () => void;
}

// Generic short labels — uses grade_code as fallback (e.g. "1AM" for DZ, "G7" for OM).
// For full Arabic labels, the dashboard fetches from country_grades; here we keep it compact.
const SHORT_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};
const labelForGrade = (g: string) => SHORT_LABELS[g] || g;

const TYPE_LABELS_AR: Record<string, string> = {
  arithmetic: "حساب", algebra: "جبر", fractions: "كسور", equations: "معادلات",
  geometry_construction: "إنشاءات هندسية", statistics: "إحصاء", probability: "احتمالات",
  functions: "دوال", trigonometry: "مثلثات", sequences: "متتاليات", calculus: "تحليل",
  systems: "جمل معادلات", proportionality: "تناسبية", transformations: "تحويلات",
  solids: "مجسمات", triangle_circle: "مثلث ودائرة", parallelogram: "متوازي أضلاع",
  angles: "زوايا", number_sets: "مجموعات أعداد", advanced_algebra: "جبر متقدم",
  prove: "برهان", bac_prep: "تحضير BAC", factor: "تحليل عوامل",
  solve_equation: "حل معادلات", analytic_geometry: "هندسة تحليلية",
  unclassified: "غير مصنف", other: "أخرى",
};

export function AdminViz({ exercises, patterns, deconstructions, countryCode = "DZ", onAdd, reload }: Props) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [tab, setTab] = useState<"analytics" | "network" | "3d">("analytics");
  const [linking, setLinking] = useState(false);
  const [linkProgress, setLinkProgress] = useState({ done: 0, total: 0 });

  const insights = useMemo(() => {
    // 1. Coverage: exercises with vs without deconstruction
    const deconExIds = new Set(deconstructions.map(d => d.exerciseId));
    const covered = exercises.filter(e => deconExIds.has(e.id)).length;
    const uncovered = exercises.length - covered;
    const coveragePct = exercises.length > 0 ? Math.round((covered / exercises.length) * 100) : 0;

    // 2. Grade breakdown with coverage
    const gradeStats: Record<string, { total: number; covered: number; types: Set<string> }> = {};
    exercises.forEach(e => {
      if (!gradeStats[e.grade]) gradeStats[e.grade] = { total: 0, covered: 0, types: new Set() };
      gradeStats[e.grade].total++;
      if (deconExIds.has(e.id)) gradeStats[e.grade].covered++;
      if (e.type && e.type !== "unclassified") gradeStats[e.grade].types.add(e.type);
    });

    // 3. Type breakdown with coverage
    const typeStats: Record<string, { total: number; covered: number; patterns: number; grades: Set<string> }> = {};
    exercises.forEach(e => {
      const t = e.type || "unclassified";
      if (!typeStats[t]) typeStats[t] = { total: 0, covered: 0, patterns: 0, grades: new Set() };
      typeStats[t].total++;
      if (deconExIds.has(e.id)) typeStats[t].covered++;
      typeStats[t].grades.add(e.grade);
    });

    // Count patterns per type
    patterns.forEach(p => {
      const t = p.type || "unclassified";
      if (typeStats[t]) typeStats[t].patterns++;
    });

    // 4. Pattern quality
    const patternUsage = new Map<string, number>();
    deconstructions.forEach(d => patternUsage.set(d.patternId, (patternUsage.get(d.patternId) || 0) + 1));
    const unusedPatterns = patterns.filter(p => !patternUsage.has(p.id));
    const topPatterns = patterns
      .map(p => ({ ...p, usage: patternUsage.get(p.id) || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8);

    // 5. AI vs manual — check notes field for AI markers
    const aiCount = deconstructions.filter(d => d.notes?.toLowerCase().includes("ai") || d.notes?.includes("آلي")).length;
    const manualCount = deconstructions.length - aiCount;

    // 6. Coverage heatmap: grade × type
    const heatmap: Record<string, Record<string, { total: number; covered: number }>> = {};
    const allGrades = [...new Set(exercises.map(e => e.grade))].sort();
    const allTypes = [...new Set(exercises.map(e => e.type || "unclassified").filter(t => t !== "unclassified"))].sort();
    allGrades.forEach(g => {
      heatmap[g] = {};
      allTypes.forEach(t => { heatmap[g][t] = { total: 0, covered: 0 }; });
    });
    exercises.forEach(e => {
      const t = e.type || "unclassified";
      if (t === "unclassified") return;
      if (heatmap[e.grade]?.[t]) {
        heatmap[e.grade][t].total++;
        if (deconExIds.has(e.id)) heatmap[e.grade][t].covered++;
      }
    });

    // 7. Gaps: types with zero patterns
    const typesWithNoPatterns = allTypes.filter(t => !patterns.some(p => p.type === t));

    // 8. Orphan patterns (pattern type doesn't match any exercise type)
    const exerciseTypes = new Set(exercises.map(e => e.type));
    const orphanPatterns = patterns.filter(p => p.type && !exerciseTypes.has(p.type));

    // 9. Linkable: uncovered exercises that COULD receive a pattern (their type has at least one pattern)
    const patternTypes = new Set(patterns.map(p => (p.type || "").toLowerCase()).filter(Boolean));
    const uncoveredExercises = exercises.filter(e => !deconExIds.has(e.id));
    const linkableUncovered = uncoveredExercises.filter(e => {
      const t = (e.type || "").toLowerCase();
      return t && t !== "unclassified" && (patternTypes.has(t) || patterns.some(p => (p.type || "").toLowerCase() === t));
    });

    // 10. Weak coverage cells: (grade × type) combos that exist in curriculum but have <3 exercises
    type Weak = { grade: string; type: string; total: number; covered: number };
    const weakCells: Weak[] = [];
    allGrades.forEach(g => {
      allTypes.forEach(t => {
        const c = heatmap[g]?.[t];
        if (c && c.total > 0 && c.total < 3) {
          weakCells.push({ grade: g, type: t, total: c.total, covered: c.covered });
        }
      });
    });
    weakCells.sort((a, b) => a.total - b.total);

    return {
      covered, uncovered, coveragePct, gradeStats, typeStats,
      topPatterns, unusedPatterns, aiCount, manualCount,
      heatmap, allGrades, allTypes, typesWithNoPatterns, orphanPatterns,
      linkableUncovered, weakCells,
    };
  }, [exercises, patterns, deconstructions]);

  const coverageColor = insights.coveragePct >= 70 ? "hsl(var(--geometry))" : insights.coveragePct >= 40 ? "hsl(var(--statistics))" : "hsl(var(--functions))";

  // ── Action: rule-based bulk linking of unused patterns to uncovered exercises ──
  async function handleLinkPatterns() {
    if (!onAdd || linking) return;
    const targets = insights.linkableUncovered;
    if (targets.length === 0) {
      toast.info("لا توجد تمارين غير مفكّكة قابلة للربط");
      return;
    }
    setLinking(true);
    setLinkProgress({ done: 0, total: targets.length });

    try {
      const existingIds = new Set(deconstructions.map(d => d.exerciseId));
      const results = ruleBasedDeconstruct(targets, patterns, existingIds);
      const created = results.filter(r => r.deconstruction).map(r => r.deconstruction!);

      // Persist in batches of 200 directly to Supabase to avoid 500+ sequential inserts
      const BATCH = 200;
      const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      let inserted = 0;
      for (let i = 0; i < created.length; i += BATCH) {
        const batch = created.slice(i, i + BATCH)
          .filter(d => isUUID(d.exerciseId) && (!d.patternId || isUUID(d.patternId)))
          .map(d => ({
            exercise_id: d.exerciseId,
            pattern_id: d.patternId,
            steps: d.steps || [],
            needs: d.needs,
            notes: d.notes,
            country_code: d.countryCode || countryCode,
            ai_generated: false,
          }));
        if (batch.length === 0) continue;
        const { error } = await (supabase as any).from("kb_deconstructions").insert(batch);
        if (error) throw error;
        inserted += batch.length;
        setLinkProgress({ done: Math.min(i + BATCH, created.length), total: created.length });
      }

      toast.success(`✅ تم ربط ${inserted} تمرين بنمط (${created.length - inserted} متجاوَز)`);
      reload?.();
    } catch (err: any) {
      console.error("[link patterns]", err);
      toast.error(`فشل الربط: ${err.message || err}`);
    } finally {
      setLinking(false);
    }
  }

  // ── Action: export weak-domain plan as JSON for AI generation ──
  function handleExportWeakDomains() {
    const plan = insights.weakCells.map(w => ({
      grade: w.grade,
      type: w.type,
      type_ar: TYPE_LABELS_AR[w.type] || w.type,
      current_count: w.total,
      target_count: 5,
      need: 5 - w.total,
    }));
    const blob = new Blob([JSON.stringify({ countryCode, weakDomains: plan }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weak-domains-${countryCode}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`📥 تم تصدير ${plan.length} مجال ضعيف`);
  }


  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setTab("analytics")}
          className="text-xs px-4 py-2 rounded-lg font-bold transition-all"
          style={{
            background: tab === "analytics" ? "hsl(var(--algebra))" : "hsl(var(--muted))",
            color: tab === "analytics" ? "#fff" : "hsl(var(--muted-foreground))",
          }}>
          📊 تحليلات
        </button>
        <button onClick={() => setTab("network")}
          className="text-xs px-4 py-2 rounded-lg font-bold transition-all"
          style={{
            background: tab === "network" ? "hsl(var(--algebra))" : "hsl(var(--muted))",
            color: tab === "network" ? "#fff" : "hsl(var(--muted-foreground))",
          }}>
          🕸️ شبكة المعرفة
        </button>
        <button onClick={() => setTab("3d")}
          className="text-xs px-4 py-2 rounded-lg font-bold transition-all"
          style={{
            background: tab === "3d" ? "hsl(var(--algebra))" : "hsl(var(--muted))",
            color: tab === "3d" ? "#fff" : "hsl(var(--muted-foreground))",
          }}>
          🧊 شبكة 3D
        </button>
      </div>

      {tab === "3d" ? (
        <Suspense fallback={<div className="flex items-center justify-center h-[600px] text-muted-foreground">جاري التحميل...</div>}>
          <KnowledgeGraph3D exercises={exercises} patterns={patterns} deconstructions={deconstructions} />
        </Suspense>
      ) : tab === "network" ? (
        <KBNetworkGraph exercises={exercises} patterns={patterns} deconstructions={deconstructions} />
      ) : (
      <>
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="تغطية التفكيك"
          value={`${insights.coveragePct}%`}
          sub={`${insights.covered} من ${exercises.length}`}
          color={coverageColor}
          icon="📊"
        />
        <KPICard
          label="أنماط نشطة"
          value={`${patterns.length - insights.unusedPatterns.length}`}
          sub={`${insights.unusedPatterns.length} غير مستخدم`}
          color="hsl(var(--algebra))"
          icon="🧩"
        />
        <KPICard
          label="تفكيك AI"
          value={`${insights.aiCount}`}
          sub={`${insights.manualCount} يدوي`}
          color="hsl(var(--probability))"
          icon="🤖"
        />
        <KPICard
          label="ثغرات المحتوى"
          value={`${insights.typesWithNoPatterns.length}`}
          sub="أنواع بدون أنماط"
          color={insights.typesWithNoPatterns.length > 0 ? "hsl(var(--functions))" : "hsl(var(--geometry))"}
          icon="⚠️"
        />
      </div>

      {/* ── Coverage Bar (visual) ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-black text-foreground">📈 تقدم التفكيك الكلي</h4>
          <span className="text-xs font-bold" style={{ color: coverageColor }}>{insights.coveragePct}%</span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${insights.coveragePct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${coverageColor}, hsl(var(--accent)))` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          <span>✅ {insights.covered} مفكّك</span>
          <span>❌ {insights.uncovered} بدون تفكيك</span>
        </div>
      </div>

      {/* ── Two-column: Grade Coverage + Type Coverage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grade Coverage */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-black text-foreground mb-4">🎓 تغطية حسب المستوى</h4>
          <div className="space-y-3">
            {Object.entries(insights.gradeStats)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, stats]) => {
                const pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
                const barColor = pct >= 70 ? "hsl(var(--geometry))" : pct >= 40 ? "hsl(var(--statistics))" : "hsl(var(--functions))";
                return (
                  <div key={grade}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-foreground">{labelForGrade(grade)}</span>
                        <span className="text-[10px] text-muted-foreground">{stats.types.size} أنواع</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{stats.covered}/{stats.total}</span>
                        <span className="text-[10px] font-bold" style={{ color: barColor }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Type Coverage */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-black text-foreground mb-4">📐 تغطية حسب النوع</h4>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {Object.entries(insights.typeStats)
              .filter(([t]) => t !== "unclassified")
              .sort((a, b) => b[1].total - a[1].total)
              .map(([type, stats]) => {
                const pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
                const hasPattern = stats.patterns > 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-bold text-foreground truncate">
                          {TYPE_LABELS_AR[type] || type}
                        </span>
                        {!hasPattern && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "hsl(var(--functions) / 0.15)", color: "hsl(var(--functions))" }}>
                            بدون نمط
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hasPattern ? "hsl(var(--geometry))" : "hsl(var(--muted-foreground))" }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono w-10 text-left flex-shrink-0">{stats.total}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Coverage Heatmap: Grade × Type ── */}
      <div className="rounded-xl border border-border bg-card p-5 overflow-x-auto">
        <h4 className="text-sm font-black text-foreground mb-4">🗺️ خريطة التغطية — المستوى × النوع</h4>
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="p-1.5 text-right font-bold text-muted-foreground sticky right-0 bg-card z-10">المستوى</th>
              {insights.allTypes.map(t => (
                <th key={t} className="p-1 text-center font-medium text-muted-foreground"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 70, maxWidth: 20 }}>
                  {TYPE_LABELS_AR[t] || t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {insights.allGrades.map(g => (
              <tr key={g}>
                <td className="p-1.5 font-black text-foreground sticky right-0 bg-card z-10">{labelForGrade(g)}</td>
                {insights.allTypes.map(t => {
                  const cell = insights.heatmap[g]?.[t] || { total: 0, covered: 0 };
                  if (cell.total === 0) {
                    return <td key={t} className="p-1"><div className="w-6 h-6 mx-auto rounded bg-muted/30" /></td>;
                  }
                  const pct = Math.round((cell.covered / cell.total) * 100);
                  const bg = pct >= 80 ? "hsl(var(--geometry) / 0.35)" : pct >= 50 ? "hsl(var(--statistics) / 0.35)" : pct > 0 ? "hsl(var(--functions) / 0.25)" : "hsl(var(--destructive) / 0.2)";
                  const textColor = pct >= 80 ? "hsl(var(--geometry))" : pct >= 50 ? "hsl(158 64% 25%)" : pct > 0 ? "hsl(340 60% 35%)" : "hsl(var(--destructive))";
                  return (
                    <td key={t} className="p-1" title={`${labelForGrade(g)} × ${TYPE_LABELS_AR[t]}: ${cell.covered}/${cell.total}`}>
                      <div className="w-6 h-6 mx-auto rounded flex items-center justify-center text-[8px] font-bold"
                        style={{ background: bg, color: textColor }}>
                        {cell.total}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-4 mt-3 text-[9px] text-muted-foreground justify-center">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(var(--geometry) / 0.35)" }} /> ≥80%</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(var(--statistics) / 0.35)" }} /> 50-79%</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(var(--functions) / 0.25)" }} /> 1-49%</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: "hsl(var(--destructive) / 0.2)" }} /> 0%</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted/30" /> لا تمارين</span>
        </div>
      </div>

      {/* ── Two-column: Top Patterns + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Patterns */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-black text-foreground mb-4">🏆 أكثر الأنماط استخداماً</h4>
          <div className="space-y-2">
            {insights.topPatterns.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: i < 3 ? "hsl(var(--statistics) / 0.08)" : "hsl(var(--muted) / 0.5)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                  style={{ background: i < 3 ? "hsl(var(--statistics))" : "hsl(var(--muted-foreground))" }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-foreground truncate">{p.name}</div>
                  <div className="text-[9px] text-muted-foreground">{TYPE_LABELS_AR[p.type] || p.type}</div>
                </div>
                <div className="text-sm font-black" style={{ color: i < 3 ? "hsl(var(--statistics))" : "hsl(var(--muted-foreground))" }}>
                  {p.usage}×
                </div>
              </div>
            ))}
            {insights.topPatterns.length === 0 && (
              <p className="text-center py-6 text-muted-foreground text-xs">لا توجد تفكيكات بعد</p>
            )}
          </div>
        </div>

        {/* Alerts & Gaps */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-black text-foreground mb-4">🚨 تنبيهات وثغرات</h4>
          <div className="space-y-2">
            {/* Types without patterns */}
            {insights.typesWithNoPatterns.length > 0 && (
              <AlertItem
                severity="high"
                title={`${insights.typesWithNoPatterns.length} أنواع بدون أنماط حل`}
                detail={insights.typesWithNoPatterns.map(t => TYPE_LABELS_AR[t] || t).join("، ")}
              />
            )}

            {/* Unused patterns */}
            {insights.unusedPatterns.length > 0 && (
              <AlertItem
                severity="medium"
                title={`${insights.unusedPatterns.length} أنماط غير مستخدمة`}
                detail={insights.unusedPatterns.slice(0, 5).map(p => p.name).join("، ")}
              />
            )}

            {/* Low coverage grades */}
            {Object.entries(insights.gradeStats)
              .filter(([, s]) => s.total > 0 && (s.covered / s.total) < 0.3)
              .map(([grade, stats]) => (
                <AlertItem
                  key={grade}
                  severity="medium"
                  title={`${labelForGrade(grade)} تغطية ضعيفة`}
                  detail={`${stats.covered}/${stats.total} فقط (${Math.round((stats.covered / stats.total) * 100)}%)`}
                />
              ))}

            {/* High AI ratio */}
            {deconstructions.length > 0 && insights.aiCount / deconstructions.length > 0.8 && (
              <AlertItem
                severity="low"
                title="نسبة عالية من التفكيك الآلي"
                detail={`${Math.round((insights.aiCount / deconstructions.length) * 100)}% AI — راجع الجودة يدوياً`}
              />
            )}

            {/* Orphan patterns */}
            {insights.orphanPatterns.length > 0 && (
              <AlertItem
                severity="low"
                title={`${insights.orphanPatterns.length} أنماط يتيمة`}
                detail="أنماط لا تتوافق مع أي نوع تمرين موجود"
              />
            )}

            {/* All good */}
            {insights.typesWithNoPatterns.length === 0 && insights.unusedPatterns.length === 0 && insights.coveragePct >= 70 && (
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsl(var(--geometry) / 0.08)" }}>
                <span className="text-lg">✅</span>
                <div>
                  <div className="text-[11px] font-bold" style={{ color: "hsl(var(--geometry))" }}>قاعدة المعرفة بحالة جيدة</div>
                  <div className="text-[9px] text-muted-foreground">تغطية عالية وأنماط فعّالة</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

// ── Sub-components ──

function KPICard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] font-bold text-foreground mt-0.5">{label}</div>
      <div className="text-[9px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function AlertItem({ severity, title, detail }: { severity: "high" | "medium" | "low"; title: string; detail: string }) {
  const styles = {
    high: { bg: "hsl(var(--functions) / 0.08)", color: "hsl(var(--functions))", icon: "🔴" },
    medium: { bg: "hsl(var(--statistics) / 0.08)", color: "hsl(var(--statistics))", icon: "🟡" },
    low: { bg: "hsl(var(--algebra) / 0.06)", color: "hsl(var(--algebra))", icon: "🔵" },
  }[severity];

  return (
    <div className="p-3 rounded-lg" style={{ background: styles.bg }}>
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0">{styles.icon}</span>
        <div>
          <div className="text-[11px] font-bold" style={{ color: styles.color }}>{title}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{detail}</div>
        </div>
      </div>
    </div>
  );
}
