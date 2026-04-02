// ===== KB Insights Dashboard — Premium Visual Analytics =====
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

const SUPER_DOMAINS: Record<string, { label: string; icon: string; gradient: string; types: string[] }> = {
  algebra: {
    label: "الجبر", icon: "𝑥", gradient: "from-indigo-500 to-purple-600",
    types: ["algebra", "equations", "advanced_algebra", "factor", "solve_equation", "systems"],
  },
  geometry: {
    label: "الهندسة", icon: "△", gradient: "from-emerald-500 to-teal-600",
    types: ["geometry_construction", "triangle_circle", "parallelogram", "angles", "analytic_geometry", "solids", "transformations"],
  },
  analysis: {
    label: "التحليل والدوال", icon: "∫", gradient: "from-rose-500 to-pink-600",
    types: ["functions", "calculus", "trigonometry", "sequences"],
  },
  numbers: {
    label: "الأعداد والحساب", icon: "∑", gradient: "from-sky-500 to-blue-600",
    types: ["arithmetic", "fractions", "proportionality", "number_sets"],
  },
  stats: {
    label: "الإحصاء والاحتمالات", icon: "📊", gradient: "from-violet-500 to-purple-600",
    types: ["statistics", "probability"],
  },
  other: {
    label: "أخرى", icon: "…", gradient: "from-slate-400 to-slate-500",
    types: ["prove", "bac_prep", "unclassified", "other"],
  },
};

type ViewMode = "overview" | "domains" | "patterns" | "coverage";

export function KBNetworkGraph({ exercises, patterns, deconstructions }: Props) {
  const [view, setView] = useState<ViewMode>("overview");
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);

  const insights = useMemo(() => {
    const exByType: Record<string, number> = {};
    exercises.forEach(e => { const t = e.type || "unclassified"; exByType[t] = (exByType[t] || 0) + 1; });

    const patByType: Record<string, number> = {};
    patterns.forEach(p => { const t = p.type || "unclassified"; patByType[t] = (patByType[t] || 0) + 1; });

    const deconByPattern: Record<string, number> = {};
    const deconExIds = new Set<string>();
    deconstructions.forEach(d => {
      deconByPattern[d.patternId] = (deconByPattern[d.patternId] || 0) + 1;
      deconExIds.add(d.exerciseId);
    });

    const coveredExercises = exercises.filter(e => deconExIds.has(e.id)).length;
    const coverageRate = exercises.length > 0 ? Math.round((coveredExercises / exercises.length) * 100) : 0;
    const orphanPatterns = patterns.filter(p => !deconByPattern[p.id]);

    const domainStats = Object.entries(SUPER_DOMAINS).map(([key, sd]) => {
      const exCount = sd.types.reduce((s, t) => s + (exByType[t] || 0), 0);
      const patCount = sd.types.reduce((s, t) => s + (patByType[t] || 0), 0);
      const subTypes = sd.types
        .filter(t => (exByType[t] || 0) > 0 || (patByType[t] || 0) > 0)
        .map(t => ({ type: t, label: TYPE_LABELS_AR[t] || t, exercises: exByType[t] || 0, patterns: patByType[t] || 0 }))
        .sort((a, b) => b.exercises - a.exercises);
      return { key, ...sd, exCount, patCount, subTypes };
    }).filter(d => d.exCount > 0 || d.patCount > 0).sort((a, b) => b.exCount - a.exCount);

    const topPatterns = patterns
      .map(p => ({ ...p, usage: deconByPattern[p.id] || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 12);

    const byGrade: Record<string, number> = {};
    exercises.forEach(e => { const g = e.grade || "غير محدد"; byGrade[g] = (byGrade[g] || 0) + 1; });

    const conceptFreq: Record<string, number> = {};
    patterns.forEach(p => { (p.concepts || []).forEach(c => { conceptFreq[c] = (conceptFreq[c] || 0) + 1; }); });
    const topConcepts = Object.entries(conceptFreq).sort((a, b) => b[1] - a[1]).slice(0, 20);

    return { exByType, patByType, deconByPattern, coveredExercises, coverageRate, orphanPatterns, domainStats, topPatterns, byGrade, topConcepts };
  }, [exercises, patterns, deconstructions]);

  const views: { id: ViewMode; label: string; icon: string }[] = [
    { id: "overview", label: "نظرة شاملة", icon: "◉" },
    { id: "domains", label: "المجالات", icon: "⬡" },
    { id: "patterns", label: "الأنماط", icon: "◈" },
    { id: "coverage", label: "التغطية", icon: "◎" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/8 via-accent/5 to-transparent border border-border p-6">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-black">KB</span>
              رؤية تحليلية لقاعدة المعرفة
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {exercises.length} تمرين · {patterns.length} نمط · {deconstructions.length} تفكيك
            </p>
          </div>

          {/* Pill nav */}
          <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-xl p-1 border border-border shadow-sm">
            {views.map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className="relative text-xs px-4 py-2 rounded-lg font-bold transition-all duration-300"
                style={{
                  color: view === v.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}>
                {view === v.id && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-l from-primary to-primary/90 rounded-lg shadow-lg" 
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
                )}
                <span className="relative z-10">{v.icon} {v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassKPI label="التمارين" value={exercises.length} icon="📝" accent="primary" />
        <GlassKPI label="الأنماط" value={patterns.length} icon="🧬" accent="accent"
          badge={insights.orphanPatterns.length > 0 ? `${insights.orphanPatterns.length} يتيم` : undefined}
          badgeType={insights.orphanPatterns.length > 5 ? "danger" : "warn"} />
        <GlassKPI label="التغطية" value={`${insights.coverageRate}%`} icon="📡"
          accent={insights.coverageRate > 60 ? "success" : "warn"}
          badge={`${insights.coveredExercises} مفكك`} />
        <GlassKPI label="التفكيكات" value={deconstructions.length} icon="🔗" accent="primary" />
      </div>

      {/* ── View Content ── */}
      <AnimatePresence mode="wait">
        {view === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Domain Blocks */}
            <GlassCard title="توزيع المجالات" icon="📊">
              <div className="grid grid-cols-2 gap-3">
                {insights.domainStats.map((d, i) => {
                  const pct = exercises.length > 0 ? (d.exCount / exercises.length) * 100 : 0;
                  return (
                    <motion.div key={d.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      onClick={() => { setExpandedDomain(d.key); setView("domains"); }}
                      className={`relative overflow-hidden rounded-xl p-4 cursor-pointer border border-white/10 bg-gradient-to-br ${d.gradient} text-white shadow-lg`}>
                      <div className="absolute top-2 left-2 text-3xl opacity-20 font-black">{d.icon}</div>
                      <div className="relative">
                        <div className="text-[10px] font-bold opacity-80">{d.label}</div>
                        <div className="text-2xl font-black mt-1">{d.exCount}</div>
                        <div className="text-[9px] opacity-70 mt-0.5">{d.patCount} نمط · {pct.toFixed(0)}%</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Top Patterns */}
            <GlassCard title="الأنماط الأكثر استخداماً" icon="🔬">
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {insights.topPatterns.map((p, i) => {
                  const maxUsage = insights.topPatterns[0]?.usage || 1;
                  const widthPct = (p.usage / maxUsage) * 100;
                  return (
                    <motion.div key={p.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary/5 transition-all cursor-pointer"
                      onClick={() => setSelectedPattern(selectedPattern?.id === p.id ? null : p)}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                        i < 3 ? "bg-gradient-to-br from-accent to-accent/80 text-white shadow-md" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{p.name}</div>
                        <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-1">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPct}%` }}
                            transition={{ delay: 0.2 + i * 0.03, duration: 0.5 }}
                            className="h-full rounded-full bg-gradient-to-l from-primary to-primary/60" />
                        </div>
                      </div>
                      <span className="text-xs font-black text-primary/70 w-8 text-center">{p.usage}</span>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Grade Distribution */}
            <GlassCard title="توزيع المستويات" icon="🎓">
              <div className="flex items-end gap-2 h-[160px] px-1">
                {Object.entries(insights.byGrade)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([grade, count], i) => {
                    const max = Math.max(...Object.values(insights.byGrade));
                    const h = (count / max) * 100;
                    return (
                      <div key={grade} className="flex flex-col items-center flex-1 gap-1.5">
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="text-[10px] font-black text-primary">{count}</motion.span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                          className="w-full rounded-t-lg min-h-[6px] bg-gradient-to-t from-primary/40 via-primary/60 to-primary shadow-sm"
                        />
                        <span className="text-[8px] text-muted-foreground font-bold truncate max-w-full text-center leading-tight">{grade}</span>
                      </div>
                    );
                  })}
              </div>
            </GlassCard>

            {/* Concept Cloud */}
            <GlassCard title="المفاهيم الأساسية" icon="💡">
              <div className="flex flex-wrap gap-2">
                {insights.topConcepts.map(([concept, freq], i) => {
                  const maxF = insights.topConcepts[0]?.[1] || 1;
                  const intensity = 0.3 + (freq / maxF) * 0.7;
                  const size = 10 + Math.round(intensity * 3);
                  return (
                    <motion.span key={concept}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="px-3 py-1.5 rounded-full font-bold border transition-all hover:scale-105 cursor-default"
                      style={{
                        fontSize: size,
                        background: `hsl(var(--primary) / ${intensity * 0.12})`,
                        borderColor: `hsl(var(--primary) / ${intensity * 0.25})`,
                        color: `hsl(var(--primary))`,
                      }}>
                      {concept} <span className="opacity-50">({freq})</span>
                    </motion.span>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {view === "domains" && (
          <motion.div key="domains" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            {insights.domainStats.map((d, i) => (
              <motion.div key={d.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/20 transition-all"
                  onClick={() => setExpandedDomain(expandedDomain === d.key ? null : d.key)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shadow-lg bg-gradient-to-br ${d.gradient}`}>
                      {d.icon}
                    </div>
                    <div>
                      <div className="text-sm font-black text-foreground">{d.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{d.patCount} نمط · {d.subTypes.length} نوع فرعي</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <div className="text-lg font-black text-foreground">{d.exCount}</div>
                      <div className="text-[9px] text-muted-foreground">تمرين</div>
                    </div>
                    <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${exercises.length > 0 ? (d.exCount / exercises.length) * 100 : 0}%` }}
                        className={`h-full rounded-full bg-gradient-to-l ${d.gradient}`} />
                    </div>
                    <motion.span animate={{ rotate: expandedDomain === d.key ? 180 : 0 }}
                      className="text-muted-foreground text-lg">▾</motion.span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedDomain === d.key && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-border/50 pt-4">
                        {d.subTypes.map((st, j) => (
                          <motion.div key={st.type}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: j * 0.03 }}
                            className="rounded-xl p-4 border border-border/50 bg-muted/10 hover:bg-muted/30 transition-all">
                            <div className="text-xs font-black text-foreground mb-2">{st.label}</div>
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <div className="text-lg font-black text-primary">{st.exercises}</div>
                                <div className="text-[8px] text-muted-foreground">تمرين</div>
                              </div>
                              <div className="w-px h-8 bg-border" />
                              <div className="text-center">
                                <div className="text-lg font-black text-accent">{st.patterns}</div>
                                <div className="text-[8px] text-muted-foreground">نمط</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {view === "patterns" && (
          <motion.div key="patterns" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <GlassCard title={`جميع الأنماط (${patterns.length})`} icon="🧬">
                <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                  {patterns
                    .map(p => ({ ...p, usage: insights.deconByPattern[p.id] || 0 }))
                    .sort((a, b) => b.usage - a.usage)
                    .map((p, i) => (
                      <motion.div key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                          selectedPattern?.id === p.id 
                            ? "border-primary/30 bg-primary/5 shadow-sm" 
                            : "border-transparent hover:bg-muted/30"
                        }`}
                        onClick={() => setSelectedPattern(selectedPattern?.id === p.id ? null : p)}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gradient-to-br from-primary to-accent" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
                          <div className="text-[9px] text-muted-foreground">{TYPE_LABELS_AR[p.type || ""] || p.type} · {p.steps.length} خطوات</div>
                        </div>
                        {p.usage === 0 && (
                          <span className="text-[8px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold border border-destructive/20">يتيم</span>
                        )}
                        <span className="text-[10px] font-black text-muted-foreground">{p.usage}×</span>
                      </motion.div>
                    ))}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-4">
              {selectedPattern ? (
                <GlassCard title={selectedPattern.name} icon="◈">
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-wider">الخطوات</div>
                      <div className="space-y-2">
                        {selectedPattern.steps.map((s, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-sm">{i + 1}</span>
                            <span className="text-foreground leading-relaxed">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedPattern.concepts?.length > 0 && (
                      <div>
                        <div className="text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-wider">المفاهيم</div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPattern.concepts.map(c => (
                            <span key={c} className="text-[9px] px-2.5 py-1 rounded-full bg-primary/8 text-primary font-bold border border-primary/15">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedPattern.description && (
                      <div>
                        <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-wider">الوصف</div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{selectedPattern.description}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-3 border-t border-border">
                      <span>🔗 {insights.deconByPattern[selectedPattern.id] || 0} تفكيك</span>
                      <span>📅 {new Date(selectedPattern.createdAt).toLocaleDateString("ar")}</span>
                    </div>
                  </div>
                </GlassCard>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center h-[200px] text-center p-6">
                  <div className="text-3xl mb-2 opacity-30">◈</div>
                  <p className="text-sm text-muted-foreground">اضغط على نمط لعرض تفاصيله</p>
                </div>
              )}

              {insights.orphanPatterns.length > 0 && (
                <GlassCard title={`أنماط يتيمة (${insights.orphanPatterns.length})`} icon="⚠️">
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {insights.orphanPatterns.slice(0, 8).map(p => (
                      <div key={p.id} className="text-[10px] text-destructive/80 px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/10">
                        {p.name}
                      </div>
                    ))}
                    {insights.orphanPatterns.length > 8 && (
                      <div className="text-[9px] text-muted-foreground text-center pt-1">+{insights.orphanPatterns.length - 8} آخرين</div>
                    )}
                  </div>
                </GlassCard>
              )}
            </div>
          </motion.div>
        )}

        {view === "coverage" && (
          <motion.div key="coverage" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Coverage by type */}
            <GlassCard title="تغطية التفكيك حسب النوع" icon="📡">
              <div className="space-y-2.5">
                {Object.entries(insights.exByType)
                  .sort((a, b) => b[1] - a[1])
                  .filter(([, count]) => count > 0)
                  .map(([type, count], i) => {
                    const deconCount = exercises.filter(e => e.type === type && deconstructions.some(d => d.exerciseId === e.id)).length;
                    const rate = count > 0 ? Math.round((deconCount / count) * 100) : 0;
                    const barClass = rate > 60 ? "from-emerald-400 to-emerald-600" : rate > 30 ? "from-amber-400 to-amber-600" : "from-red-400 to-red-600";
                    return (
                      <motion.div key={type}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-foreground w-20 truncate text-right">{TYPE_LABELS_AR[type] || type}</span>
                        <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rate}%` }}
                            transition={{ delay: 0.2 + i * 0.03, duration: 0.5 }}
                            className={`h-full rounded-full bg-gradient-to-l ${barClass}`} />
                        </div>
                        <span className={`text-[10px] font-black w-10 text-left ${rate > 60 ? "text-emerald-600" : rate > 30 ? "text-amber-600" : "text-red-500"}`}>{rate}%</span>
                        <span className="text-[9px] text-muted-foreground w-12 text-left">{deconCount}/{count}</span>
                      </motion.div>
                    );
                  })}
              </div>
            </GlassCard>

            {/* Health + Recommendations */}
            <div className="space-y-5">
              <GlassCard title="صحة القاعدة" icon="🩺">
                <div className="space-y-4">
                  <HealthGauge label="تغطية التفكيك" value={insights.coverageRate} />
                  <HealthGauge label="أنماط مستخدمة"
                    value={patterns.length > 0 ? Math.round(((patterns.length - insights.orphanPatterns.length) / patterns.length) * 100) : 0} />
                  <HealthGauge label="نسبة تفكيك/تمرين"
                    value={exercises.length > 0 ? Math.min(Math.round((deconstructions.length / exercises.length) * 100), 100) : 0} />
                </div>
              </GlassCard>

              <GlassCard title="توصيات" icon="🎯">
                <div className="space-y-2.5">
                  {insights.coverageRate < 50 && (
                    <RecCard type="danger" text={`التغطية منخفضة (${insights.coverageRate}%). أضف تفكيكات لـ ${exercises.length - insights.coveredExercises} تمرين.`} />
                  )}
                  {insights.orphanPatterns.length > 3 && (
                    <RecCard type="warn" text={`${insights.orphanPatterns.length} نمط بدون تفكيكات. اربطها بتمارين أو احذفها.`} />
                  )}
                  {insights.domainStats.some(d => d.exCount < 20) && (
                    <RecCard type="warn" text="بعض المجالات ضعيفة التغطية. أضف تمارين لتحقيق توازن." />
                  )}
                  {insights.coverageRate >= 50 && insights.orphanPatterns.length <= 3 && (
                    <RecCard type="success" text="القاعدة في حالة جيدة. استمر في إضافة تمارين متنوعة." />
                  )}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function GlassKPI({ label, value, icon, accent, badge, badgeType }: {
  label: string; value: string | number; icon: string; accent: string;
  badge?: string; badgeType?: "danger" | "warn";
}) {
  const accentMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 border-primary/20",
    accent: "from-accent/15 to-accent/5 border-accent/20",
    success: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
    warn: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
  };
  const textMap: Record<string, string> = {
    primary: "text-primary", accent: "text-accent",
    success: "text-emerald-600", warn: "text-amber-600",
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className={`rounded-2xl border bg-gradient-to-br ${accentMap[accent] || accentMap.primary} p-5 relative overflow-hidden`}>
      <div className="absolute top-3 left-3 text-2xl opacity-20">{icon}</div>
      <div className="relative">
        <div className={`text-3xl font-black ${textMap[accent] || textMap.primary}`}>{value}</div>
        <div className="text-[11px] font-bold text-foreground mt-1">{label}</div>
        {badge && (
          <div className={`text-[9px] font-bold mt-1.5 ${
            badgeType === "danger" ? "text-destructive" : "text-muted-foreground"
          }`}>{badge}</div>
        )}
      </div>
    </motion.div>
  );
}

function GlassCard({ title, icon, children }: {
  title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">{icon}</span>
        <h4 className="text-sm font-black text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function HealthGauge({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "emerald" : value >= 40 ? "amber" : "red";
  const gradientClass = value >= 70 ? "from-emerald-400 to-emerald-600" : value >= 40 ? "from-amber-400 to-amber-600" : "from-red-400 to-red-600";
  const textClass = value >= 70 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-red-500";
  const emoji = value >= 70 ? "✅" : value >= 40 ? "⚠️" : "🔴";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{emoji}</span>
      <span className="text-xs text-foreground font-bold flex-1">{label}</span>
      <div className="w-28 h-2.5 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8 }}
          className={`h-full rounded-full bg-gradient-to-l ${gradientClass}`} />
      </div>
      <span className={`text-xs font-black w-10 text-left ${textClass}`}>{value}%</span>
    </div>
  );
}

function RecCard({ type, text }: { type: "danger" | "warn" | "success"; text: string }) {
  const styles = {
    danger: { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-900/30", icon: "🔴", text: "text-red-700 dark:text-red-300" },
    warn: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-900/30", icon: "🟡", text: "text-amber-700 dark:text-amber-300" },
    success: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-900/30", icon: "🟢", text: "text-emerald-700 dark:text-emerald-300" },
  }[type];

  return (
    <div className={`p-3 rounded-xl border ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-2">
        <span className="text-sm flex-shrink-0">{styles.icon}</span>
        <span className={`text-xs leading-relaxed ${styles.text}`}>{text}</span>
      </div>
    </div>
  );
}
