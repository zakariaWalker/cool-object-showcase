// ===== Exam Reality Analysis — Data-driven, no hype, real metrics =====
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

// Bloom taxonomy labels
const BLOOM_LABELS: Record<number, string> = {
  1: "تذكر", 2: "فهم", 3: "تطبيق", 4: "تحليل", 5: "تقييم", 6: "إبداع"
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

    // Bloom distribution
    const bloomDist = (qs: typeof questions) => {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      qs.forEach(q => { const bl = q.bloomLevel || 3; counts[bl] = (counts[bl] || 0) + 1; });
      const total = qs.length || 1;
      return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, { count: v, pct: Math.round((v / total) * 100) }]));
    };

    const officialBloom = bloomDist(officialQs);
    const regularBloom = bloomDist(regularQs);

    // Difficulty
    const diffCompare = (qs: typeof questions) => {
      const total = qs.length || 1;
      return {
        easy: Math.round((qs.filter(q => q.difficulty === "easy").length / total) * 100),
        medium: Math.round((qs.filter(q => q.difficulty === "medium").length / total) * 100),
        hard: Math.round((qs.filter(q => q.difficulty === "hard").length / total) * 100),
      };
    };

    // Points stats
    const pointsStats = (qs: typeof questions) => {
      if (!qs.length) return { avg: 0, min: 0, max: 0, total: 0 };
      const pts = qs.map(q => q.points);
      return {
        avg: +(pts.reduce((a, b) => a + b, 0) / pts.length).toFixed(1),
        min: Math.min(...pts),
        max: Math.max(...pts),
        total: pts.reduce((a, b) => a + b, 0)
      };
    };

    // Concept frequency across official exams
    const conceptFreq: Record<string, number> = {};
    officialQs.forEach(q => q.concepts.forEach(c => { conceptFreq[c] = (conceptFreq[c] || 0) + 1; }));
    const topConcepts = Object.entries(conceptFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Year-by-year data
    const years = [...new Set(exams.map(e => e.year))].filter(Boolean).sort();
    const yearlyData = years.map(year => {
      const yearExams = exams.filter(e => e.year === year);
      const yearQs = questions.filter(q => yearExams.some(e => e.id === q.examId));
      const isOfficial = yearExams.some(e => classifyFormat(e.format) === "official");
      const diff = diffCompare(yearQs);
      const bloom = bloomDist(yearQs);
      return { year, qCount: yearQs.length, isOfficial, diff, bloom, exams: yearExams.length };
    });

    // Pattern overlap
    const extractPatterns = (qs: typeof questions) =>
      new Set(qs.flatMap(q => q.linkedPatternIds).filter(id => primaryPatterns.some(p => p.id === id)));
    const officialParams = extractPatterns(officialQs);
    const regularParams = extractPatterns(regularQs);
    const commonParams = [...officialParams].filter(p => regularParams.has(p));

    // Surprise patterns (in official but NOT in regular)
    const surpriseParams = [...officialParams]
      .filter(p => !regularParams.has(p))
      .map(id => primaryPatterns.find(p => p.id === id)?.name).filter(Boolean) as string[];

    // Most repeated patterns in official
    const paramFreq: Record<string, number> = {};
    officialQs.forEach(q => {
      [...new Set(q.linkedPatternIds)].forEach(id => {
        const p = primaryPatterns.find(x => x.id === id);
        if (p) paramFreq[p.name] = (paramFreq[p.name] || 0) + 1;
      });
    });
    const topPatterns = Object.entries(paramFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return {
      officialExams, regularExams, officialQs, regularQs,
      officialDiff: diffCompare(officialQs), regularDiff: diffCompare(regularQs),
      officialBloom, regularBloom,
      officialPts: pointsStats(officialQs), regularPts: pointsStats(regularQs),
      topConcepts, yearlyData, years,
      commonParams, surpriseParams, topPatterns,
      paramOverlapPct: officialParams.size > 0 ? Math.round((commonParams.length / officialParams.size) * 100) : 0,
    };
  }, [exams, questions, primaryPatterns]);

  const hasData = stats.officialQs.length > 0 || stats.regularQs.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-16 text-muted-foreground space-y-3">
        <div className="text-5xl">📊</div>
        <h2 className="text-lg font-black text-foreground">تحليل واقعي للامتحانات</h2>
        <p className="text-sm max-w-md mx-auto">ارفع امتحانات سابقة لتحصل على تحليل إحصائي دقيق يكسر الغموض حول BEM و BAC.</p>
      </div>
    );
  }

  const hasBoth = stats.officialQs.length > 0 && stats.regularQs.length > 0;

  return (
    <div className="space-y-5">
      {/* Section 1: Key Facts */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-black text-foreground mb-1">📋 الحقائق الأساسية</h2>
        <p className="text-[10px] text-muted-foreground mb-4">أرقام مستخرجة مباشرة من الامتحانات المحللة — بدون تهويل.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FactCard label="امتحانات رسمية" value={stats.officialExams.length} sub={`${stats.officialQs.length} سؤال`} />
          <FactCard label="فروض واختبارات" value={stats.regularExams.length} sub={`${stats.regularQs.length} سؤال`} />
          <FactCard label="معدل النقاط/سؤال (رسمي)" value={stats.officialPts.avg} sub={`${stats.officialPts.min}–${stats.officialPts.max} نقاط`} />
          <FactCard label="تطابق الأنماط" value={`${stats.paramOverlapPct}%`} sub={`${stats.commonParams.length} نمط مشترك`} />
        </div>
      </div>

      {/* Section 2: Bloom Taxonomy Comparison */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-black text-foreground mb-1">🧠 التوزيع المعرفي (تصنيف بلوم)</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          ما نوع التفكير المطلوب فعلياً؟ هل الامتحان يطلب حفظ أم تحليل؟
        </p>

        <div className={`grid ${hasBoth ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
          {stats.officialQs.length > 0 && (
            <BloomChart title="الامتحانات الرسمية" bloom={stats.officialBloom} total={stats.officialQs.length} />
          )}
          {stats.regularQs.length > 0 && (
            <BloomChart title="الفروض والاختبارات" bloom={stats.regularBloom} total={stats.regularQs.length} />
          )}
        </div>

        {hasBoth && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs">
            <p className="font-bold text-foreground mb-1">📌 ماذا يعني هذا عملياً؟</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside text-[11px]">
              {stats.officialBloom[4]?.pct > stats.regularBloom[4]?.pct + 10 && (
                <li>الامتحان الرسمي يطلب <strong>تحليل</strong> أكثر من الفروض — تدرّب على ربط المعطيات ببعضها.</li>
              )}
              {stats.officialBloom[3]?.pct > 40 && (
                <li>أغلب الأسئلة الرسمية تتطلب <strong>تطبيق</strong> مباشر — الحفظ وحده لا يكفي.</li>
              )}
              {stats.officialBloom[1]?.pct < 15 && (
                <li>نسبة أسئلة <strong>التذكر المباشر</strong> ضئيلة — لا تضيع وقتك في الحفظ فقط.</li>
              )}
              <li>ركّز على المستويات الأعلى: التطبيق ({stats.officialBloom[3]?.pct}%) والتحليل ({stats.officialBloom[4]?.pct}%).</li>
            </ul>
          </div>
        )}
      </div>

      {/* Section 3: Difficulty Reality Check */}
      {hasBoth && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-black text-foreground mb-1">📊 مقارنة الصعوبة الفعلية</h2>
          <p className="text-[10px] text-muted-foreground mb-4">أرقام حقيقية — ليست انطباعات.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiffCard title="🎓 رسمي" diff={stats.officialDiff} count={stats.officialQs.length} />
            <DiffCard title="📝 فروض" diff={stats.regularDiff} count={stats.regularQs.length} />
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            {(() => {
              const diffGap = Math.abs(stats.officialDiff.hard - stats.regularDiff.hard);
              if (diffGap <= 10) return (
                <p className="text-xs font-bold text-foreground">
                  ✅ الفارق في نسبة الأسئلة الصعبة بين الرسمي والفروض = <strong>{diffGap}%</strong> فقط. 
                  الامتحان الرسمي ليس أصعب بكثير مما تتدرب عليه.
                </p>
              );
              return (
                <p className="text-xs font-bold text-foreground">
                  ⚠️ الفارق = <strong>{diffGap}%</strong>. 
                  {stats.officialDiff.hard > stats.regularDiff.hard 
                    ? "الامتحان الرسمي يحتوي على أسئلة صعبة أكثر — زِد من تدريبك على المسائل المدمجة."
                    : "فروضك أصعب من الرسمي فعلياً — هذا إيجابي!"}
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* Section 4: What Actually Repeats */}
      {stats.topConcepts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-black text-foreground mb-1">🔄 المفاهيم الأكثر تكراراً في الامتحانات الرسمية</h2>
          <p className="text-[10px] text-muted-foreground mb-4">هذه المفاهيم ظهرت فعلاً في الامتحانات — ركّز عليها.</p>

          <div className="space-y-2">
            {stats.topConcepts.map(([concept, count], i) => {
              const pct = Math.round((count / Math.max(stats.officialQs.length, 1)) * 100);
              return (
                <div key={concept} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded text-[9px] font-black flex items-center justify-center bg-primary/10 text-primary shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="font-bold text-foreground">{concept}</span>
                      <span className="font-black text-muted-foreground">{count}× ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }} className="h-full rounded-full bg-primary/60" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 5: Gap Alert — Patterns you haven't practiced */}
      {stats.surpriseParams.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="text-sm font-black text-foreground mb-1">⚠️ أنماط في الرسمي لم تتدرب عليها</h2>
          <p className="text-[10px] text-muted-foreground mb-3">
            هذه الأنماط موجودة في الامتحانات الرسمية لكن غائبة تماماً من فروضك. هذا يعني احتمال مفاجأة.
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.surpriseParams.map(p => (
              <span key={p} className="text-[10px] px-2.5 py-1 rounded-lg font-bold border border-destructive/30 text-destructive bg-destructive/5">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Year-over-Year Trend */}
      {stats.yearlyData.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-black text-foreground mb-1">📈 تطور الصعوبة عبر السنوات</h2>
          <p className="text-[10px] text-muted-foreground mb-4">هل الامتحان يزداد صعوبة فعلاً؟</p>

          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 min-w-fit" style={{ minHeight: 140 }}>
              {stats.yearlyData.map(d => (
                <div key={d.year} className="flex flex-col items-center gap-1" style={{ minWidth: 44 }}>
                  <div className="flex flex-col-reverse w-8 rounded-t overflow-hidden" style={{ height: 100 }}>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${d.diff.easy}%` }}
                      transition={{ duration: 0.5 }} className="bg-green-400/60" />
                    <motion.div initial={{ height: 0 }} animate={{ height: `${d.diff.medium}%` }}
                      transition={{ duration: 0.5, delay: 0.05 }} className="bg-yellow-400/60" />
                    <motion.div initial={{ height: 0 }} animate={{ height: `${d.diff.hard}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }} className="bg-destructive/50" />
                  </div>
                  <span className="text-[8px] font-black text-foreground">{d.year}</span>
                  <span className="text-[7px] text-muted-foreground">{d.qCount}س</span>
                  {d.isOfficial && <span className="text-[6px] px-1 rounded bg-primary/10 text-primary font-bold">رسمي</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400/60" /> سهل</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400/60" /> متوسط</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-destructive/50" /> صعب</span>
          </div>

          {(() => {
            const first = stats.yearlyData[0];
            const last = stats.yearlyData[stats.yearlyData.length - 1];
            const trend = (last?.diff.hard || 0) - (first?.diff.hard || 0);
            return (
              <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs font-bold text-foreground">
                {Math.abs(trend) <= 10
                  ? `📊 الصعوبة مستقرة تقريباً منذ ${first?.year} (تغيّر ${trend > 0 ? '+' : ''}${trend}% فقط).`
                  : trend > 0
                  ? `⬆️ نسبة الأسئلة الصعبة ارتفعت بـ ${trend}% منذ ${first?.year}.`
                  : `⬇️ نسبة الأسئلة الصعبة انخفضت بـ ${Math.abs(trend)}% منذ ${first?.year}.`}
              </div>
            );
          })()}
        </div>
      )}

      {/* Section 7: Summary — No hype */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-black text-foreground mb-3">🎯 الخلاصة العملية</h2>
        <ul className="space-y-2 text-xs text-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>الامتحان الرسمي يركز على <strong>التطبيق والتحليل</strong> (بلوم 3-4) أكثر من الحفظ المباشر.</span>
          </li>
          {hasBoth && Math.abs(stats.officialDiff.hard - stats.regularDiff.hard) <= 15 && (
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>صعوبة الامتحان الرسمي <strong>قريبة</strong> من صعوبة الفروض — الفارق ليس كبيراً كما يُتخيل.</span>
            </li>
          )}
          {stats.surpriseParams.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              <span>هناك <strong>{stats.surpriseParams.length} أنماط</strong> في الرسمي لم تتدرب عليها — ابدأ بها.</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>أفضل طريقة للتحضير: حل مواضيع سابقة كاملة بتوقيت + تحليل الأخطاء بعد كل محاولة.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// --- Sub-components ---

function FactCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className="text-xl font-black text-foreground">{value}</div>
      <div className="text-[10px] font-bold text-foreground mt-0.5">{label}</div>
      <div className="text-[9px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function BloomChart({ title, bloom, total }: { title: string; bloom: Record<number, { count: number; pct: number }>; total: number }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="text-[11px] font-black text-foreground mb-3">{title} <span className="text-muted-foreground font-bold">({total} سؤال)</span></h4>
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5, 6].map(level => {
          const data = bloom[level] || { count: 0, pct: 0 };
          const colors = ['bg-green-400', 'bg-emerald-400', 'bg-blue-400', 'bg-violet-400', 'bg-orange-400', 'bg-red-400'];
          return (
            <div key={level} className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-muted-foreground w-12 shrink-0 text-left">B{level} {BLOOM_LABELS[level]}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${data.pct}%` }}
                  transition={{ duration: 0.6, delay: level * 0.05 }}
                  className={`h-full rounded-full ${colors[level - 1]}`} />
              </div>
              <span className="text-[9px] font-black text-foreground w-8 text-right">{data.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiffCard({ title, diff, count }: { title: string; diff: { easy: number; medium: number; hard: number }; count: number }) {
  const items = [
    { label: "سهل", pct: diff.easy, cls: "bg-green-400" },
    { label: "متوسط", pct: diff.medium, cls: "bg-yellow-400" },
    { label: "صعب", pct: diff.hard, cls: "bg-destructive" },
  ];
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="text-[11px] font-black text-foreground mb-0.5">{title}</h4>
      <p className="text-[9px] text-muted-foreground mb-3">{count} سؤال</p>
      <div className="space-y-1.5">
        {items.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground w-10 shrink-0">{b.label}</span>
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct}%` }}
                transition={{ duration: 0.6 }} className={`h-full rounded-full ${b.cls}`} />
            </div>
            <span className="text-[9px] font-black text-foreground w-8 text-right">{b.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
