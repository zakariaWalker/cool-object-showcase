import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile, computeProfileFromRecords, DiagnosticRecord, PROFILES, ProfileType } from "@/engine/profile-store";
import { LatexRenderer } from "@/components/LatexRenderer";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { generateDiagnosticExercises, DiagnosticExercise } from "@/engine/DiagnosticGeneratorService";
import { XP_REWARDS } from "@/engine/gamification";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  HelpCircle,
  Brain,
  Target,
  Clock,
  ArrowRight,
  Trophy,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ExerciseReportButton } from "./ExerciseReportButton";
import { useMisconceptionTracker } from "@/hooks/useMisconceptionTracker";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/funnelTracking";

export function DiagnosticProfiler({
  level,
  countryCode = "DZ",
  onClose,
}: {
  level: string;
  countryCode?: string;
  onClose: () => void;
}) {
  const { setProfile } = useProfile();
  const { track } = useMisconceptionTracker();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exercises, setExercises] = useState<DiagnosticExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEx, setCurrentEx] = useState(0);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);

  // Per-exercise state
  const [timeSecs, setTimeSecs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [firstActionTime, setFirstActionTime] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [strategyChanges, setStrategyChanges] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    profile: ProfileType;
    detectedMisconceptions: string[];
    score: number;
    correctCount: number;
    promotedGaps: number;
  } | null>(null);
  const [revealStep, setRevealStep] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await generateDiagnosticExercises(level, countryCode);
      // Defensive: filter out any open-ended items that have no gradable answer.
      // These would always be marked wrong by submitAnswer() and skew the diagnostic.
      const gradable = (data || []).filter(
        (ex) => ex.kind !== "text" && ex.answer && String(ex.answer).trim().length > 0,
      );
      setExercises(gradable.length >= 3 ? gradable : (data || []));
      setLoading(false);
    }
    load();
  }, [level, countryCode]);

  useEffect(() => {
    if (!loading && exercises.length > 0) {
      resetExState();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentEx, loading, exercises]);

  function resetExState() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeSecs(0);
    setStartTime(Date.now());
    setFirstActionTime(null);
    setInputValue("");
    setStrategyChanges(0);
    setHintUsed(false);
    setShowHint(false);
    timerRef.current = setInterval(() => setTimeSecs((s) => s + 1), 1000);
  }

  function handleInput(val: string) {
    if (firstActionTime === null) setFirstActionTime((Date.now() - startTime) / 1000);
    if (inputValue && val !== inputValue) setStrategyChanges((s) => s + 1);
    setInputValue(val);
  }

  function submitAnswer() {
    const ex = exercises[currentEx];
    let isCorrect = false;
    let errorType = "none";
    const hasGradableAnswer = ex.answer && String(ex.answer).trim().length > 0;

    if (!hasGradableAnswer) {
      // Open-ended question with no canonical answer — treat as "attempted",
      // do NOT penalise the student. Recorded as correct so the score
      // reflects only items we can actually grade.
      isCorrect = true;
    } else if (ex.kind === "qcm") {
      isCorrect = inputValue.trim() === String(ex.answer).trim();
      if (!isCorrect) errorType = "misconception";
    } else {
      const numAns = parseFloat(inputValue.replace(/[^0-9.\-]/g, ""));
      const numCorrect = parseFloat(String(ex.answer));
      isCorrect = !isNaN(numAns) && !isNaN(numCorrect) && numAns === numCorrect;
      if (!isCorrect) errorType = isNaN(numAns) ? "random" : "conceptual";
    }

    if (timerRef.current) clearInterval(timerRef.current);

    // FIX: exerciseId typed as string | number to handle both fallback numbers and AI UUIDs
    const record: DiagnosticRecord = {
      exerciseId: ex.id,
      type: ex.type,
      timeToFirstAction: firstActionTime || timeSecs,
      totalTime: timeSecs,
      attempts: 1,
      errors: isCorrect ? 0 : 1,
      errorTypes: !isCorrect ? [errorType] : [],
      strategyChanges,
      hintUsed,
      correct: isCorrect,
      explanation: "",
      confidence: 0.5,
      answer: inputValue,
    };

    const newRecords = [...records, record];
    setRecords(newRecords);

    if (currentEx < exercises.length - 1) {
      setCurrentEx((prev) => prev + 1);
    } else {
      runAnalysis(newRecords);
    }
  }

  async function runAnalysis(finalRecords: DiagnosticRecord[]) {
    setAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { type } = computeProfileFromRecords(finalRecords);

    // Pull the misconception strings + types from the failed exercises
    const failedExercises = finalRecords
      .filter((r) => !r.correct)
      .map((r) => exercises.find((e) => String(e.id) === String(r.exerciseId)))
      .filter(Boolean) as DiagnosticExercise[];

    const detected = failedExercises.map((e) => e.misconception).filter(Boolean);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1) Activity log + XP
      await supabase.from("student_activity_log").insert({
        student_id: user.id,
        action: "diagnostic_completed",
        xp_earned: XP_REWARDS.diagnostic_complete,
        metadata: { profile: type, level, countryCode, date: new Date().toISOString() },
      });

      const { data: prog } = await supabase
        .from("student_progress")
        .select("xp")
        .eq("student_id", user.id)
        .maybeSingle();
      await supabase
        .from("student_progress")
        .upsert(
          {
            student_id: user.id,
            xp: (prog?.xp || 0) + XP_REWARDS.diagnostic_complete,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id" },
        );

      // Cognitive loop runs below (outside auth block) so we can compute promotedCount once.
    }

    // FIX: pass level (grade_code) so profile-store persists it to profiles table
    setProfile(type, level);
    const correctCount = finalRecords.filter((r) => r.correct).length;
    const score = Math.round((correctCount / finalRecords.length) * 100);
    let promotedCount = 0;
    for (const ex of failedExercises) {
      if (!ex.misconceptionType) continue;
      try {
        const res = await track({ type: ex.misconceptionType });
        if (res?.promoted) promotedCount += 1;
      } catch {}
    }
    setResult({
      profile: type,
      detectedMisconceptions: detected,
      score,
      correctCount,
      promotedGaps: promotedCount,
    });
    setAnalyzing(false);
    // Trigger sequenced reveal
    setTimeout(() => setRevealStep(1), 400);
    setTimeout(() => setRevealStep(2), 1400);
    setTimeout(() => setRevealStep(3), 2400);
  }

  /** Strip dangling figure-reference markers — the renderer auto-draws shapes. */
  function stripFigureRefs(text: string): string {
    return text
      .replace(/\[(رسم|شكل|صورة|مخطط)[^\]]*\]/g, "")
      .replace(/\(\s*(تخيل|انظر إلى)\s*[^)]*\)/g, "")
      .replace(/(انظر|لاحظ)\s+(إلى\s+)?(الشكل|الرسم|المخطط|الصورة)\s*(المقابل|التالي|أدناه)?\s*[:.،]?/g, "")
      .replace(/في\s+الشكل\s+(المقابل|التالي|أدناه)\s*[،,:]?\s*/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function renderMath(text: string) {
    // Diagnostic items must be answerable without a figure — never auto-draw.
    return <MathExerciseRenderer text={stripFigureRefs(text)} showDiagram={false} />;
  }

  if (loading) {
    return (
      <div className="py-20 text-center space-y-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Brain className="w-16 h-16 mx-auto text-primary/40" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-foreground">جاري توليد التقييم العادل...</h2>
          <p className="text-xs text-muted-foreground">نختار أسئلة ذكية تناسب مستواك ({level}) وتكشف طريقة تفكيرك.</p>
        </div>
      </div>
    );
  }

  if (result) {
    const p = PROFILES[result.profile!];
    const scoreColor =
      result.score >= 75 ? "text-emerald-600" : result.score >= 50 ? "text-amber-600" : "text-rose-600";
    const scoreBg =
      result.score >= 75 ? "from-emerald-500/20 to-emerald-500/5" : result.score >= 50 ? "from-amber-500/20 to-amber-500/5" : "from-rose-500/20 to-rose-500/5";
    const scoreEmoji = result.score >= 75 ? "🚀" : result.score >= 50 ? "💪" : "🌱";
    const scoreMsg =
      result.score >= 75
        ? "ممتاز! أنت في القمة"
        : result.score >= 50
          ? "بداية قوية — قابلة للتطوير"
          : "اكتشفنا فرص ضخمة للنمو";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 rtl text-right">
        {/* SCORE REVEAL — animated big number */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`relative overflow-hidden bg-gradient-to-br ${scoreBg} border-2 border-primary/20 rounded-3xl p-8 text-center`}
        >
          <div className="text-5xl mb-3">{scoreEmoji}</div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-2">مستواك الحقيقي</p>
          <motion.div
            key={result.score}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
            className={`text-7xl md:text-8xl font-black ${scoreColor} leading-none`}
          >
            {result.score}<span className="text-3xl">%</span>
          </motion.div>
          <p className="text-sm font-bold text-foreground/80 mt-3">{scoreMsg}</p>

          {/* Visual heatmap of answers */}
          <div className="flex justify-center gap-1.5 mt-5">
            {records.map((r, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  r.correct ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                }`}
              >
                {r.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* XP REWARD — instant gratification */}
        {revealStep >= 1 && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.6 }}
              className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/40"
            >
              <Trophy className="w-6 h-6" />
            </motion.div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground font-bold">مكافأة فورية</div>
              <div className="text-base font-black text-amber-700">+{XP_REWARDS.diagnostic_complete} XP مفتوحة</div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </motion.div>
        )}

        {/* THINKING PROFILE — reveal step 2 */}
        {revealStep >= 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">
                {p.id === "strategic" ? "🎯" : p.id === "conceptual" ? "💡" : p.id === "procedural" ? "📋" : "⚡"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">نمط تفكيرك</p>
                <h3 className="text-lg font-black text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{p.desc}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* WEAKNESSES — reveal step 3 — framed as "secret intel" not failure */}
        {revealStep >= 3 && result.detectedMisconceptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-rose-500/5 to-transparent border border-rose-500/20 rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-sm font-black text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> الفخاخ اللي خسّرتك نقاط:
            </h3>
            <ul className="space-y-2">
              {result.detectedMisconceptions.slice(0, 3).map((m, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
            {result.promotedGaps > 0 && (
              <div className="text-[10px] text-rose-600 font-bold mt-2 pt-2 border-t border-rose-500/10">
                ✨ أضفنا {result.promotedGaps} نقطة لمسار التقوية المخصص
              </div>
            )}
          </motion.div>
        )}

        {/* CTA — unlock next path. Anonymous users hit signup soft-gate. */}
        {revealStep >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <button
              onClick={() => {
                if (!user) {
                  trackEvent("signup_cta_clicked", { source: "result_unlock_plan" });
                  navigate("/auth?redirect=/learn");
                } else {
                  navigate("/learn");
                }
              }}
              className="w-full bg-gradient-to-r from-primary to-accent text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <TrendingUp className="w-5 h-5" />
              {user ? "افتح مسار التقوية المخصص" : "احفظ نتيجتك وافتح مسار التقوية"}
            </button>
            <button
              onClick={onClose}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
            >
              لاحقاً — العودة للوحة
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  }


  if (analyzing) {
    return (
      <div className="py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto border-4 border-muted border-t-primary rounded-full animate-spin" />
        <div className="space-y-2">
          <h2 className="text-xl font-black">جاري تحليل البنية الذهنية...</h2>
          <p className="text-xs text-muted-foreground">نحلل التردد، العثرات المنطقية، ونمط الحل...</p>
        </div>
      </div>
    );
  }

  const ex = exercises[currentEx];
  if (!ex) return null;
  const progress = (currentEx / exercises.length) * 100;

  return (
    <div className="space-y-6 rtl text-right">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-primary uppercase tracking-tight">التشخيص العادل ({level})</span>
          <span className="text-[10px] text-muted-foreground font-bold">
            سؤال {currentEx + 1} من {exercises.length}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} className="h-full bg-primary" />
        </div>
      </div>

      {/* Exercise Card */}
      <div className="space-y-5">
        <div className="flex justify-between items-start">
          <div
            style={{ background: ex.badgeBg, color: ex.badgeColor, borderColor: `${ex.badgeColor}40` }}
            className="px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-2"
          >
            {ex.icon} {ex.typeName}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground/40 font-mono text-sm font-bold">
              <Clock className="w-3.5 h-3.5" />
              {Math.floor(timeSecs / 60)
                .toString()
                .padStart(2, "0")}
              :{(timeSecs % 60).toString().padStart(2, "0")}
            </div>
            {ex.id && String(ex.id).length > 2 && <ExerciseReportButton exerciseId={String(ex.id)} />}
          </div>
        </div>

        <div className="bg-muted/30 border-r-4 border-primary rounded-xl p-6 text-lg font-bold leading-relaxed text-foreground">
          {renderMath(ex.question)}
        </div>

        {/* Hint */}
        <div className="space-y-2">
          <button
            onClick={() => {
              setShowHint(!showHint);
              setHintUsed(true);
            }}
            className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> هل تحتاج تلميح؟ (سيظهر في التحليل)
          </button>
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-primary/80 overflow-hidden"
              >
                {renderMath(ex.hint)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Answer Selection */}
        <div className="space-y-4">
          {ex.kind === "qcm" ? (
            <div className="grid grid-cols-1 gap-2">
              {ex.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleInput(opt)}
                  className={`
                    p-4 rounded-xl border-2 text-right text-sm font-bold transition-all
                    ${inputValue === opt ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:border-primary/40 text-foreground/70"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${inputValue === opt ? "border-primary" : "border-muted-foreground/30"}`}
                    >
                      {inputValue === opt && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    {renderMath(opt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">إجابتك العددية:</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInput(e.target.value)}
                placeholder={ex.placeholder}
                className="w-full p-4 rounded-xl border-2 border-border bg-card text-center font-mono text-lg focus:border-primary outline-none transition-all"
              />
            </div>
          )}

        </div>


        <button
          onClick={submitAnswer}
          disabled={!inputValue}
          className={`
            w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-3 transition-all
            ${inputValue ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]" : "bg-muted text-muted-foreground cursor-not-allowed"}
          `}
        >
          {currentEx === exercises.length - 1 ? "إنهاء والتحليل" : "السؤال التالي"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}
