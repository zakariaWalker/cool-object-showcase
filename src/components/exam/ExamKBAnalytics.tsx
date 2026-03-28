// ===== Exam KB Analytics — Real data-driven analysis with scoring breakdown =====
import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TYPE_LABELS_AR } from "@/engine/exam-types";
import { Pattern } from "@/components/admin/useAdminKBStore";
import { COGNITIVE_LABELS_AR, detectScoringParams, computeBaseScore, categorizeForExam, computeExerciseBenchmark, compareToBenchmark, type ExerciseScoringParams, type CognitiveLevel } from "@/engine/exercise-scoring";
import { analyzeUploadedExam, buildBlueprint, PROGRESSION_LABELS_AR } from "@/engine/exam-enhancer";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  store: ReturnType<typeof import("./useExamKBStore").useExamKBStore>;
  primaryPatterns: Pattern[];
}

export function ExamKBAnalytics({ store, primaryPatterns }: Props) {
  const { analysis, questions, exams } = store;
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [benchmarkFormat, setBenchmarkFormat] = useState<"official" | "regular">("official");

  // Load extracted questions from DB for real analysis
  useEffect(() => {
    async function loadExtracted() {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("exam_extracted_questions")
        .select("*, exam_uploads!inner(grade, format, year, session)")
        .order("created_at", { ascending: false });
      if (data) setExtractedQuestions(data);
      setLoading(false);
    }
    loadExtracted();
  }, []);

  // Compute scoring analysis for each question
  const scoringAnalysis = useMemo(() => {
    const allQuestions = [
      ...questions.map(q => ({
        text: q.text,
        section_label: q.sectionLabel,
        points: q.points,
        type: q.type,
        difficulty: q.difficulty,
        concepts: q.concepts,
        source: "manual" as const,
      })),
      ...extractedQuestions.map((q: any) => ({
        text: q.text,
        section_label: q.section_label,
        points: q.points || 0,
        type: q.type || "unclassified",
        difficulty: q.difficulty || "medium",
        concepts: q.concepts || [],
        source: "extracted" as const,
      })),
    ];

    return allQuestions.map(q => {
      const params = detectScoringParams(q.text, q.type);
      const fullParams: ExerciseScoringParams = {
        difficulty: params.difficulty || 2,
        cognitiveLevel: (params.cognitiveLevel || "apply") as CognitiveLevel,
        bloomLevel: 3,
        conceptCount: params.conceptCount || 1,
        stepCount: params.stepCount || 2,
        estimatedTimeMin: params.estimatedTimeMin || 5,
        hasSubQuestions: params.hasSubQuestions || false,
        requiresProof: params.requiresProof || false,
        requiresGraph: params.requiresGraph || false,
        requiresConstruction: params.requiresConstruction || false,
        domain: q.type,
        subdomain: "",
      };
      const baseScore = computeBaseScore(fullParams);
      const category = categorizeForExam(fullParams);
      
      // Calculate benchmark match
      const benchmark = computeExerciseBenchmark(q.type, benchmarkFormat, extractedQuestions, exams);
      const { similarity, gaps } = compareToBenchmark(fullParams, benchmark);

      return { ...q, params: fullParams, baseScore, category, similarity, gaps };
    });
  }, [questions, extractedQuestions, benchmarkFormat, exams]);

  // Build blueprint from all data
  const blueprint = useMemo(() => {
    if (scoringAnalysis.length === 0) return null;
    const uploadAnalyses = exams.map(exam => {
      const examQs = questions
        .filter(q => q.examId === exam.id)
        .map(q => ({
          text: q.text,
          section_label: q.sectionLabel,
          points: q.points,
          type: q.type,
          difficulty: q.difficulty,
          concepts: q.concepts,
        }));
      return analyzeUploadedExam(examQs, exam.grade, exam.format, exam.id);
    }).filter(a => a.sections.length > 0);

    if (uploadAnalyses.length === 0) return null;
    const format = exams[0]?.format === "bac" ? "bac" : exams[0]?.format === "bem" ? "bem" : "regular";
    return buildBlueprint(uploadAnalyses, format, exams[0]?.grade || "");
  }, [exams, questions, scoringAnalysis]);

  const totalQuestions = scoringAnalysis.length;

  if (totalQuestions === 0 && !loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-black text-foreground">لا توجد بيانات للتحليل</h2>
        <p className="text-sm mt-1">استورد امتحانات سابقة أو ارفع ملفات PDF أولاً</p>
      </div>
    );
  }

  const sortedParams = Object.entries(analysis.kbPatternFrequency || {})
    .sort((a, b) => b[1].count - a[1].count);

  const years = [...new Set(exams.map(e => e.year))].sort();

  // Cognitive level distribution
  const cognitiveDistrib: Record<string, number> = {};
  scoringAnalysis.forEach(q => {
    const level = q.params.cognitiveLevel || "apply";
    cognitiveDistrib[level] = (cognitiveDistrib[level] || 0) + 1;
  });

  // Category distribution
  const categoryDistrib: Record<string, number> = {};
  scoringAnalysis.forEach(q => {
    categoryDistrib[q.category.section] = (categoryDistrib[q.category.section] || 0) + 1;
  });
  const categoryLabels: Record<string, string> = {
    warmup: "🟢 تمهيدي",
    core: "🔵 أساسي",
    challenge: "🟠 متقدم",
    problem: "🔴 مسألة",
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-4 text-muted-foreground text-sm">جاري تحميل البيانات...</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KPI icon="📝" label="أسئلة" value={totalQuestions} color="hsl(var(--primary))" />
        <KPI icon="📚" label="امتحانات" value={exams.length} color="hsl(var(--algebra))" />
        <KPI icon="📅" label="سنوات" value={years.length} color="hsl(var(--geometry))" />
        <KPI icon="✅" label="مرتبطة بـ KB" value={questions.filter(q => q.linkedPatternIds.length > 0).length} color="hsl(var(--statistics))" />
        <KPI icon="🔍" label="PDF مستخرجة" value={extractedQuestions.length} color="hsl(var(--functions))" />
        <KPI icon="⚠️" label="ثغرات" value={analysis.kbCoverage.gaps.length} color="hsl(var(--destructive))" />
      </div>

      {/* Blueprint Summary */}
      {blueprint && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          <h3 className="text-sm font-black text-foreground mb-3">🏗️ بصمة الامتحان المُستنتجة (من {blueprint.extractedFromCount} امتحان)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-black text-primary">{blueprint.totalPoints}</div>
              <div className="text-[10px] text-muted-foreground">مجموع النقاط</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-primary">{blueprint.sectionStructure.length}</div>
              <div className="text-[10px] text-muted-foreground">أقسام</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-primary">{blueprint.averageExercisePoints}</div>
              <div className="text-[10px] text-muted-foreground">معدل نقاط/تمرين</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-primary">{PROGRESSION_LABELS_AR[blueprint.progressionStyle]}</div>
              <div className="text-[10px] text-muted-foreground">أسلوب التدرج</div>
            </div>
          </div>
          {/* Topic distribution bar */}
          <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
            {Object.entries(blueprint.topicDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([topic, pct], i) => {
                const colors = ["hsl(var(--algebra))", "hsl(var(--geometry))", "hsl(var(--statistics))", "hsl(var(--probability))", "hsl(var(--functions))", "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))"];
                return (
                  <div key={topic} className="h-full relative group" style={{ width: `${pct}%`, background: colors[i % colors.length], minWidth: "4px" }}>
                    <div className="absolute -top-8 right-0 hidden group-hover:block text-[8px] bg-foreground text-background px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {TYPE_LABELS_AR[topic] || topic}: {pct}%
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(blueprint.topicDistribution).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([topic, pct]) => (
              <span key={topic} className="text-[9px] text-muted-foreground">{TYPE_LABELS_AR[topic] || topic}: {pct}%</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cognitive Level Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🧠 توزيع المستويات المعرفية (Bloom)</h3>
          <div className="space-y-2">
            {(["remember", "understand", "apply", "analyze", "evaluate", "create"] as CognitiveLevel[]).map(level => {
              const count = cognitiveDistrib[level] || 0;
              const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-foreground">{COGNITIVE_LABELS_AR[level]}</span>
                    <span className="text-[10px] font-bold text-primary">{count} ({pct}%)</span>
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

        {/* Exercise Category Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">📊 تصنيف التمارين للامتحان</h3>
          <div className="space-y-3">
            {(["warmup", "core", "challenge", "problem"] as const).map(cat => {
              const count = categoryDistrib[cat] || 0;
              const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-foreground w-24">{categoryLabels[cat]}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: cat === "warmup" ? "hsl(var(--geometry))" : cat === "core" ? "hsl(var(--primary))" : cat === "challenge" ? "hsl(var(--statistics))" : "hsl(var(--destructive))" }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground w-12 text-left">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Topic Frequency */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">📊 تكرار أنماط KB في الامتحانات</h3>
          <div className="space-y-2">
            {sortedParams.map(([type, data]) => {
              const pct = Math.round((data.count / Math.max(totalQuestions, 1)) * 100);
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
            {sortedParams.length === 0 && (
              <p className="text-center py-4 text-muted-foreground text-xs">صنّف الأسئلة واربطها بأنماط KB</p>
            )}
          </div>
        </div>

        {/* Predictions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-black text-foreground mb-4">🔮 توقعات ظهور أنماط KB للامتحان القادم</h3>
          <div className="space-y-3">
            {(analysis.kbPatternPredictions || []).map((pred, i) => (
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
            {(analysis.kbPatternPredictions || []).length === 0 && (
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

      {/* Scoring Breakdown Table */}
      {scoringAnalysis.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 overflow-x-auto">
          <h3 className="text-sm font-black text-foreground mb-4">⚡ تفكيك تقييم التمارين (أول 20)</h3>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-right font-bold text-muted-foreground">التمرين</th>
                <th className="p-2 text-center font-bold text-muted-foreground">المستوى</th>
                <th className="p-2 text-center font-bold text-muted-foreground">الصعوبة</th>
                <th className="p-2 text-center font-bold text-muted-foreground">المفاهيم</th>
                <th className="p-2 text-center font-bold text-muted-foreground">الخطوات</th>
                <th className="p-2 text-center font-bold text-muted-foreground">النقاط</th>
                <th className="p-2 text-center font-bold text-muted-foreground">التصنيف</th>
                <th className="p-2 text-center font-bold text-muted-foreground">
                  <button 
                    onClick={() => setBenchmarkFormat(f => f === "official" ? "regular" : "official")}
                    className="underline decoration-dotted"
                  >
                    مطابقة {benchmarkFormat === "official" ? "الرسمي" : "العادي"}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {scoringAnalysis.slice(0, 20).map((q, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 group">
                  <td className="p-2 text-right text-foreground max-w-[200px] truncate">
                    {q.text.slice(0, 60)}...
                    {q.gaps && q.gaps.length > 0 && (
                      <div className="hidden group-hover:block text-[8px] text-destructive mt-1">
                        ⚠️ {q.gaps.join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {COGNITIVE_LABELS_AR[q.params.cognitiveLevel as CognitiveLevel] || q.params.cognitiveLevel}
                    </span>
                  </td>
                  <td className="p-2 text-center font-bold">{q.params.difficulty}/5</td>
                  <td className="p-2 text-center">{q.params.conceptCount}</td>
                  <td className="p-2 text-center">{q.params.stepCount}</td>
                  <td className="p-2 text-center font-black text-primary">{q.baseScore}</td>
                  <td className="p-2 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background: q.category.section === "warmup" ? "hsl(var(--geometry) / 0.1)" :
                          q.category.section === "core" ? "hsl(var(--primary) / 0.1)" :
                          q.category.section === "challenge" ? "hsl(var(--statistics) / 0.1)" :
                          "hsl(var(--destructive) / 0.1)",
                        color: q.category.section === "warmup" ? "hsl(var(--geometry))" :
                          q.category.section === "core" ? "hsl(var(--primary))" :
                          q.category.section === "challenge" ? "hsl(var(--statistics))" :
                          "hsl(var(--destructive))",
                      }}>
                      {q.category.sectionLabelAr}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-black" style={{ color: q.similarity > 70 ? "hsl(var(--geometry))" : q.similarity > 40 ? "hsl(var(--statistics))" : "hsl(var(--destructive))" }}>
                        {q.similarity}%
                      </span>
                      <div className="w-12 h-1 bg-muted rounded-full mt-0.5">
                        <div className="h-full rounded-full" style={{ width: `${q.similarity}%`, background: q.similarity > 70 ? "hsl(var(--geometry))" : q.similarity > 40 ? "hsl(var(--statistics))" : "hsl(var(--destructive))" }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Year Trends Table */}
      {years.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5 overflow-x-auto">
          <h3 className="text-sm font-black text-foreground mb-4">📅 تطور أنماط KB عبر السنوات</h3>
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="p-2 text-right font-bold text-muted-foreground">النمط</th>
                {years.map(y => <th key={y} className="p-2 text-center font-bold text-muted-foreground">{y}</th>)}
                <th className="p-2 text-center font-bold text-foreground">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {sortedParams.map(([type, data]) => (
                <tr key={type} className="border-t border-border">
                  <td className="p-2 font-bold text-foreground">{type}</td>
                  {years.map(y => {
                    const count = (analysis.kbPatternYearTrends || {})[y]?.[type] || 0;
                    return (
                      <td key={y} className="p-2 text-center">
                        {count > 0 ? (
                          <span className="inline-flex w-6 h-6 rounded items-center justify-center text-[9px] font-bold text-primary-foreground"
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
