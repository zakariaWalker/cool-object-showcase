import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseRenderer } from "@/components/ExerciseRenderer";
import { StudentAnswerEditor } from "@/components/StudentAnswerEditor";
import { recordExerciseCompletion, XPEvent, Badge } from "@/engine/gamification";
import { XPPopup, BadgeUnlockOverlay } from "@/components/GamificationDashboard";
import { AnimatePresence } from "framer-motion";

interface Exercise {
  id: string; text: string; type: string; grade: string; chapter: string;
}
interface Pattern {
  id: string; name: string; type: string; steps: string[]; concepts: string[];
}
interface Deconstruction {
  exercise_id: string; pattern_id: string; needs: string[]; steps: string[];
}

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};

const QUIZ_SIZE = 8; // questions per round

type QuizState = "setup" | "quiz" | "results";

interface QuizQuestion {
  exercise: Exercise;
  decon: Deconstruction;
  pattern: Pattern | undefined;
}

interface QuizAnswer {
  questionIndex: number;
  exerciseId: string;
  correct: boolean;
}

export default function GapDetector() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [deconstructions, setDeconstructions] = useState<Deconstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [gradeFilter, setGradeFilter] = useState(profile?.grade || "");
  
  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [roundHistory, setRoundHistory] = useState<QuizAnswer[][]>([]);
  
  // Track already-used exercise IDs across rounds
  const [usedExerciseIds, setUsedExerciseIds] = useState<Set<string>>(new Set());
  
  // Gamification state
  const [xpEvents, setXpEvents] = useState<XPEvent[]>([]);
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const PAGE = 1000;
    const allEx: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await (supabase as any).from("kb_exercises").select("*").order("grade").range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allEx.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const allDecon: any[] = [];
    from = 0;
    while (true) {
      const { data } = await (supabase as any).from("kb_deconstructions").select("*").range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allDecon.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const { data: pats } = await (supabase as any).from("kb_patterns").select("*");

    setExercises(allEx.map((e: any) => ({ id: e.id, text: e.text, type: e.type || "", grade: e.grade || "", chapter: e.chapter || "" })));
    setPatterns((pats || []).map((p: any) => ({ id: p.id, name: p.name, type: p.type || "", steps: p.steps || [], concepts: p.concepts || [] })));
    setDeconstructions(allDecon.map((d: any) => ({ exercise_id: d.exercise_id, pattern_id: d.pattern_id, needs: d.needs || [], steps: d.steps || [] })));
    setLoading(false);
  }

  // Get exercises that have deconstructions
  const availableExercises = useMemo(() => {
    const deconIds = new Set(deconstructions.map(d => d.exercise_id));
    return exercises.filter(e => deconIds.has(e.id) && (!gradeFilter || e.grade === gradeFilter));
  }, [exercises, deconstructions, gradeFilter]);

  // Generate a dynamic quiz round
  const generateQuiz = useCallback((weakConcepts?: Set<string>) => {
    let pool = availableExercises.filter(e => !usedExerciseIds.has(e.id));
    
    // If we have weak concepts from previous round, prioritize exercises that target them
    let prioritized: Exercise[] = [];
    let rest: Exercise[] = [];
    
    if (weakConcepts && weakConcepts.size > 0) {
      pool.forEach(e => {
        const decons = deconstructions.filter(d => d.exercise_id === e.id);
        const targets = decons.some(d => (d.needs || []).some(n => weakConcepts.has(n)));
        if (targets) prioritized.push(e); else rest.push(e);
      });
    } else {
      // First round: distribute across different patterns/types
      rest = pool;
    }

    // Shuffle
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    // Pick: prioritize weak-concept exercises, fill rest randomly
    const selected = [
      ...shuffle(prioritized).slice(0, Math.ceil(QUIZ_SIZE * 0.6)),
      ...shuffle(rest),
    ].slice(0, QUIZ_SIZE);

    // If not enough, just take what we have
    const finalSelection = selected.length > 0 ? selected : shuffle(pool).slice(0, QUIZ_SIZE);

    const questions: QuizQuestion[] = finalSelection.map(exercise => {
      const decon = deconstructions.find(d => d.exercise_id === exercise.id)!;
      const pattern = patterns.find(p => p.id === decon.pattern_id);
      return { exercise, decon, pattern };
    });

    // Mark as used
    setUsedExerciseIds(prev => {
      const next = new Set(prev);
      questions.forEach(q => next.add(q.exercise.id));
      return next;
    });

    setQuizQuestions(questions);
    setCurrentQ(0);
    setAnswers([]);
    setShowSolution(false);
    setQuizState("quiz");
  }, [availableExercises, deconstructions, patterns, usedExerciseIds]);

  const startQuiz = () => {
    setUsedExerciseIds(new Set());
    setRoundHistory([]);
    generateQuiz();
  };

  const answerQuestion = async (correct: boolean) => {
    const q = quizQuestions[currentQ];
    const newAnswer: QuizAnswer = {
      questionIndex: currentQ,
      exerciseId: q.exercise.id,
      correct,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    setShowSolution(true);
    
    // Record XP
    try {
      const { events, newBadges } = await recordExerciseCompletion(correct, q.decon?.pattern_id);
      if (events.length > 0) setXpEvents(events);
      if (newBadges.length > 0) setUnlockedBadge(newBadges[0]);
    } catch (e) { console.warn("[gamification]", e); }
  };

  const nextQuestion = () => {
    setShowSolution(false);
    if (currentQ + 1 < quizQuestions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      // Round complete
      setRoundHistory(prev => [...prev, answers]);
      setQuizState("results");
    }
  };

  // Compute analysis from all rounds
  const analysis = useMemo(() => {
    const allAnswers = [...roundHistory.flat(), ...(quizState === "results" ? answers : [])];
    if (allAnswers.length === 0) return null;

    const failed = allAnswers.filter(a => !a.correct);
    const conceptCount = new Map<string, { count: number; exercises: string[] }>();
    const patternCount = new Map<string, number>();

    failed.forEach(a => {
      const decons = deconstructions.filter(d => d.exercise_id === a.exerciseId);
      decons.forEach(d => {
        patternCount.set(d.pattern_id, (patternCount.get(d.pattern_id) || 0) + 1);
        (d.needs || []).forEach((need: string) => {
          const entry = conceptCount.get(need) || { count: 0, exercises: [] };
          entry.count++;
          entry.exercises.push(a.exerciseId);
          conceptCount.set(need, entry);
        });
      });
    });

    const gaps = [...conceptCount.entries()]
      .map(([concept, data]) => ({ concept, ...data }))
      .sort((a, b) => b.count - a.count);

    const weakPatterns = [...patternCount.entries()]
      .map(([pid, failCount]) => ({ pattern: patterns.find(p => p.id === pid)!, failCount }))
      .filter(w => w.pattern)
      .sort((a, b) => b.failCount - a.failCount);

    const total = allAnswers.length;
    const correctCount = allAnswers.filter(a => a.correct).length;
    const score = Math.round((correctCount / total) * 100);
    const level = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : score >= 40 ? "متوسط" : "ضعيف";

    return { gaps, weakPatterns, total, correctCount, failedCount: failed.length, score, level };
  }, [roundHistory, answers, quizState, deconstructions, patterns]);

  // Get weak concepts for adaptive next round
  const weakConcepts = useMemo(() => {
    if (!analysis) return new Set<string>();
    return new Set(analysis.gaps.slice(0, 5).map(g => g.concept));
  }, [analysis]);

  const continueAdaptive = () => {
    generateQuiz(weakConcepts);
  };

  const canContinue = useMemo(() => {
    return availableExercises.filter(e => !usedExerciseIds.has(e.id)).length >= 3;
  }, [availableExercises, usedExerciseIds]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">جاري تحميل قاعدة المعرفة...</p>
        </div>
      </div>
    );
  }

  // ─── Setup Screen ──────────────────────────────────
  if (quizState === "setup") {
    return (
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        <div className="border-b border-border px-6 py-8" style={{ background: "linear-gradient(to left, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03), hsl(var(--background)))" }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🔍</span>
              <h1 className="text-2xl font-black text-foreground">التقييم التشخيصي</h1>
            </div>
            <p className="text-muted-foreground text-sm">تقييم تكيّفي يحدد ثغراتك بدقة — كل جولة تتكيف مع نقاط ضعفك</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          <div className="flex flex-col items-center justify-center py-16 space-y-8">
            <div className="text-7xl">🧪</div>
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-xl font-bold text-foreground">ابدأ التقييم التشخيصي</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                سنعرض عليك {QUIZ_SIZE} تمارين عشوائية. أجب على كل تمرين (صحيح/خطأ)، 
                ثم نحلل ثغراتك ونقترح جولة تكيّفية تركّز على نقاط ضعفك.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">اختر المستوى</label>
                <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm">
                  <option value="">كل المستويات</option>
                  {Object.entries(GRADE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                {availableExercises.length} تمرين متاح للتقييم
              </div>

              <button onClick={startQuiz} disabled={availableExercises.length < 3}
                className="w-full py-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all disabled:opacity-50 shadow-lg">
                🚀 ابدأ التقييم
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz Screen ───────────────────────────────────
  if (quizState === "quiz" && quizQuestions.length > 0) {
    const q = quizQuestions[currentQ];
    const progress = ((currentQ + (showSolution ? 1 : 0)) / quizQuestions.length) * 100;
    const roundNum = roundHistory.length + 1;

    return (
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        {/* Top bar */}
        <div className="bg-card border-b border-border px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                الجولة {roundNum}
              </span>
              <span className="text-sm font-bold text-foreground">
                السؤال {currentQ + 1} / {quizQuestions.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>✅ {answers.filter(a => a.correct).length}</span>
              <span>❌ {answers.filter(a => !a.correct).length}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="max-w-3xl mx-auto mt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          {/* Exercise card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] px-2 py-1 rounded-full bg-accent text-accent-foreground font-bold">
                {GRADE_LABELS[q.exercise.grade] || q.exercise.grade}
              </span>
              {q.pattern && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                  {q.pattern.name}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{q.exercise.type}</span>
            </div>

            <div className="text-base leading-relaxed text-foreground mb-6">
              <ExerciseRenderer text={q.exercise.text} />
            </div>

            {/* Answer with editor or self-assessment */}
            {!showSolution && (
              <div className="space-y-4">
                {/* Student editor */}
                <StudentAnswerEditor
                  exerciseType={q.exercise.type}
                  exerciseText={q.exercise.text}
                  onSubmitAlgebra={(steps) => {
                    // Student submitted algebra steps — mark as attempted
                    answerQuestion(true);
                  }}
                  onSubmitGeometry={(data) => {
                    // Student submitted geometry — mark as attempted
                    answerQuestion(true);
                  }}
                />
                {/* Self-assessment fallback */}
                <div className="flex gap-3">
                  <button onClick={() => answerQuestion(true)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-all">
                    ✅ حللته بنجاح
                  </button>
                  <button onClick={() => answerQuestion(false)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold border-2 border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-all">
                    ❌ لم أتمكن
                  </button>
                </div>
              </div>
            )}

            {/* Solution reveal */}
            {showSolution && (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${answers[answers.length - 1]?.correct ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="text-sm font-bold mb-2">
                    {answers[answers.length - 1]?.correct ? "✅ أحسنت!" : "❌ لا بأس، إليك خطوات الحل:"}
                  </div>
                  
                  {q.decon.steps && q.decon.steps.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {q.decon.steps.map((step: any, i: number) => {
                        const stepText = typeof step === "string" ? step : (step.action || step.description || JSON.stringify(step));
                        return (
                          <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span>{stepText}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.decon.needs && q.decon.needs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-muted-foreground">المتطلبات:</span>
                      {q.decon.needs.map((n: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{n}</span>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={nextQuestion}
                  className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all">
                  {currentQ + 1 < quizQuestions.length ? "⬅ السؤال التالي" : "📊 عرض النتائج"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Results Screen ────────────────────────────────
  if (quizState === "results" && analysis) {
    return (
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        <div className="border-b border-border px-6 py-6" style={{ background: "linear-gradient(to left, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03), hsl(var(--background)))" }}>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">📊 نتائج التقييم التشخيصي</h1>
            <p className="text-xs text-muted-foreground mt-1">الجولة {roundHistory.length} • {analysis.total} سؤال</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Score cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-3xl font-black" style={{
                color: analysis.score >= 80 ? "hsl(var(--primary))" : analysis.score >= 60 ? "#22C55E" : analysis.score >= 40 ? "#F59E0B" : "hsl(var(--destructive))"
              }}>{analysis.score}%</div>
              <div className="text-[10px] text-muted-foreground mt-1">النتيجة</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-3xl font-black text-foreground">{analysis.level}</div>
              <div className="text-[10px] text-muted-foreground mt-1">المستوى</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-3xl font-black text-primary">{analysis.correctCount}</div>
              <div className="text-[10px] text-muted-foreground mt-1">صحيح</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-3xl font-black text-destructive">{analysis.failedCount}</div>
              <div className="text-[10px] text-muted-foreground mt-1">خطأ</div>
            </div>
          </div>

          {/* Gaps */}
          {analysis.gaps.length > 0 && (
            <div className="p-5 rounded-xl border border-destructive/20 bg-destructive/5">
              <h3 className="text-sm font-bold text-destructive mb-3">🎯 المفاهيم الغائبة</h3>
              <div className="space-y-2">
                {analysis.gaps.slice(0, 8).map((gap, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-foreground">{gap.concept}</div>
                      <div className="text-[10px] text-muted-foreground">ظهر في {gap.count} تمرين</div>
                    </div>
                    <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-destructive rounded-full" style={{ width: `${Math.min(100, (gap.count / Math.max(1, analysis.failedCount)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak patterns */}
          {analysis.weakPatterns.length > 0 && (
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="text-sm font-bold text-foreground mb-3">🧩 الأنماط الضعيفة</h3>
              <div className="grid grid-cols-2 gap-3">
                {analysis.weakPatterns.slice(0, 6).map((wp, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="text-xs font-bold text-foreground mb-1">{wp.pattern.name}</div>
                    <div className="text-[10px] text-muted-foreground">{wp.pattern.type} • فشل {wp.failCount} مرة</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {canContinue && analysis.failedCount > 0 && (
              <button onClick={continueAdaptive}
                className="flex-1 py-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg">
                🔄 جولة تكيّفية (تركّز على ثغراتك)
              </button>
            )}
            <button onClick={() => { setQuizState("setup"); setUsedExerciseIds(new Set()); setRoundHistory([]); }}
              className="flex-1 py-4 rounded-xl text-sm font-bold border border-border bg-card text-foreground hover:bg-accent transition-all">
              🔁 تقييم جديد
            </button>
          </div>

          {!canContinue && analysis.failedCount > 0 && (
            <div className="text-center text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
              لا توجد تمارين إضافية كافية لجولة تكيّفية — جرّب تقييم جديد
            </div>
          )}

          {analysis.failedCount === 0 && (
            <div className="text-center p-6 rounded-xl bg-primary/5 border border-primary/20">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-sm font-bold text-primary">ممتاز! لم تخطئ في أي تمرين</div>
              <div className="text-xs text-muted-foreground mt-1">جرّب مستوى أعلى للتحدي</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {null}
      {/* XP Popup */}
      <AnimatePresence>
        {xpEvents.length > 0 && (
          <XPPopup events={xpEvents} onDone={() => setXpEvents([])} />
        )}
      </AnimatePresence>
      {/* Badge unlock */}
      <AnimatePresence>
        {unlockedBadge && (
          <BadgeUnlockOverlay badge={unlockedBadge} onDone={() => setUnlockedBadge(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// NavBar removed — AppShell provides global navigation
