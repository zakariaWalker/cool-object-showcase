// ===== KB Insights Dashboard — Clean, actionable admin overview =====
// Replaces chaotic force graph with structured insights at a glance

import { useState, useMemo } from "react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  deconstructions: Deconstruction[];
}

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

const DOMAIN_COLORS: Record<string, string> = {
  algebra: "243 75% 58%", equations: "243 75% 58%",
  advanced_algebra: "243 60% 50%", factor: "243 65% 55%",
  solve_equation: "243 70% 52%", systems: "243 55% 48%",
  geometry_construction: "158 64% 40%", triangle_circle: "158 55% 45%",
  parallelogram: "158 50% 42%", angles: "158 60% 38%",
  analytic_geometry: "158 45% 48%", statistics: "38 92% 50%",
  probability: "277 65% 52%", functions: "340 80% 52%",
  calculus: "340 70% 48%", trigonometry: "340 60% 55%",
  arithmetic: "200 70% 50%", fractions: "200 60% 45%",
  proportionality: "200 55% 48%", number_sets: "200 50% 52%",
  sequences: "20 80% 50%", transformations: "120 50% 40%",
  solids: "280 40% 50%", prove: "0 60% 50%", bac_prep: "45 80% 45%",
  unclassified: "220 10% 60%", other: "220 10% 55%",
};

function getHSL(type?: string) {
  return DOMAIN_COLORS[type || "other"] || DOMAIN_COLORS.other;
}

// Group similar types into super-domains for cleaner display
const SUPER_DOMAINS: Record<string, { label: string; color: string; types: string[] }> = {
  algebra: {
    label: "الجبر",
    color: "243 75% 58%",
    types: ["algebra", "equations", "advanced_algebra", "factor", "solve_equation", "systems"],
  },
  geometry: {
    label: "الهندسة",
    color: "158 64% 40%",
    types: ["geometry_construction", "triangle_circle", "parallelogram", "angles", "analytic_geometry", "solids", "transformations"],
  },
  analysis: {
    label: "التحليل والدوال",
    color: "340 80% 52%",
    types: ["functions", "calculus", "trigonometry", "sequences"],
  },
  numbers: {
    label: "الأعداد والحساب",
    color: "200 70% 50%",
    types: ["arithmetic", "fractions", "proportionality", "number_sets"],
  },
  stats: {
    label: "الإحصاء والاحتمالات",
    color: "277 65% 52%",
    types: ["statistics", "probability"],
  },
  other: {
    label: "أخرى",
    color: "220 10% 55%",
    types: ["prove", "bac_prep", "unclassified", "other"],
  },
};

type ViewMode = "overview" | "domains" | "patterns" | "coverage";

export function KBNetworkGraph({ exercises, patterns, deconstructions }: Props) {
  const [view, setView] = useState<ViewMode>("overview");
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);

  const insights = useMemo(() => {
    // Exercises by type
    const exByType: Record<string, number> = {};
    exercises.forEach(e => {
      const t = e.type || "unclassified";
      exByType[t] = (exByType[t] || 0) + 1;
    });

    // Patterns by type
    const patByType: Record<string, number> = {};
    patterns.forEach(p => {
      const t = p.type || "unclassified";
      patByType[t] = (patByType[t] || 0) + 1;
    });

    // Deconstructions per pattern
    const deconByPattern: Record<string, number> = {};
    const deconExIds = new Set<string>();
    deconstructions.forEach(d => {
      deconByPattern[d.patternId] = (deconByPattern[d.patternId] || 0) + 1;
      deconExIds.add(d.exerciseId);
    });

    // Coverage: exercises with at least one deconstruction
    const coveredExercises = exercises.filter(e => deconExIds.has(e.id)).length;
    const coverageRate = exercises.length > 0 ? Math.round((coveredExercises / exercises.length) * 100) : 0;

    // Orphan patterns (0 deconstructions)
    const orphanPatterns = patterns.filter(p => !deconByPattern[p.id]);

    // Super-domain stats
    const domainStats = Object.entries(SUPER_DOMAINS).map(([key, sd]) => {
      const exCount = sd.types.reduce((s, t) => s + (exByType[t] || 0), 0);
      const patCount = sd.types.reduce((s, t) => s + (patByType[t] || 0), 0);
      const subTypes = sd.types
        .filter(t => (exByType[t] || 0) > 0 || (patByType[t] || 0) > 0)
        .map(t => ({ type: t, label: TYPE_LABELS_AR[t] || t, exercises: exByType[t] || 0, patterns: patByType[t] || 0 }))
        .sort((a, b) => b.exercises - a.exercises);
      return { key, ...sd, exCount, patCount, subTypes };
    }).filter(d => d.exCount > 0 || d.patCount > 0).sort((a, b) => b.exCount - a.exCount);

    // Top patterns by usage
    const topPatterns = patterns
      .map(p => ({ ...p, usage: deconByPattern[p.id] || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 15);

    // Grade distribution
    const byGrade: Record<string, number> = {};
    exercises.forEach(e => {
      const g = e.grade || "غير محدد";
      byGrade[g] = (byGrade[g] || 0) + 1;
    });

    // All concepts across patterns
    const conceptFreq: Record<string, number> = {};
    patterns.forEach(p => {
      (p.concepts || []).forEach(c => {
        conceptFreq[c] = (conceptFreq[c] || 0) + 1;
      });
    });
    const topConcepts = Object.entries(conceptFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    return {
      exByType, patByType, deconByPattern,
      coveredExercises, coverageRate, orphanPatterns,
      domainStats, topPatterns, byGrade, topConcepts,
    };
  }, [exercises, patterns, deconstructions]);

  const views: { id: ViewMode; label: string; icon: string }[] = [
    { id: "overview", label: "نظرة شاملة", icon: "📊" },
    { id: "domains", label: "المجالات", icon: "🧩" },
    { id: "patterns", label: "الأنماط", icon: "🔬" },
    { id: "coverage", label: "التغطية", icon: "📡" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black text-foreground">🔍 رؤية تحليلية لقاعدة المعرفة</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercises.length} تمرين · {patterns.length} نمط · {deconstructions.length} تفكيك
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-1">
          {views.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className="text-xs px-3 py-1.5 rounded-md font-bold transition-all"
              style={{
                background: view === v.id ? "hsl(var(--primary))" : "transparent",
                color: view === v.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="التمارين" value={exercises.length} icon="📝" color="200 70% 50%" />
        <KPICard label="الأنماط" value={patterns.length} icon="🧬"
          sub={`${insights.orphanPatterns.length} يتيم`}
          subColor={insights.orphanPatterns.length > 5 ? "0 70% 55%" : undefined}
          color="243 75% 58%" />
        <KPICard label="التغطية" value={`${insights.coverageRate}%`} icon="📡"
          sub={`${insights.coveredExercises} مفكك`}
          color={insights.coverageRate > 60 ? "158 64% 40%" : "38 92% 50%"} />
        <KPICard label="التفكيكات" value={deconstructions.length} icon="🔗" color="340 80% 52%" />
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        {view === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Domain Treemap */}
            <InsightCard title="📊 توزيع المجالات" subtitle="نسبة التمارين حسب المجال">
              <div className="flex flex-wrap gap-1.5">
                {insights.domainStats.map(d => {
                  const pct = exercises.length > 0 ? (d.exCount / exercises.length) * 100 : 0;
                  return (
                    <motion.div key={d.key}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => { setExpandedDomain(expandedDomain === d.key ? null : d.key); setView("domains"); }}
                      className="rounded-lg cursor-pointer p-3 flex flex-col justify-between transition-all"
                      style={{
                        background: `hsl(${d.color} / 0.12)`,
                        border: `1px solid hsl(${d.color} / 0.25)`,
                        width: `${Math.max(pct * 2.2, 18)}%`,
                        minWidth: 90,
                        minHeight: 72,
                      }}>
                      <div className="text-[10px] font-bold" style={{ color: `hsl(${d.color})` }}>{d.label}</div>
                      <div>
                        <div className="text-lg font-black text-foreground">{d.exCount}</div>
                        <div className="text-[9px] text-muted-foreground">{d.patCount} نمط · {pct.toFixed(0)}%</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </InsightCard>

            {/* Top Patterns */}
            <InsightCard title="🔬 أنماط الأكثر استخداماً" subtitle="مرتبة حسب عدد التفكيكات">
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {insights.topPatterns.map((p, i) => {
                  const maxUsage = insights.topPatterns[0]?.usage || 1;
                  return (
                    <div key={p.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
                      onClick={() => setSelectedPattern(selectedPattern?.id === p.id ? null : p)}>
                      <span className="text-[10px] font-black text-muted-foreground w-5 text-center">{i + 1}</span>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: `hsl(${getHSL(p.type)})` }} />
                      <span className="text-xs font-semibold text-foreground flex-1 truncate">{p.name}</span>
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${(p.usage / maxUsage) * 100}%`,
                          background: `hsl(${getHSL(p.type)})`,
                        }} />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground w-6 text-left">{p.usage}</span>
                    </div>
                  );
                })}
              </div>
            </InsightCard>

            {/* Grade Distribution */}
            <InsightCard title="🎓 توزيع المستويات" subtitle="عدد التمارين حسب المستوى الدراسي">
              <div className="flex items-end gap-2 h-[140px] px-2">
                {Object.entries(insights.byGrade)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([grade, count]) => {
                    const max = Math.max(...Object.values(insights.byGrade));
                    const h = (count / max) * 100;
                    return (
                      <div key={grade} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground">{count}</span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 0.1, duration: 0.4 }}
                          className="w-full rounded-t-md min-h-[4px]"
                          style={{ background: `hsl(var(--primary) / ${0.4 + (h / 100) * 0.6})` }}
                        />
                        <span className="text-[8px] text-muted-foreground font-bold truncate max-w-full">{grade}</span>
                      </div>
                    );
                  })}
              </div>
            </InsightCard>

            {/* Top Concepts */}
            <InsightCard title="💡 المفاهيم الأساسية" subtitle="الأكثر تكراراً عبر الأنماط">
              <div className="flex flex-wrap gap-1.5">
                {insights.topConcepts.map(([concept, freq]) => {
                  const maxF = insights.topConcepts[0]?.[1] || 1;
                  const intensity = 0.3 + (freq / maxF) * 0.7;
                  return (
                    <span key={concept}
                      className="text-[10px] px-2 py-1 rounded-md font-semibold"
                      style={{
                        background: `hsl(var(--primary) / ${intensity * 0.15})`,
                        color: `hsl(var(--primary))`,
                        opacity: 0.5 + intensity * 0.5,
                        border: `1px solid hsl(var(--primary) / ${intensity * 0.2})`,
                      }}>
                      {concept} <span className="text-muted-foreground">({freq})</span>
                    </span>
                  );
                })}
              </div>
            </InsightCard>
          </motion.div>
        )}

        {view === "domains" && (
          <motion.div key="domains" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {insights.domainStats.map(d => (
              <div key={d.key} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-all"
                  onClick={() => setExpandedDomain(expandedDomain === d.key ? null : d.key)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black"
                      style={{ background: `hsl(${d.color} / 0.15)`, color: `hsl(${d.color})` }}>
                      {d.exCount}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">{d.label}</div>
                      <div className="text-[10px] text-muted-foreground">{d.patCount} نمط · {d.subTypes.length} نوع فرعي</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Mini bar */}
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${exercises.length > 0 ? (d.exCount / exercises.length) * 100 : 0}%`,
                        background: `hsl(${d.color})`,
                      }} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {exercises.length > 0 ? ((d.exCount / exercises.length) * 100).toFixed(0) : 0}%
                    </span>
                    <span className="text-muted-foreground">{expandedDomain === d.key ? "▲" : "▼"}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedDomain === d.key && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2 border-t border-border pt-3">
                        {d.subTypes.map(st => (
                          <div key={st.type} className="rounded-lg p-3 border border-border bg-muted/20">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2 h-2 rounded-full" style={{ background: `hsl(${getHSL(st.type)})` }} />
                              <span className="text-xs font-bold text-foreground">{st.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>{st.exercises} تمرين</span>
                              <span>{st.patterns} نمط</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}

        {view === "patterns" && (
          <motion.div key="patterns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pattern list */}
            <div className="lg:col-span-2">
              <InsightCard title="🧬 جميع الأنماط" subtitle={`${patterns.length} نمط مرتب حسب الاستخدام`}>
                <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                  {patterns
                    .map(p => ({ ...p, usage: insights.deconByPattern[p.id] || 0 }))
                    .sort((a, b) => b.usage - a.usage)
                    .map(p => (
                      <div key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
                        onClick={() => setSelectedPattern(selectedPattern?.id === p.id ? null : p)}
                        style={{
                          background: selectedPattern?.id === p.id ? `hsl(${getHSL(p.type)} / 0.08)` : undefined,
                          border: selectedPattern?.id === p.id ? `1px solid hsl(${getHSL(p.type)} / 0.2)` : "1px solid transparent",
                        }}>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: `hsl(${getHSL(p.type)})` }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                          <div className="text-[9px] text-muted-foreground">{TYPE_LABELS_AR[p.type || ""] || p.type} · {p.steps.length} خطوات</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.usage === 0 && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold">يتيم</span>
                          )}
                          <span className="text-[10px] font-bold text-muted-foreground">{p.usage} تفكيك</span>
                        </div>
                      </div>
                    ))}
                </div>
              </InsightCard>
            </div>

            {/* Detail panel */}
            <div>
              {selectedPattern ? (
                <InsightCard title={selectedPattern.name} subtitle={TYPE_LABELS_AR[selectedPattern.type || ""] || ""}>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground mb-1.5">الخطوات</div>
                      <div className="space-y-1.5">
                        {selectedPattern.steps.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-foreground">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedPattern.concepts && selectedPattern.concepts.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground mb-1.5">المفاهيم</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedPattern.concepts.map(c => (
                            <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPattern.description && (
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground mb-1">الوصف</div>
                        <p className="text-xs text-foreground/80">{selectedPattern.description}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border">
                      <span>🔗 {insights.deconByPattern[selectedPattern.id] || 0} تفكيك</span>
                      <span>📅 {new Date(selectedPattern.createdAt).toLocaleDateString("ar")}</span>
                    </div>
                  </div>
                </InsightCard>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  اضغط على نمط لعرض تفاصيله
                </div>
              )}

              {/* Orphan alert */}
              {insights.orphanPatterns.length > 0 && (
                <InsightCard title={`⚠️ أنماط بدون تفكيكات (${insights.orphanPatterns.length})`} subtitle="تحتاج ربطها بتمارين" className="mt-3">
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {insights.orphanPatterns.slice(0, 10).map(p => (
                      <div key={p.id} className="text-[10px] text-destructive/80 px-2 py-1 rounded bg-destructive/5">
                        {p.name}
                      </div>
                    ))}
                    {insights.orphanPatterns.length > 10 && (
                      <div className="text-[9px] text-muted-foreground text-center">+{insights.orphanPatterns.length - 10} آخرين</div>
                    )}
                  </div>
                </InsightCard>
              )}
            </div>
          </motion.div>
        )}

        {view === "coverage" && (
          <motion.div key="coverage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coverage heatmap by type */}
            <InsightCard title="📡 تغطية التفكيك حسب النوع" subtitle="نسبة التمارين المفككة في كل نوع">
              <div className="space-y-2">
                {Object.entries(insights.exByType)
                  .sort((a, b) => b[1] - a[1])
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => {
                    const deconCount = exercises.filter(e => e.type === type && deconstructions.some(d => d.exerciseId === e.id)).length;
                    const rate = count > 0 ? Math.round((deconCount / count) * 100) : 0;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `hsl(${getHSL(type)})` }} />
                        <span className="text-[10px] font-semibold text-foreground w-24 truncate">{TYPE_LABELS_AR[type] || type}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${rate}%`,
                            background: rate > 60 ? "hsl(158 64% 40%)" : rate > 30 ? "hsl(38 92% 50%)" : "hsl(0 70% 55%)",
                          }} />
                        </div>
                        <span className="text-[10px] font-bold w-12 text-left" style={{
                          color: rate > 60 ? "hsl(158 64% 40%)" : rate > 30 ? "hsl(38 92% 50%)" : "hsl(0 70% 55%)",
                        }}>{rate}%</span>
                        <span className="text-[9px] text-muted-foreground w-16 text-left">{deconCount}/{count}</span>
                      </div>
                    );
                  })}
              </div>
            </InsightCard>

            {/* Health summary */}
            <div className="space-y-4">
              <InsightCard title="🩺 صحة القاعدة" subtitle="مؤشرات الجودة">
                <div className="space-y-3">
                  <HealthRow label="تغطية التفكيك" value={insights.coverageRate}
                    good={60} warn={30} />
                  <HealthRow label="أنماط مستخدمة" 
                    value={patterns.length > 0 ? Math.round(((patterns.length - insights.orphanPatterns.length) / patterns.length) * 100) : 0}
                    good={80} warn={50} />
                  <HealthRow label="نسبة تفكيك/تمرين"
                    value={exercises.length > 0 ? Math.round((deconstructions.length / exercises.length) * 100) : 0}
                    good={50} warn={20} suffix="%" />
                </div>
              </InsightCard>

              <InsightCard title="🎯 توصيات" subtitle="خطوات لتحسين القاعدة">
                <div className="space-y-2">
                  {insights.coverageRate < 50 && (
                    <RecommendationRow icon="🔴" text={`التغطية منخفضة (${insights.coverageRate}%). أضف تفكيكات لـ ${exercises.length - insights.coveredExercises} تمرين.`} />
                  )}
                  {insights.orphanPatterns.length > 3 && (
                    <RecommendationRow icon="🟡" text={`${insights.orphanPatterns.length} نمط بدون تفكيكات. اربطها بتمارين أو احذفها.`} />
                  )}
                  {insights.domainStats.some(d => d.exCount < 20) && (
                    <RecommendationRow icon="🟡" text="بعض المجالات ضعيفة التغطية. أضف تمارين لتحقيق توازن." />
                  )}
                  {insights.coverageRate >= 50 && insights.orphanPatterns.length <= 3 && (
                    <RecommendationRow icon="🟢" text="القاعدة في حالة جيدة. استمر في إضافة تمارين متنوعة." />
                  )}
                </div>
              </InsightCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function KPICard({ label, value, icon, color, sub, subColor }: {
  label: string; value: string | number; icon: string; color: string; sub?: string; subColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
        style={{ background: `hsl(${color} / 0.12)` }}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-black text-foreground">{value}</div>
        <div className="text-[10px] text-muted-foreground font-semibold">{label}</div>
        {sub && <div className="text-[9px] font-bold mt-0.5" style={{ color: subColor ? `hsl(${subColor})` : "hsl(var(--muted-foreground))" }}>{sub}</div>}
      </div>
    </div>
  );
}

function InsightCard({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3">
        <div className="text-sm font-bold text-foreground">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function HealthRow({ label, value, good, warn, suffix = "%" }: {
  label: string; value: number; good: number; warn: number; suffix?: string;
}) {
  const color = value >= good ? "158 64% 40%" : value >= warn ? "38 92% 50%" : "0 70% 55%";
  const emoji = value >= good ? "✅" : value >= warn ? "⚠️" : "🔴";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs">{emoji}</span>
      <span className="text-xs text-foreground font-semibold flex-1">{label}</span>
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: `hsl(${color})` }} />
      </div>
      <span className="text-xs font-bold w-10 text-left" style={{ color: `hsl(${color})` }}>{value}{suffix}</span>
    </div>
  );
}

function RecommendationRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs text-foreground">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
