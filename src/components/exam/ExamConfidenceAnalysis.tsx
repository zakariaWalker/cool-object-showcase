// ===== Exam Confidence Analysis — Demystify BAC/BEM, reduce stress =====
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TYPE_LABELS_AR } from "@/engine/exam-types";
import type { ExamEntry, ExamQuestion, ExamKBAnalysis } from "./useExamKBStore";

interface Props {
  exams: ExamEntry[];
  questions: ExamQuestion[];
  analysis: ExamKBAnalysis;
}

type FormatGroup = "official" | "regular";

function classifyFormat(format: string): FormatGroup {
  return format === "bac" || format === "bem" ? "official" : "regular";
}

const FORMAT_GROUP_LABELS: Record<FormatGroup, string> = {
  official: "امتحانات رسمية (BAC/BEM)",
  regular: "فروض واختبارات عادية",
};

export function ExamConfidenceAnalysis({ exams, questions, analysis }: Props) {
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

    // Topic overlap
    const officialTypes = new Set(officialQs.map(q => q.type).filter(t => t !== "unclassified"));
    const regularTypes = new Set(regularQs.map(q => q.type).filter(t => t !== "unclassified"));
    const commonTypes = [...officialTypes].filter(t => regularTypes.has(t));
    const overlapPct = officialTypes.size > 0
      ? Math.round((commonTypes.length / officialTypes.size) * 100)
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

    // Repetition patterns in official exams
    const typeFreqInOfficial: Record<string, number> = {};
    officialQs.forEach(q => {
      typeFreqInOfficial[q.type] = (typeFreqInOfficial[q.type] || 0) + 1;
    });
    const topRepeated = Object.entries(typeFreqInOfficial)
      .filter(([t]) => t !== "unclassified")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // "Surprise factor" - types in official but not in regular
    const surpriseTypes = [...officialTypes].filter(t => !regularTypes.has(t));

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
      commonTypes, overlapPct,
      officialDiff, regularDiff,
      officialAvgPts: avgPoints(officialQs),
      regularAvgPts: avgPoints(regularQs),
      conceptOverlapPct, commonConcepts,
      topRepeated, surpriseTypes,
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
        <div className="text-4xl mb-2">💪🧠</div>
        <h2 className="text-xl font-black text-foreground mb-1">الامتحان الرسمي ≠ وحش مرعب</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          تحليل علمي يكشف أن أسئلة BAC و BEM تتبع نفس الأنماط الموجودة في فروضك العادية.
          الفرق الوحيد هو الضغط النفسي — وها نحن نكسره!
        </p>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="🎓" label="امتحانات رسمية" value={stats.officialExams.length} sub={`${stats.officialQs.length} سؤال`} color="hsl(var(--destructive))" />
        <StatCard icon="📝" label="فروض واختبارات" value={stats.regularExams.length} sub={`${stats.regularQs.length} سؤال`} color="hsl(var(--geometry))" />
        <StatCard icon="🔄" label="تطابق المواضيع" value={`${stats.overlapPct}%`} sub={`${stats.commonTypes.length} موضوع مشترك`} color="hsl(var(--primary))" />
        <StatCard icon="🧠" label="تطابق المفاهيم" value={`${stats.conceptOverlapPct}%`} sub={`${stats.commonConcepts.length} مفهوم مشترك`} color="hsl(var(--statistics))" />
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
              {/* Topic overlap bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-foreground">تطابق المواضيع</span>
                  <span className="font-black" style={{ color: getConfidenceColor(stats.overlapPct) }}>{stats.overlapPct}%</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.overlapPct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ background: getConfidenceColor(stats.overlapPct) }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{getConfidenceMessage(stats.overlapPct)}</p>
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
              borderColor: getConfidenceColor(stats.overlapPct),
              background: getConfidenceColor(stats.overlapPct) + "08",
            }}
          >
            <div className="text-3xl mb-2">{stats.overlapPct >= 60 ? "✅" : stats.overlapPct >= 30 ? "📈" : "📊"}</div>
            <h3 className="text-lg font-black text-foreground mb-1">
              {stats.overlapPct >= 60
                ? "الامتحان الرسمي = فرض عادي + ضغط نفسي"
                : stats.overlapPct >= 30
                ? "هناك تشابه كبير، أنت مستعد أكثر مما تعتقد"
                : "ارفع المزيد من الامتحانات للحصول على نتائج أدق"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {stats.overlapPct >= 60
                ? `${stats.overlapPct}% من مواضيع الامتحان الرسمي موجودة في فروضك. إذا حللت الفرض، فأنت جاهز!`
                : `${stats.commonTypes.length} مواضيع مشتركة بين الرسمي والعادي. واصل التدريب!`}
            </p>
          </motion.div>
        </>
      )}

      {/* Top Repeated in Official */}
      {stats.topRepeated.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🎯 أكثر المواضيع تكراراً في الامتحانات الرسمية</h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            هذه المواضيع تتكرر كل عام — ركّز عليها وستحل 80% من الامتحان
          </p>
          <div className="space-y-2">
            {stats.topRepeated.map(([type, count], i) => {
              const pct = Math.round((count / Math.max(stats.officialQs.length, 1)) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-primary-foreground"
                    style={{ background: `hsl(var(--primary) / ${1 - i * 0.15})` }}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-bold text-foreground">{TYPE_LABELS_AR[type] || type}</span>
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

      {/* Surprise Topics */}
      {stats.surpriseTypes.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-3">⚡ مواضيع تحتاج تحضير إضافي</h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            هذه المواضيع ظهرت في الامتحانات الرسمية لكن لم تظهر في فروضك — راجعها!
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.surpriseTypes.filter(t => t !== "unclassified").map(type => (
              <span key={type} className="text-xs px-3 py-1.5 rounded-full font-bold border-2"
                style={{ borderColor: "hsl(var(--destructive))", color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.05)" }}>
                ⚠️ {TYPE_LABELS_AR[type] || type}
              </span>
            ))}
          </div>
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
  if (pct >= 80) return "تشابه شبه كامل! الامتحان الرسمي هو نفس الفرض العادي بغلاف مختلف.";
  if (pct >= 60) return "تشابه عالي جداً. أنت تتدرب على نفس المواضيع يومياً.";
  if (pct >= 40) return "تشابه جيد. معظم المواضيع مألوفة لديك.";
  return "ارفع المزيد من الامتحانات لتحليل أدق.";
}
