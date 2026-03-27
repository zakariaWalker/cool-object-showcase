// ===== Exam Confidence Analysis — Demystify BAC/BEM, reduce stress =====
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ExamEntry, ExamQuestion, ExamKBAnalysis } from "./useExamKBStore";
import { Pattern } from "@/components/admin/useAdminKBStore";

interface Props {
  exams: ExamEntry[];
  questions: ExamQuestion[];
  analysis: ExamKBAnalysis;
  primaryPatterns: Pattern[];
}

type FormatGroup = "official" | "regular";

function classifyFormat(format: string): FormatGroup {
  return format === "bac" || format === "bem" ? "official" : "regular";
}

const FORMAT_GROUP_LABELS: Record<FormatGroup, string> = {
  official: "امتحانات رسمية (BAC/BEM)",
  regular: "فروض واختبارات عادية",
};

export function ExamConfidenceAnalysis({ exams, questions, analysis, primaryPatterns }: Props) {
  const stats = useMemo(() => {
    const officialExams = exams.filter(e => classifyFormat(e.format) === "official");
    const regularExams = exams.filter(e => classifyFormat(e.format) === "regular");
    const officialQs = questions.filter(q => {
      const exam = exams.find(e => e.id === q.examId);
      return exam && classifyFormat(exam.format) === "official";
    });
    const regularQs = questions.filter(q => {
      const exam = exams.find(e => e.id === q.examId);
      return exam && classifyFormat(exam.format) === "regular";
    });

    // Parameter overlap (Deep cognitive structure) - filter out unknown/deleted patterns
    const extractValidPatterns = (qs: typeof questions) => 
      new Set(qs.flatMap(q => q.linkedPatternIds).filter(id => primaryPatterns.some(p => p.id === id)));

    const officialParams = extractValidPatterns(officialQs);
    const regularParams = extractValidPatterns(regularQs);
    const commonParams = [...officialParams].filter(p => regularParams.has(p));
    const paramOverlapPct = officialParams.size > 0
      ? Math.round((commonParams.length / officialParams.size) * 100)
      : 0;

    // Difficulty comparison
    const diffCompare = (qs: typeof questions) => {
      const total = qs.length || 1;
      return {
        easy: Math.round((qs.filter(q => q.difficulty === "easy").length / total) * 100),
        medium: Math.round((qs.filter(q => q.difficulty === "medium").length / total) * 100),
        hard: Math.round((qs.filter(q => q.difficulty === "hard").length / total) * 100),
      };
    };

    const officialDiff = diffCompare(officialQs);
    const regularDiff = diffCompare(regularQs);

    // Average points per question
    const avgPoints = (qs: typeof questions) =>
      qs.length > 0 ? (qs.reduce((s, q) => s + q.points, 0) / qs.length).toFixed(1) : "0";

    // Concept overlap
    const officialConcepts = new Set(officialQs.flatMap(q => q.concepts));
    const regularConcepts = new Set(regularQs.flatMap(q => q.concepts));
    const commonConcepts = [...officialConcepts].filter(c => regularConcepts.has(c));
    const conceptOverlapPct = officialConcepts.size > 0
      ? Math.round((commonConcepts.length / officialConcepts.size) * 100)
      : 0;

    // Repetition of Parameters in official exams
    const paramFreqInOfficial: Record<string, number> = {};
    officialQs.forEach(q => {
      [...new Set(q.linkedPatternIds)].forEach(id => {
        const pattern = primaryPatterns.find(p => p.id === id);
        if (pattern) {
          paramFreqInOfficial[pattern.name] = (paramFreqInOfficial[pattern.name] || 0) + 1;
        }
      });
    });
    
    const topRepeatedParams = Object.entries(paramFreqInOfficial)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // "Surprise factor" - parameters in official but not in regular
    const surpriseParams = [...officialParams]
      .filter(p => !regularParams.has(p))
      .map(id => primaryPatterns.find(p => p.id === id)?.name)
      .filter(Boolean) as string[];

    // Difficulty over years
    const years = [...new Set(exams.map(e => e.year))].filter(Boolean).sort();
    const diffOverYears: Record<string, { easy: number; medium: number; hard: number; total: number; official: boolean }> = {};
    years.forEach(year => {
      const yearExams = exams.filter(e => e.year === year);
      const yearQs = questions.filter(q => yearExams.some(e => e.id === q.examId));
      const total = yearQs.length || 1;
      const isOfficial = yearExams.some(e => classifyFormat(e.format) === "official");
      diffOverYears[year] = {
        easy: Math.round((yearQs.filter(q => q.difficulty === "easy").length / total) * 100),
        medium: Math.round((yearQs.filter(q => q.difficulty === "medium").length / total) * 100),
        hard: Math.round((yearQs.filter(q => q.difficulty === "hard").length / total) * 100),
        total: yearQs.length,
        official: isOfficial,
      };
    });

    return {
      officialExams, regularExams, officialQs, regularQs,
      commonParams, paramOverlapPct,
      officialDiff, regularDiff,
      officialAvgPts: avgPoints(officialQs),
      regularAvgPts: avgPoints(regularQs),
      conceptOverlapPct, commonConcepts,
      topRepeatedParams, surpriseParams,
      diffOverYears, years,
    };
  }, [exams, questions]);

  const hasData = stats.officialQs.length > 0 || stats.regularQs.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="text-6xl mb-4">💪</div>
        <h2 className="text-xl font-black text-foreground">كسر رهبة الامتحان الرسمي</h2>
        <p className="text-sm mt-2 max-w-md mx-auto">
          ارفع امتحانات رسمية (BAC/BEM) وفروض عادية لتكتشف أن الفرق بينهما أقل مما تتخيل!
        </p>
      </div>
    );
  }

  const hasBothGroups = stats.officialQs.length > 0 && stats.regularQs.length > 0;

  return (
    <div className="space-y-6">
      {/* Hero Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-center border border-border"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--geometry) / 0.08))" }}
      >
        <div className="text-4xl mb-2">🧑‍🔬🔍</div>
        <h2 className="text-xl font-black text-foreground mb-1">الامتحان لا يُقاس بمجالاته بل ببنيته الذهنية</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          تكرار محور "الدوال" بنسبة 100% هو أمر بديهي ومبرمج وزارياً! 
          الرهبة الحقيقية تكمن في البنية (الأسئلة المدمجة، المتعددة المراحل، والاستنتاجية).
          دعنا نحلل الجهد الذهني الفعلي للامتحان.
        </p>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="🎓" label="امتحانات رسمية" value={stats.officialExams.length} sub={`${stats.officialQs.length} سؤال`} color="hsl(var(--destructive))" />
        <StatCard icon="📝" label="فروض واختبارات" value={stats.regularExams.length} sub={`${stats.regularQs.length} سؤال`} color="hsl(var(--geometry))" />
        <StatCard icon="🔄" label="تطابق البنية الذهنية" value={`${stats.paramOverlapPct}%`} sub={`${stats.commonParams.length} نمط مشترك`} color="hsl(var(--primary))" />
        <StatCard icon="🧠" label="تطابق المفاهيم الدقيقة" value={`${stats.conceptOverlapPct}%`} sub={`${stats.commonConcepts.length} مفهوم مشترك`} color="hsl(var(--statistics))" />
      </div>

      {hasBothGroups && (
        <>
          {/* Confidence Meter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <h3 className="text-sm font-black text-foreground mb-4">📊 مقياس الثقة — ما مدى تشابه الامتحانات؟</h3>
            <div className="space-y-4">
              {/* Cognitive overlap bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-foreground">تطابق البنية والأنماط المعرفية</span>
                  <span className="font-black" style={{ color: getConfidenceColor(stats.paramOverlapPct) }}>{stats.paramOverlapPct}%</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.paramOverlapPct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ background: getConfidenceColor(stats.paramOverlapPct) }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{getConfidenceMessage(stats.paramOverlapPct)}</p>
              </div>

              {/* Concept overlap bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-foreground">تطابق المفاهيم</span>
                  <span className="font-black" style={{ color: getConfidenceColor(stats.conceptOverlapPct) }}>{stats.conceptOverlapPct}%</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.conceptOverlapPct}%` }}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ background: getConfidenceColor(stats.conceptOverlapPct) }} />
                </div>
              </div>

              {/* Difficulty similarity */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-foreground">تشابه الصعوبة</span>
                  {(() => {
                    const sim = 100 - Math.abs(stats.officialDiff.hard - stats.regularDiff.hard);
                    return <span className="font-black" style={{ color: getConfidenceColor(sim) }}>{sim}%</span>;
                  })()}
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  {(() => {
                    const sim = 100 - Math.abs(stats.officialDiff.hard - stats.regularDiff.hard);
                    return (
                      <motion.div initial={{ width: 0 }} animate={{ width: `${sim}%` }}
                        transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                        className="h-full rounded-full" style={{ background: getConfidenceColor(sim) }} />
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Side-by-Side Difficulty Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DifficultyCard
              title="🎓 الامتحانات الرسمية"
              diff={stats.officialDiff}
              avgPts={stats.officialAvgPts}
              count={stats.officialQs.length}
            />
            <DifficultyCard
              title="📝 الفروض والاختبارات"
              diff={stats.regularDiff}
              avgPts={stats.regularAvgPts}
              count={stats.regularQs.length}
            />
          </div>

          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border-2 p-6 text-center"
            style={{
              borderColor: getConfidenceColor(stats.paramOverlapPct),
              background: getConfidenceColor(stats.paramOverlapPct) + "08",
            }}
          >
            <div className="text-3xl mb-2">{stats.paramOverlapPct >= 60 ? "🎯" : stats.paramOverlapPct >= 30 ? "🧩" : "📊"}</div>
            <h3 className="text-lg font-black text-foreground mb-1">
              {stats.paramOverlapPct >= 60
                ? "فروضك تطابق البنية الذهنية للامتحان الرسمي بدقة!"
                : stats.paramOverlapPct >= 30
                ? "هناك تشابه في الأنماط المعرفية والجهد الذهني"
                : "بنية التدريب الحالية سطحية مقارنة بالامتحان الرسمي"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {stats.paramOverlapPct >= 60
                ? `نسبة تقارب الأنماط (كـالاستنتاج أو الدمج) تصل لـ ${stats.paramOverlapPct}%. استمر في مواجهة مثل هذا الجهد الذهني العالي.`
                : `${stats.commonParams.length} أنماط مشتركة فقط. واصل التدرب على مسائل أكثر دمجاً وتجريداً.`}
            </p>
          </motion.div>
        </>
      )}

      {/* Top Repeated Parameters in Official */}
      {stats.topRepeatedParams.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🎯 البنية الذهنية الأكثر تكراراً في الرسمي</h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            هذه الأنماط (وليس المجالات المبرمجة) هي التي تحدد صعوبة وطبيعة الامتحان حقاً.
          </p>
          <div className="space-y-2">
            {stats.topRepeatedParams.map(([param, count], i) => {
              const pct = Math.round((count / Math.max(stats.officialQs.length, 1)) * 100);
              return (
                <div key={param} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-primary-foreground"
                    style={{ background: `hsl(var(--primary) / ${1 - i * 0.15})` }}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-bold text-foreground">{param}</span>
                      <span className="text-xs font-black text-primary">{count}× ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Surprise Parameters */}
      {stats.surpriseParams.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-3">⚡ أنماط لم تتدرب عليها قط!</h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            تحتوي الامتحانات الرسمية على هذه الأنماط المعرفية، لكن فروضك المسجلة تخلو منها تماماً. يجب التركيز عليها تجنباً للصدمة!
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.surpriseParams.map(param => (
              <span key={param} className="text-xs px-3 py-1.5 rounded-full font-bold border-2"
                style={{ borderColor: "hsl(var(--destructive))", color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.05)" }}>
                ⚠️ {param}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty Over Years */}
      {stats.years.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-2">📈 تطور الصعوبة عبر السنوات</h3>
          <p className="text-[10px] text-muted-foreground mb-4">
            هل الامتحانات تزداد صعوبة حقاً؟ الأرقام تتكلم.
          </p>
          
          {/* Chart-like visualization */}
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 min-w-fit" style={{ minHeight: 180 }}>
              {stats.years.map(year => {
                const d = stats.diffOverYears[year];
                if (!d) return null;
                return (
                  <div key={year} className="flex flex-col items-center gap-1" style={{ minWidth: 50 }}>
                    {/* Stacked bars */}
                    <div className="flex flex-col-reverse w-10 rounded-t-lg overflow-hidden" style={{ height: 120 }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${d.easy * 1.2}px` }}
                        transition={{ duration: 0.6 }}
                        style={{ background: "hsl(var(--geometry))" }}
                      />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${d.medium * 1.2}px` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        style={{ background: "hsl(var(--statistics))" }}
                      />
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${d.hard * 1.2}px` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{ background: "hsl(var(--destructive))" }}
                      />
                    </div>
                    {/* Labels */}
                    <span className="text-[9px] font-black text-foreground">{year}</span>
                    <span className="text-[8px] text-muted-foreground">{d.total}ق</span>
                    {d.official && (
                      <span className="text-[7px] px-1 py-0.5 rounded bg-primary/10 text-primary font-bold">رسمي</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: "hsl(var(--geometry))" }} />
              <span className="text-[9px] text-muted-foreground">سهل</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: "hsl(var(--statistics))" }} />
              <span className="text-[9px] text-muted-foreground">متوسط</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: "hsl(var(--destructive))" }} />
              <span className="text-[9px] text-muted-foreground">صعب</span>
            </div>
          </div>

          {/* Verdict */}
          {(() => {
            const firstYear = stats.years[0];
            const lastYear = stats.years[stats.years.length - 1];
            const firstHard = stats.diffOverYears[firstYear]?.hard || 0;
            const lastHard = stats.diffOverYears[lastYear]?.hard || 0;
            const trend = lastHard - firstHard;
            return (
              <div className="mt-4 p-3 rounded-lg text-center" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <p className="text-xs font-bold text-foreground">
                  {trend > 10
                    ? `⚠️ نسبة الأسئلة الصعبة ارتفعت بـ ${trend}% منذ ${firstYear}`
                    : trend < -10
                    ? `✅ نسبة الأسئلة الصعبة انخفضت بـ ${Math.abs(trend)}% منذ ${firstYear}`
                    : `📊 مستوى الصعوبة مستقر تقريباً منذ ${firstYear}`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {trend <= 10
                    ? "لا داعي للقلق — الصعوبة لم تتغير كثيراً عبر السنوات"
                    : "ركّز على التمارين الصعبة في تحضيرك"}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] font-bold text-foreground">{label}</div>
      <div className="text-[9px] text-muted-foreground">{sub}</div>
    </motion.div>
  );
}

function DifficultyCard({ title, diff, avgPts, count }: {
  title: string;
  diff: { easy: number; medium: number; hard: number };
  avgPts: string;
  count: number;
}) {
  const bars = [
    { key: "easy", label: "سهل", pct: diff.easy, color: "hsl(var(--geometry))" },
    { key: "medium", label: "متوسط", pct: diff.medium, color: "hsl(var(--statistics))" },
    { key: "hard", label: "صعب", pct: diff.hard, color: "hsl(var(--destructive))" },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h4 className="text-xs font-black text-foreground mb-3">{title}</h4>
      <div className="text-[10px] text-muted-foreground mb-3">{count} سؤال · معدل {avgPts} نقطة/سؤال</div>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.key}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="font-bold" style={{ color: b.color }}>{b.label}</span>
              <span className="font-black" style={{ color: b.color }}>{b.pct}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full" style={{ background: b.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getConfidenceColor(pct: number): string {
  if (pct >= 70) return "hsl(var(--geometry))";
  if (pct >= 40) return "hsl(var(--statistics))";
  return "hsl(var(--primary))";
}

function getConfidenceMessage(pct: number): string {
  if (pct >= 80) return "الأنماط الاستنتاجية والتركيبية مألوفة لك بقوة.";
  if (pct >= 60) return "بنية تمارينك تتقارب مع الجهد الإدراكي الرسمي.";
  if (pct >= 40) return "هناك نقص في استهداف التعقيد الرسمي. راجع النماذج المدمجة.";
  return "بنية فروضك سطحية. تدرب على مسائل استنتاجية أكثر.";
}
