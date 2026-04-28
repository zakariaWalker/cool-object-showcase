import { useState, useMemo, useEffect, useCallback } from "react";
import { useUserCurriculum } from "@/hooks/useUserCurriculum"; // FIX: was useAuth
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { StudentAnswerEditor } from "@/components/StudentAnswerEditor";
import { recordExerciseCompletion, XPEvent, Badge } from "@/engine/gamification";
import { XPPopup, BadgeUnlockOverlay } from "@/components/GamificationDashboard";
import { AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/funnelTracking";

interface Exercise {
  id: string;
  text: string;
  type: string;
  grade: string;
  chapter: string;
}
interface Pattern {
  id: string;
  name: string;
  type: string;
  steps: string[];
  concepts: string[];
}
interface Deconstruction {
  exercise_id: string;
  pattern_id: string;
  needs: string[];
  steps: string[];
}

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM",
  middle_2: "2AM",
  middle_3: "3AM",
  middle_4: "4AM",
  secondary_1: "1AS",
  secondary_2: "2AS",
  secondary_3: "3AS",
};

// FIX: reverse map from grade_code ("4AM") to kb_exercises.grade key ("middle_4")
const GRADE_CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(GRADE_LABELS).map(([k, v]) => [v, k]),
);

const QUIZ_SIZE = 8;

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

  // FIX: useUserCurriculum for grade_code, useAuth only for admin/teacher role checks
  const { gradeCode } = useUserCurriculum();
  const { isAdmin, isTeacher, user } = useAuth();
  const isAuthed = !!user;
  const FREE_GAPS_VISIBLE = 2;

  // The DB stores grade as the short code ("2AS"); use it directly.
  const [gradeFilter, setGradeFilter] = useState(gradeCode || "");

  // Sync gradeFilter when gradeCode loads async from Supabase
  useEffect(() => {
    if (gradeCode && !gradeFilter) {
      setGradeFilter(gradeCode);
    }
  }, [gradeCode, gradeFilter]);

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showSolution, setShowSolution] = useState(false);
  const [roundHistory, setRoundHistory] = useState<QuizAnswer[][]>([]);

  // Answer input + grading state
  const [answerText, setAnswerText] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [inputError, setInputError] = useState<string>("");

  const [usedExerciseIds, setUsedExerciseIds] = useState<Set<string>>(new Set());

  // Gamification state
  const [xpEvents, setXpEvents] = useState<XPEvent[]>([]);
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const PAGE = 1000;
    const { countryCode } = await (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { countryCode: "DZ" };
      const { data } = await (supabase as any)
        .from("profiles").select("country_code").eq("id", user.id).maybeSingle();
      return { countryCode: data?.country_code || "DZ" };
    })();

    const allEx: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("kb_exercises")
        .select("*")
        .eq("country_code", countryCode)
        .order("grade")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allEx.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const allDecon: any[] = [];
    from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("kb_deconstructions")
        .select("*")
        .eq("country_code", countryCode)
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allDecon.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const { data: pats } = await (supabase as any).from("kb_patterns").select("*");

    setExercises(
      allEx.map((e: any) => ({
        id: e.id,
        text: e.text,
        type: e.type || "",
        grade: e.grade || "",
        chapter: e.chapter || "",
      })),
    );
    setPatterns(
      (pats || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type || "",
        steps: p.steps || [],
        concepts: p.concepts || [],
      })),
    );
    setDeconstructions(
      allDecon.map((d: any) => ({
        exercise_id: d.exercise_id,
        pattern_id: d.pattern_id,
        needs: d.needs || [],
        steps: d.steps || [],
      })),
    );
    setLoading(false);
  }

  /** Detect exercises that reference a figure we can't auto-draw (no shape keyword + no table). */
  function isUnrenderable(text: string): boolean {
    if (!text) return true;
    const hasTable = /\|.*---/.test(text);
    const hasShapeKeyword = /(مثلث|مستطيل|مربع|دائرة|متوازي|شبه\s*منحرف|زاوية|triangle|rectangle|circle|carré|parallélogramme|ABC|ABCD)/i.test(text);
    const refsFigure = /\[(رسم|شكل|صورة|مخطط)[^\]]*\]/.test(text) || /(انظر|لاحظ).{0,20}(الشكل|الرسم|المخطط|الصورة)/.test(text);
    // Drop only when a figure is referenced AND we have neither a shape we can sketch nor an embedded table.
    if (refsFigure && !hasShapeKeyword && !hasTable) return true;
    return false;
  }

  /**
   * Convert flattened inline table data into a markdown table that MathExerciseRenderer
   * renders as an actual HTML table.
   */
  function normalizeFlatTable(text: string): string {
    const m = text.match(/الجدول\s+التالي\s*:?\s*((?:[\d٠-٩]+[\s,،|]+){4,}[\d٠-٩]+)/);
    if (!m) return text;
    const numStr = m[1].trim().replace(/[،|]/g, " ");
    const nums = numStr.split(/[\s,]+/).filter(Boolean);
    if (nums.length < 4 || nums.length % 2 !== 0) return text;
    const half = nums.length / 2;
    const row1 = nums.slice(0, half);
    const row2 = nums.slice(half);
    const header = "| " + row1.map((_, index) => `x${index + 1}`).join(" | ") + " |";
    const sep = "| " + row1.map(() => "---").join(" | ") + " |";
    const r1 = "| " + row1.join(" | ") + " |";
    const r2 = "| " + row2.join(" | ") + " |";
    return text.replace(m[0], `الجدول التالي:\n\n${header}\n${sep}\n${r1}\n${r2}\n`);
  }

  /** Strip dangling figure-reference markers when we can auto-render the shape. */
  function stripFigureRefs(text: string): string {
    return text
      .replace(/\[(رسم|شكل|صورة|مخطط)[^\]]*\]/g, "")
      .replace(/(انظر|لاحظ)\s+(إلى\s+)?(الشكل|الرسم|المخطط|الصورة)\s*(المقابل|التالي|أدناه)?\s*[:\.،]?/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  const availableExercises = useMemo(() => {
    const deconIds = new Set(deconstructions.map((d) => d.exercise_id));
    return exercises.filter(
      (e) => deconIds.has(e.id) && (!gradeFilter || e.grade === gradeFilter) && !isUnrenderable(e.text),
    );
  }, [exercises, deconstructions, gradeFilter]);

  const generateQuiz = useCallback(
    (weakConcepts?: Set<string>) => {
      let pool = availableExercises.filter((e) => !usedExerciseIds.has(e.id));

      let prioritized: Exercise[] = [];
      let rest: Exercise[] = [];

      if (weakConcepts && weakConcepts.size > 0) {
        pool.forEach((e) => {
          const decons = deconstructions.filter((d) => d.exercise_id === e.id);
          const isWeak = decons.some((d) => d.needs.some((n) => weakConcepts.has(n)));
          if (isWeak) prioritized.push(e);
          else rest.push(e);
        });
      } else {
        rest = pool;
      }

      const shuffled = [...prioritized.sort(() => Math.random() - 0.5), ...rest.sort(() => Math.random() - 0.5)].slice(
        0,
        QUIZ_SIZE,
      );

      const questions: QuizQuestion[] = shuffled.map((exercise) => {
        const decon = deconstructions.find((d) => d.exercise_id === exercise.id)!;
        const pattern = patterns.find((p) => p.id === decon.pattern_id);
        return { exercise, decon, pattern };
      });

      setQuizQuestions(questions);
      setCurrentQ(0);
      setAnswers([]);
      setShowSolution(false);
      setUsedExerciseIds((prev) => new Set([...prev, ...shuffled.map((e) => e.id)]));
      setQuizState("quiz");
    },
    [availableExercises, deconstructions, patterns, usedExerciseIds],
  );

  /** Normalize text for KB comparison: lowercase, strip diacritics/spaces/punctuation. */
  function normalize(s: string): string {
    return s
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "") // Arabic diacritics
      .replace(/\s+/g, "")
      .replace(/[.,;:!?'"()\[\]{}]/g, "")
      .trim();
  }

  /** Extract meaningful tokens (numbers, variables, math ops, Arabic/Latin words ≥3 chars). */
  function tokenize(s: string): string[] {
    const matches = s.match(/[\u0600-\u06FF]{3,}|[a-zA-Z]{3,}|\d+(?:[.,]\d+)?|[+\-*/=^√<>]|frac|sqrt/gi) || [];
    return matches.map((m) => m.toLowerCase());
  }

  /** Local sanity check — rejects empty / too-short / pure-gibberish answers. */
  function validateAnswerInput(raw: string): string | null {
    const t = raw.trim();
    if (!t) return "اكتب إجابتك أولاً";
    if (t.length < 2) return "الإجابة قصيرة جداً";
    const hasDigit = /\d/.test(t);
    const hasMathOp = /[+\-*/=^√()<>]|frac|sqrt/.test(t);
    const hasWord = /[\u0600-\u06FFa-zA-Z]{3,}/.test(t);
    if (!hasDigit && !hasMathOp && !hasWord) return "الإجابة غير مفهومة — استخدم أرقاماً أو رموزاً رياضية";
    if (/^(.)\1{3,}$/.test(t.replace(/\s/g, ""))) return "الإجابة تبدو عشوائية — حاول مجدداً";
    // Reject random keyboard mash: long string with no digits AND no real word
    if (t.length >= 4 && !hasDigit && !hasMathOp && !hasWord) {
      return "الإجابة تبدو عشوائية — حاول مجدداً";
    }
    return null;
  }

  /**
   * KB-based grading: compares student answer against the deconstruction steps + needs.
   * Returns { correct, feedback } using token overlap — no AI call.
   */
  function gradeAgainstKB(answer: string, decon: Deconstruction, pattern?: Pattern): { correct: boolean; feedback: string } {
    const normAnswer = normalize(answer);
    const ansTokens = new Set(tokenize(answer));

    // Build expected token bag from steps + needs + pattern steps/concepts
    const expectedSources: string[] = [];
    (decon.steps || []).forEach((s: any) => {
      const txt = typeof s === "string" ? s : s?.action || s?.description || s?.expression || JSON.stringify(s);
      if (txt) expectedSources.push(String(txt));
    });
    (decon.needs || []).forEach((n) => expectedSources.push(n));
    if (pattern) {
      (pattern.steps || []).forEach((s: any) => {
        const txt = typeof s === "string" ? s : s?.action || s?.description || JSON.stringify(s);
        if (txt) expectedSources.push(String(txt));
      });
      (pattern.concepts || []).forEach((c) => expectedSources.push(c));
    }

    const expectedTokens = new Set<string>();
    expectedSources.forEach((src) => tokenize(src).forEach((t) => expectedTokens.add(t)));

    // Direct match: answer normalized appears as substring of any expected source (or vice-versa)
    const directMatch = expectedSources.some((src) => {
      const n = normalize(src);
      return n.length >= 2 && (n.includes(normAnswer) || normAnswer.includes(n));
    });

    // Token overlap ratio
    let overlap = 0;
    ansTokens.forEach((t) => {
      if (expectedTokens.has(t)) overlap++;
    });
    const ratio = ansTokens.size === 0 ? 0 : overlap / ansTokens.size;
    const expectedCoverage = expectedTokens.size === 0 ? 0 : overlap / Math.min(expectedTokens.size, 5);

    const correct = directMatch || (overlap >= 2 && ratio >= 0.4) || expectedCoverage >= 0.6;

    let feedback = "";
    if (correct) {
      feedback = "إجابتك تتطابق مع الحل المرجعي ✓";
    } else if (overlap > 0) {
      feedback = `إجابتك تحتوي على ${overlap} عنصر صحيح لكن الحل ينقصه. راجع الخطوات.`;
    } else {
      feedback = "إجابتك بعيدة عن الحل المرجعي. راجع المتطلبات والخطوات.";
    }
    return { correct, feedback };
  }

  const submitAnswer = async () => {
    const err = validateAnswerInput(answerText);
    if (err) {
      setInputError(err);
      return;
    }
    setInputError("");
    setGrading(true);

    const q = quizQuestions[currentQ];
    // KB-first grading (no AI call)
    const { correct, feedback } = gradeAgainstKB(answerText, q.decon, q.pattern);

    const newAnswer: QuizAnswer = { questionIndex: currentQ, exerciseId: q.exercise.id, correct };
    setAnswers((prev) => [...prev, newAnswer]);
    setGradeFeedback(feedback);
    setShowSolution(true);
    setGrading(false);

    // Only award XP/badges for genuinely correct answers
    if (correct) {
      const { events, newBadges } = await recordExerciseCompletion(true, q.pattern?.id);
      if (events.length > 0) setXpEvents(events);
      if (newBadges.length > 0) setUnlockedBadge(newBadges[0]);
    } else {
      // Still log the wrong attempt for gap tracking, but no XP/badge popup
      await recordExerciseCompletion(false, q.pattern?.id);
    }
  };

  const nextQuestion = () => {
    setShowSolution(false);
    setAnswerText("");
    setGradeFeedback("");
    setInputError("");
    if (currentQ + 1 < quizQuestions.length) {
      setCurrentQ((prev) => prev + 1);
    } else {
      const allAnswers = [...answers];
      setRoundHistory((prev) => [...prev, allAnswers]);
      setQuizState("results");
      const correctCount = allAnswers.filter((a) => a.correct).length;
      trackEvent("diagnostic_completed", {
        total: allAnswers.length,
        correct: correctCount,
        score_pct: Math.round((correctCount / allAnswers.length) * 100),
        round: roundHistory.length + 1,
      });
    }
  };

  const analysis = useMemo(() => {
    if (quizState !== "results" || answers.length === 0) return null;
    const total = answers.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const failedCount = total - correctCount;
    const score = Math.round((correctCount / total) * 100);

    const level = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : score >= 40 ? "متوسط" : "يحتاج تحسين";

    const gapMap = new Map<string, { concept: string; count: number }>();
    answers
      .filter((a) => !a.correct)
      .forEach((a) => {
        const q = quizQuestions.find((q) => q.exercise.id === a.exerciseId);
        if (!q) return;
        const decon = deconstructions.find((d) => d.exercise_id === q.exercise.id);
        if (!decon) return;
        decon.needs.forEach((n) => {
          const existing = gapMap.get(n) || { concept: n, count: 0 };
          existing.count++;
          gapMap.set(n, existing);
        });
      });
    const gaps = [...gapMap.values()].sort((a, b) => b.count - a.count);

    const weakPatternMap = new Map<string, { pattern: Pattern; failCount: number }>();
    answers
      .filter((a) => !a.correct)
      .forEach((a) => {
        const q = quizQuestions.find((q) => q.exercise.id === a.exerciseId);
        if (!q?.pattern) return;
        const existing = weakPatternMap.get(q.pattern.id) || { pattern: q.pattern, failCount: 0 };
        existing.failCount++;
        weakPatternMap.set(q.pattern.id, existing);
      });
    const weakPatterns = [...weakPatternMap.values()].sort((a, b) => b.failCount - a.failCount);

    return { total, correctCount, failedCount, score, level, gaps, weakPatterns };
  }, [quizState, answers, quizQuestions, deconstructions]);

  const weakConceptsFromHistory = useMemo(() => {
    const set = new Set<string>();
    if (analysis?.gaps) {
      analysis.gaps.forEach((g) => set.add(g.concept));
    }
    return set;
  }, [analysis]);

  const canContinue = availableExercises.filter((e) => !usedExerciseIds.has(e.id)).length >= QUIZ_SIZE;
  const continueAdaptive = () => generateQuiz(weakConceptsFromHistory);

  /** Focused re-test: builds a mini-quiz that drills only ONE selected gap. */
  const retestSingleGap = useCallback(
    (concept: string) => {
      const focused = new Set<string>([concept]);
      generateQuiz(focused);
    },
    [generateQuiz],
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground text-sm">جاري تحميل قاعدة التمارين...</p>
        </div>
      </div>
    );
  }

  if (quizState === "setup") {
    return (
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        <div
          className="border-b border-border px-6 py-6"
          style={{
            background:
              "linear-gradient(to left, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03), hsl(var(--background)))",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">🔍 كاشف الثغرات</h1>
            <p className="text-xs text-muted-foreground mt-1">
              اختبار تكيّفي يكشف المفاهيم الغائبة ويركّز عليها جولة بعد جولة
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Grade selector — always visible for admin/teacher; for students shows their level pre-selected */}
          {(isAdmin || isTeacher || !gradeCode) && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGradeFilter("")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${!gradeFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                كل المستويات
              </button>
              {Object.entries(GRADE_LABELS).map(([legacyKey, label]) => (
                <button
                  key={label}
                  onClick={() => setGradeFilter(label)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${gradeFilter === label ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {gradeFilter && !isAdmin && !isTeacher && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-xs text-primary font-bold">المستوى المحدد: {gradeFilter}</span>
              <button
                onClick={() => setGradeFilter("")}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                (تغيير)
              </button>
            </div>
          )}

          <div className="p-6 rounded-2xl border border-border bg-card text-center space-y-4">
            <div className="text-5xl">🎯</div>
            <h2 className="text-xl font-black">
              {availableExercises.length} تمرين متاح
              {gradeFilter ? ` في ${gradeFilter}` : ""}
            </h2>
            <p className="text-sm text-muted-foreground">
              سيتم اختيار {Math.min(QUIZ_SIZE, availableExercises.length)} تمرين تلقائياً للتقييم. بعد كل جولة، يركّز
              النظام على الثغرات المكتشفة.
            </p>
            <button
              onClick={() => generateQuiz()}
              disabled={availableExercises.length < 1}
              className="w-full py-4 rounded-xl font-black text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ابدأ التقييم التشخيصي →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizState === "quiz") {
    const q = quizQuestions[currentQ];
    if (!q) return null;

    return (
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        <AnimatePresence>
          {xpEvents.length > 0 && <XPPopup events={xpEvents} onDone={() => setXpEvents([])} />}
        </AnimatePresence>
        <AnimatePresence>
          {unlockedBadge && <BadgeUnlockOverlay badge={unlockedBadge} onDone={() => setUnlockedBadge(null)} />}
        </AnimatePresence>

        <div className="border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <span className="text-xs font-bold text-muted-foreground">
            سؤال {currentQ + 1} / {quizQuestions.length}
          </span>
          <div className="flex-1 mx-6 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(currentQ / quizQuestions.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-primary">
            {q.exercise.grade}
          </span>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            {q.pattern && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                  {q.pattern.name}
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {q.exercise.type}
                </span>
              </div>
            )}

            <div className="text-base leading-relaxed text-foreground mb-6">
              <MathExerciseRenderer
                text={stripFigureRefs(normalizeFlatTable(q.exercise.text))}
                showDiagram
              />
            </div>

            {!showSolution && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">
                  اكتب إجابتك باستعمال محرّر الرياضيات
                </label>
                <StudentAnswerEditor
                  exerciseType={q.exercise.type || q.pattern?.type}
                  exerciseLevel={q.exercise.grade}
                  exerciseText={stripFigureRefs(normalizeFlatTable(q.exercise.text))}
                  onSubmitAlgebra={(steps) => {
                    setAnswerText(steps.join("\n"));
                    if (inputError) setInputError("");
                  }}
                  onSubmitGeometry={(data) => {
                    setAnswerText(JSON.stringify(data));
                    if (inputError) setInputError("");
                  }}
                />
                {inputError && (
                  <p className="text-xs text-destructive font-bold">⚠ {inputError}</p>
                )}
                <button
                  onClick={submitAnswer}
                  disabled={grading || !answerText.trim()}
                  className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {grading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                      جاري التصحيح...
                    </>
                  ) : (
                    "إرسال الإجابة"
                  )}
                </button>
              </div>
            )}

            {showSolution && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border ${answers[answers.length - 1]?.correct ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}
                >
                  <div className="text-sm font-bold mb-2">
                    {answers[answers.length - 1]?.correct ? "✅ أحسنت!" : "❌ لا بأس، إليك خطوات الحل:"}
                  </div>
                  {gradeFeedback && (
                    <div className="text-xs text-foreground/80 mb-3 p-2 rounded-lg bg-background/50 border border-border/50">
                      💬 {gradeFeedback}
                    </div>
                  )}

                  {q.decon.steps && q.decon.steps.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {q.decon.steps.map((step: any, i: number) => {
                        const stepText =
                          typeof step === "string" ? step : step.action || step.description || JSON.stringify(step);
                        return (
                          <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
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
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={nextQuestion}
                  className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all"
                >
                  {currentQ + 1 < quizQuestions.length ? "⬅ السؤال التالي" : "📊 عرض النتائج"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fire funnel events when results screen is shown
  useEffect(() => {
    if (quizState !== "results" || !analysis) return;
    trackEvent("gaps_viewed", {
      gap_count: analysis.gaps.length,
      score_pct: Math.round((analysis.gaps.length === 0 ? 100 : (analysis.correctCount / Math.max(1, analysis.total)) * 100)),
      authed: isAuthed,
    });
    if (!isAuthed && analysis.gaps.length > FREE_GAPS_VISIBLE) {
      trackEvent("soft_gate_shown", {
        hidden_gaps: analysis.gaps.length - FREE_GAPS_VISIBLE,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizState, analysis?.gaps.length, isAuthed]);

  if (quizState === "results" && analysis) {
    return (
      <div className="h-full overflow-y-auto bg-background" dir="rtl">
        <div
          className="border-b border-border px-6 py-6"
          style={{
            background:
              "linear-gradient(to left, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03), hsl(var(--background)))",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">📊 نتائج التقييم التشخيصي</h1>
            <p className="text-xs text-muted-foreground mt-1">
              الجولة {roundHistory.length} • {analysis.total} سؤال
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div
                className="text-3xl font-black"
                style={{
                  color:
                    analysis.score >= 80
                      ? "hsl(var(--primary))"
                      : analysis.score >= 60
                        ? "#22C55E"
                        : analysis.score >= 40
                          ? "#F59E0B"
                          : "hsl(var(--destructive))",
                }}
              >
                {analysis.score}%
              </div>
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

          {analysis.gaps.length > 0 && (
            <div className="p-5 rounded-xl border border-destructive/20 bg-destructive/5">
              <h3 className="text-sm font-bold text-destructive mb-1">🎯 المفاهيم الغائبة</h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                {isAuthed
                  ? "مرتّبة حسب الأهمية. اضغط \"إعادة الاختبار\" لاختبار مفهوم واحد بعمق."
                  : `نعرض لك أهم ${FREE_GAPS_VISIBLE} ثغرات. أنشئ حسابك المجاني لرؤية الخطة الكاملة وإعادة الاختبار.`}
              </p>
              <div className="space-y-2 relative">
                {analysis.gaps.slice(0, 8).map((gap, i) => {
                  const enoughPool =
                    availableExercises.filter((e) => !usedExerciseIds.has(e.id)).length >= 3;
                  const isLocked = !isAuthed && i >= FREE_GAPS_VISIBLE;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 transition-all ${
                        isLocked ? "blur-sm select-none pointer-events-none opacity-60" : ""
                      }`}
                      aria-hidden={isLocked}
                    >
                      <div className="w-7 h-7 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{gap.concept}</div>
                        <div className="text-[10px] text-muted-foreground">ظهر في {gap.count} تمرين</div>
                      </div>
                      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full bg-destructive rounded-full"
                          style={{ width: `${Math.min(100, (gap.count / Math.max(1, analysis.failedCount)) * 100)}%` }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          trackEvent("gap_retest_clicked", { concept: gap.concept, locked: isLocked });
                          retestSingleGap(gap.concept);
                        }}
                        disabled={!enoughPool || isLocked}
                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        title="اختبار هذا المفهوم وحده"
                      >
                        🔁 إعادة الاختبار
                      </button>
                    </div>
                  );
                })}
              </div>

              {!isAuthed && analysis.gaps.length > FREE_GAPS_VISIBLE && (
                <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5 text-center">
                  <div className="text-xs font-bold text-foreground mb-1">
                    🔒 +{analysis.gaps.length - FREE_GAPS_VISIBLE} ثغرات إضافية مخفية
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-3">
                    أنشئ حسابك المجاني لتفتح خطتك الشخصية وتتبّع تقدّمك. لن تفقد نتائجك الحالية.
                  </div>
                  <a
                    href="/auth?redirect=/diagnostic"
                    onClick={() => trackEvent("signup_cta_clicked", { source: "soft_gate_card", hidden_gaps: analysis.gaps.length - FREE_GAPS_VISIBLE })}
                    className="inline-block px-5 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-md"
                  >
                    🔓 افتح الخطة الكاملة (مجاني)
                  </a>
                </div>
              )}
            </div>
          )}

          {analysis.weakPatterns.length > 0 && isAuthed && (
            <div className="p-5 rounded-xl border border-border bg-card">
              <h3 className="text-sm font-bold text-foreground mb-3">🧩 الأنماط الضعيفة</h3>
              <div className="grid grid-cols-2 gap-3">
                {analysis.weakPatterns.slice(0, 6).map((wp, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="text-xs font-bold text-foreground mb-1">{wp.pattern.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {wp.pattern.type} • فشل {wp.failCount} مرة
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {canContinue && analysis.failedCount > 0 && isAuthed && (
              <button
                onClick={continueAdaptive}
                className="flex-1 py-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg"
              >
                🔄 جولة تكيّفية (تركّز على ثغراتك)
              </button>
            )}
            {canContinue && analysis.failedCount > 0 && !isAuthed && (
              <a
                href="/auth?redirect=/diagnostic"
                className="flex-1 py-4 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg text-center"
              >
                🔓 ابدأ جولة تكيّفية (يتطلب حساب مجاني)
              </a>
            )}
            <button
              onClick={() => {
                setQuizState("setup");
                setUsedExerciseIds(new Set());
                setRoundHistory([]);
              }}
              className="flex-1 py-4 rounded-xl text-sm font-bold border border-border bg-card text-foreground hover:bg-accent transition-all"
            >
              🔁 تقييم جديد
            </button>
          </div>

          {!canContinue && analysis.failedCount > 0 && isAuthed && (
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
      <AnimatePresence>
        {xpEvents.length > 0 && <XPPopup events={xpEvents} onDone={() => setXpEvents([])} />}
      </AnimatePresence>
      <AnimatePresence>
        {unlockedBadge && <BadgeUnlockOverlay badge={unlockedBadge} onDone={() => setUnlockedBadge(null)} />}
      </AnimatePresence>
    </>
  );
}
