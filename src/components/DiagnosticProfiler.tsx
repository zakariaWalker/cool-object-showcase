import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile, computeProfileFromRecords, DiagnosticRecord, PROFILES, ProfileType } from "@/engine/profile-store";
import { LatexRenderer } from "@/components/LatexRenderer";
import { generateDiagnosticExercises, DiagnosticExercise } from "@/engine/DiagnosticGeneratorService";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, HelpCircle, Brain, Target, Zap, Puzzle, BarChart3, Clock, ArrowRight, Loader2 } from "lucide-react";

export function DiagnosticProfiler({ 
  level, 
  onClose 
}: { 
  level: string;
  onClose: () => void;
}) {
  const { setProfile } = useProfile();
  const [exercises, setExercises] = useState<DiagnosticExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEx, setCurrentEx] = useState(0);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);

  // Per-exercise state
  const [timeSecs, setTimeSecs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [firstActionTime, setFirstActionTime] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [explanation, setExplanation] = useState("");
  const [confidence, setConfidence] = useState(50);
  const [strategyChanges, setStrategyChanges] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ profile: ProfileType; detectedMisconceptions: string[] } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load dynamic exercises on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await generateDiagnosticExercises(level);
      setExercises(data);
      setLoading(false);
    }
    load();
  }, [level]);

  useEffect(() => {
    if (!loading && exercises.length > 0) {
      resetExState();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentEx, loading, exercises]);

  function resetExState() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeSecs(0);
    setStartTime(Date.now());
    setFirstActionTime(null);
    setInputValue("");
    setExplanation("");
    setConfidence(50);
    setStrategyChanges(0);
    setHintUsed(false);
    setShowHint(false);

    timerRef.current = setInterval(() => setTimeSecs(s => s + 1), 1000);
  }

  function handleInput(val: string) {
    if (firstActionTime === null) setFirstActionTime((Date.now() - startTime) / 1000);
    if (inputValue && val !== inputValue) setStrategyChanges(s => s + 1);
    setInputValue(val);
  }

  function submitAnswer() {
    const ex = exercises[currentEx];
    let isCorrect = false;
    let errorType = "none";

    if (ex.kind === "qcm") {
      isCorrect = inputValue === ex.answer;
      if (!isCorrect) errorType = "misconception";
    } else {
      const numAns = parseFloat(inputValue.replace(/[^0-9.]/g, ""));
      const numCorrect = parseFloat(ex.answer);
      isCorrect = numAns === numCorrect;
      if (!isCorrect) errorType = isNaN(numAns) ? "random" : "conceptual";
    }

    if (timerRef.current) clearInterval(timerRef.current);

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
      explanation,
      confidence: confidence / 100,
      answer: inputValue,
    };

    const newRecords = [...records, record];
    setRecords(newRecords);

    if (currentEx < exercises.length - 1) {
      setCurrentEx(prev => prev + 1);
    } else {
      runAnalysis(newRecords);
    }
  }

  async function runAnalysis(finalRecords: DiagnosticRecord[]) {
    setAnalyzing(true);
    
    // Artificial delay for 'analysis' feel
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { type } = computeProfileFromRecords(finalRecords);
    const detected = finalRecords
      .filter(r => !r.correct)
      .map(r => exercises.find(e => e.id === r.exerciseId)?.misconception)
      .filter(Boolean) as string[];

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Save Activity Log
      await supabase.from("student_activity_log").insert({
        student_id: user.id,
        action: "diagnostic_completed",
        xp_earned: 100,
        metadata: { profile: type, level, date: new Date().toISOString() }
      });

      // 2. Save Knowledge Gaps
      if (detected.length > 0) {
        const gapInserts = detected.map(topic => ({
          student_id: user.id,
          topic,
          severity: "medium", // Default
          detected_at: new Date().toISOString()
        }));
        await supabase.from("student_knowledge_gaps").insert(gapInserts);
      }

      // 3. Update Progress (XP)
      const { data: prog } = await supabase.from("student_progress").select("xp").eq("student_id", user.id).single();
      await supabase.from("student_progress").update({
        xp: (prog?.xp || 0) + 100,
        updated_at: new Date().toISOString()
      }).eq("student_id", user.id);
    }

    setProfile(type);
    setResult({ profile: type, detectedMisconceptions: detected });
    setAnalyzing(false);
  }

  function renderMath(text: string) {
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        return <LatexRenderer key={i} latex={part.slice(1, -1)} className="inline" />;
      }
      return <span key={i}>{part}</span>;
    });
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
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 rtl text-right">
        <div className="bg-card border-2 border-primary/20 rounded-3xl p-8 text-center space-y-4">
          <div className="text-6xl mb-2">
            {p.id === 'strategic' ? '🎯' : p.id === 'conceptual' ? '💡' : p.id === 'procedural' ? '📋' : '⚡'}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">{p.id} PROFILE</p>
            <h2 className="text-3xl font-black text-foreground">{p.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {p.desc}
          </p>
        </div>

        {result.detectedMisconceptions.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> الثغرات المكتشفة في تفكيرك:
            </h3>
            <ul className="space-y-2">
              {result.detectedMisconceptions.map((m, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-black text-primary flex items-center gap-2">
            <Target className="w-4 h-4" /> توصية المحرك الرياضي:
          </h3>
          <p className="text-xs text-foreground/90">{p.nextMission}</p>
        </div>

        <button onClick={onClose} className="w-full bg-foreground text-background py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
          إنهاء والعودة للوحة التجكم ←
        </button>
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
          <span className="text-[10px] text-muted-foreground font-bold">سؤال {currentEx + 1} من {exercises.length}</span>
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
          <div className="flex items-center gap-2 text-muted-foreground/40 font-mono text-sm font-bold">
            <Clock className="w-3.5 h-3.5" />
            {Math.floor(timeSecs / 60).toString().padStart(2, '0')}:{(timeSecs % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="bg-muted/30 border-r-4 border-primary rounded-xl p-6 text-lg font-bold leading-relaxed text-foreground">
          {renderMath(ex.question)}
        </div>

        {/* Hint */}
        <div className="space-y-2">
          <button 
            onClick={() => { setShowHint(!showHint); setHintUsed(true); }}
            className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> هل تحتاج تلميح؟ (سيظهر في التحليل)
          </button>
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
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
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${inputValue === opt ? "border-primary" : "border-muted-foreground/30"}`}>
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
                onChange={e => handleInput(e.target.value)}
                placeholder={ex.placeholder}
                className="w-full p-4 rounded-xl border-2 border-border bg-card text-center font-mono text-lg focus:border-primary outline-none transition-all"
              />
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-muted-foreground uppercase">لماذا اخترت هذا الجواب؟ (اختياري)</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">الثقة بالحل:</span>
                <span className="text-[10px] font-bold text-primary">{confidence}%</span>
              </div>
            </div>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="اشرح لي ماذا دار في ذهنك..."
              rows={2}
              className="w-full p-4 rounded-xl border-2 border-border bg-card text-sm resize-none focus:border-primary outline-none transition-all"
            />
            <input 
              type="range" min="0" max="100" value={confidence} onChange={e => setConfidence(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none accent-primary cursor-pointer"
            />
          </div>
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


