// ===== Exam KB Analytics — Topic frequency, trends, predictions, KB gaps =====
import { useMemo } from "react";
import { motion } from "framer-motion";
import { TYPE_LABELS_AR } from "@/engine/exam-types";
import { Pattern } from "@/components/admin/useAdminKBStore";

interface Props {
  store: ReturnType<typeof import("./useExamKBStore").useExamKBStore>;
  primaryPatterns: Pattern[];
}

export function ExamKBAnalytics({ store, primaryPatterns }: Props) {
  const { analysis, questions, exams } = store;

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-black text-foreground">لا توجد بيانات للتحليل</h2>
        <p className="text-sm mt-1">استورد امتحانات سابقة وصنّف أسئلتها أولاً</p>
      </div>
    );
  }

  const sortedParams = Object.entries(analysis.parameterFrequency)
    .sort((a, b) => b[1].count - a[1].count);

  const totalQuestions = questions.length;
  const years = [...new Set(exams.map(e => e.year))].sort();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI icon="📝" label="أسئلة" value={totalQuestions} color="hsl(var(--primary))" />
        <KPI icon="📚" label="امتحانات" value={exams.length} color="hsl(var(--algebra))" />
        <KPI icon="📅" label="سنوات" value={years.length} color="hsl(var(--geometry))" />
        <KPI icon="✅" label="مرتبطة بـ KB" value={questions.filter(q => q.linkedPatternIds.length > 0).length} color="hsl(var(--statistics))" />
        <KPI icon="⚠️" label="ثغرات" value={analysis.kbCoverage.gaps.length} color="hsl(var(--destructive))" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Topic Frequency */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">📊 تكرار الأنماط المعرفية في الامتحانات</h3>
          <div className="space-y-2">
            {sortedParams.map(([type, data]) => {
              const pct = Math.round((data.count / totalQuestions) * 100);
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-foreground">{type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">{data.count}× في {data.years.length} سنة</span>
                      <span className="text-[10px] font-bold text-primary">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-primary" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Predictions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🔮 توقعات البنية الذهنية للامتحان القادم</h3>
          <div className="space-y-3">
            {analysis.parameterPredictions.map((pred, i) => (
              <div key={pred.type} className="p-3 rounded-lg" style={{ background: "hsl(var(--primary) / 0.05)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                    <span className="text-xs font-bold text-foreground">{pred.type}</span>
                  </div>
                  <span className="text-sm font-black text-primary">{pred.probability}%</span>
                </div>
                <div className="text-[9px] text-muted-foreground mr-8">{pred.reasoning}</div>
              </div>
            ))}
            {analysis.parameterPredictions.length === 0 && (
              <p className="text-center py-4 text-muted-foreground text-xs">صنّف المزيد من الأسئلة لتحصل على توقعات</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Difficulty Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">📈 توزيع الصعوبة</h3>
          <div className="flex items-end justify-center gap-8 h-[150px]">
            {(["easy", "medium", "hard"] as const).map(d => {
              const count = analysis.difficultyDistribution[d] || 0;
              const pct = totalQuestions > 0 ? (count / totalQuestions) * 100 : 0;
              const colors = { easy: "hsl(var(--geometry))", medium: "hsl(var(--statistics))", hard: "hsl(var(--destructive))" };
              const labels = { easy: "سهل", medium: "متوسط", hard: "صعب" };
              return (
                <div key={d} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-black" style={{ color: colors[d] }}>{count}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(pct * 1.2, 8)}px` }}
                    transition={{ duration: 0.8 }}
                    className="w-12 rounded-t-lg" style={{ background: colors[d] }} />
                  <span className="text-[10px] font-bold text-muted-foreground">{labels[d]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* KB Coverage Gaps */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🔗 تغطية KB الأساسي</h3>
          <div className="space-y-3">
            {analysis.kbCoverage.covered.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-foreground mb-1.5" style={{ color: "hsl(var(--geometry))" }}>
                  ✅ مواضيع مغطاة ({analysis.kbCoverage.covered.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.kbCoverage.covered.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "hsl(var(--geometry) / 0.1)", color: "hsl(var(--geometry))" }}>
                      {TYPE_LABELS_AR[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.kbCoverage.gaps.length > 0 && (
              <div>
                <div className="text-[10px] font-bold mb-1.5" style={{ color: "hsl(var(--destructive))" }}>
                  ❌ ثغرات — مواضيع في الامتحانات غير مغطاة في KB ({analysis.kbCoverage.gaps.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.kbCoverage.gaps.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
                      {TYPE_LABELS_AR[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.kbCoverage.covered.length === 0 && analysis.kbCoverage.gaps.length === 0 && (
              <p className="text-center py-4 text-muted-foreground text-xs">صنّف الأسئلة أولاً لتحليل التغطية</p>
            )}
          </div>
        </div>
      </div>

      {/* Year Trends Table */}
      {years.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5 overflow-x-auto">
          <h3 className="text-sm font-black text-foreground mb-4">📅 تطور أنماط الجهد الذهني عبر السنوات</h3>
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="p-2 text-right font-bold text-muted-foreground">النمط المعرفي</th>
                {years.map(y => <th key={y} className="p-2 text-center font-bold text-muted-foreground">{y}</th>)}
                <th className="p-2 text-center font-bold text-foreground">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {sortedParams.map(([type, data]) => (
                <tr key={type} className="border-t border-border">
                  <td className="p-2 font-bold text-foreground">{type}</td>
                  {years.map(y => {
                    const count = analysis.parameterYearTrends[y]?.[type] || 0;
                    return (
                      <td key={y} className="p-2 text-center">
                        {count > 0 ? (
                          <span className="inline-block w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-primary-foreground"
                            style={{ background: `hsl(var(--primary) / ${Math.min(0.3 + count * 0.2, 1)})` }}>
                            {count}
                          </span>
                        ) : <span className="text-muted-foreground/30">—</span>}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-black text-primary">{data.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Concepts */}
      {Object.keys(analysis.conceptFrequency).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🧠 المفاهيم الأكثر تكراراً</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analysis.conceptFrequency)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 20)
              .map(([concept, count]) => (
                <span key={concept} className="text-[10px] px-3 py-1 rounded-full font-bold border border-border"
                  style={{ background: `hsl(var(--primary) / ${Math.min(0.05 + count * 0.05, 0.3)})` }}>
                  {concept} <span className="text-muted-foreground">({count})</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] font-bold text-foreground">{label}</div>
    </div>
  );
}
