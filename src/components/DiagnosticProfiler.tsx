import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useProfile, computeProfileFromRecords, DiagnosticRecord, PROFILES, ProfileType } from "@/engine/profile-store";

// Map to our 4-stage psychological profiling test
const EXERCISES = [
  {
    id: 1, type: "standard" as const, typeName: "مسألة قياسية",
    question: "حل المعادلة:  2x + 3 = 7", answer: "2",
    hint: "ابدأ بعزل المتغير x على جهة واحدة",
    kind: "numeric" as const, placeholder: "x = ?",
    badgeColor: "var(--amber)", badgeBg: "rgba(245,158,11,0.08)", icon: "📘"
  },
  {
    id: 2, type: "trap" as const, typeName: "مسألة فخ",
    question: "حل المعادلة:  2(x + 3) = 7", answer: "0.5",
    hint: "انتبه — هذه ليست نفس المعادلة السابقة! إياك أن تطبق نفس خطوات التمرين 1 بدون تفكير.",
    kind: "numeric" as const, placeholder: "x = ?",
    badgeColor: "var(--destructive)", badgeBg: "rgba(248,113,113,0.08)", icon: "🪤"
  },
  {
    id: 3, type: "logic" as const, typeName: "لغز منطقي",
    question: "في سلسلة: 2، 6، 12، 20، ؟\nما العدد التالي؟", answer: "30",
    hint: "ابحث عن الفرق بين كل عددين متتاليين (الفرق يتزايد).",
    kind: "numeric" as const, placeholder: "؟ = ",
    badgeColor: "var(--cyan)", badgeBg: "rgba(34,211,238,0.08)", icon: "🧩"
  },
  {
    id: 4, type: "open" as const, typeName: "مسألة مفتوحة",
    question: "كيس فيه كرات حمراء وزرقاء. إذا سحبت كرتين عشوائياً، ما احتمال أن تكونا نفس اللون؟\n(وضّح طريقة تفكيرك)", answer: null,
    hint: "لا يوجد جواب واحد صحيح — المهم هو منهجيتك في بناء النموذج الاحتمالي.",
    kind: "text" as const, placeholder: "اشرح طريقة تفكيرك هنا...",
    badgeColor: "var(--primary)", badgeBg: "rgba(167,139,250,0.08)", icon: "🔓"
  },
];

export function DiagnosticProfiler({ onClose }: { onClose: () => void }) {
  const { setProfile } = useProfile();
  const [currentEx, setCurrentEx] = useState(0);
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);

  // Timer & Per-exercise State
  const [timeSecs, setTimeSecs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [firstActionTime, setFirstActionTime] = useState<number | null>(null);
  
  const [inputValue, setInputValue] = useState("");
  const [explanation, setExplanation] = useState("");
  const [confidence, setConfidence] = useState(50);
  
  const [answersLog, setAnswersLog] = useState<string[]>([]);
  const [strategyChanges, setStrategyChanges] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [errors, setErrors] = useState(0);
  const [errorTypes, setErrorTypes] = useState<string[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ profile: ProfileType; scoreLog: any } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    resetExState();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentEx]);

  function resetExState() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeSecs(0);
    setStartTime(Date.now());
    setFirstActionTime(null);
    setInputValue("");
    setExplanation("");
    setConfidence(50);
    setAnswersLog([]);
    setStrategyChanges(0);
    setHintUsed(false);
    setShowHint(false);
    setErrors(0);
    setErrorTypes([]);

    timerRef.current = setInterval(() => {
      setTimeSecs(s => s + 1);
    }, 1000);
  }

  function handleInput(val: string) {
    if (firstActionTime === null) {
      setFirstActionTime((Date.now() - startTime) / 1000);
    }
    setInputValue(val);
    if (answersLog.length > 0 && val !== answersLog[answersLog.length - 1]) {
      setStrategyChanges(prev => prev + 1);
    }
    setAnswersLog(prev => [...prev, val]);
  }

  function toggleHint() {
    setShowHint(!showHint);
    if (!showHint) setHintUsed(true);
  }

  function submitAnswer() {
    const ex = EXERCISES[currentEx];
    const attemptNum = errors + 1;
    let isCorrect = false;
    let currentErrorType = "none";

    if (ex.answer !== null) {
      const numAnswer = parseFloat(inputValue.replace(/x/i, '').replace('=', '').trim());
      const numCorrect = parseFloat(ex.answer);
      isCorrect = Math.abs(numAnswer - numCorrect) < 0.1;

      if (!isCorrect) {
        if (isNaN(numAnswer)) currentErrorType = "random";
        else if (Math.abs(numAnswer - numCorrect) < 2) currentErrorType = "computational";
        else currentErrorType = "conceptual";
        
        setErrorTypes(prev => [...prev, currentErrorType]);
        setErrors(prev => prev + 1);
      }
    } else {
      isCorrect = inputValue.length > 10 || explanation.length > 10;
    }

    if (!isCorrect && errors === 0 && ex.answer !== null) {
      // Allow 1 retry
      alert("❌ الإجابة غير صحيحة، حاول مرة أخرى!");
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const record: DiagnosticRecord = {
      exerciseId: ex.id,
      type: ex.type,
      timeToFirstAction: firstActionTime || timeSecs,
      totalTime: timeSecs,
      attempts: attemptNum,
      errors: isCorrect ? errors : errors + 1,
      errorTypes: errorTypes,
      strategyChanges,
      hintUsed,
      correct: isCorrect,
      explanation,
      confidence: confidence / 100,
      answer: inputValue,
    };

    const newRecords = [...records, record];
    setRecords(newRecords);

    if (currentEx < EXERCISES.length - 1) {
      setCurrentEx(prev => prev + 1);
    } else {
      runAnalysis(newRecords);
    }
  }

  function runAnalysis(finalRecords: DiagnosticRecord[]) {
    setAnalyzing(true);
    setTimeout(() => {
      const { type, scores } = computeProfileFromRecords(finalRecords);
      setProfile(type);
      setResult({ profile: type, scoreLog: scores });
      setAnalyzing(false);
    }, 2500); // Fake dramatic processing time
  }

  // --- RENDERING ---

  if (result) {
    const p = PROFILES[result.profile!];
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-5 p-2 rtl">
        <div style={{ background: "hsl(var(--card))", border: `1.5px solid ${EXERCISES[0].badgeColor}30`, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{p.id === 'strategic' ? '🎯' : p.id === 'conceptual' ? '💡' : p.id === 'procedural' ? '📋' : '⚡'}</div>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{p.id} PROFILE</p>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "hsl(var(--foreground))", margin: "0 0 12px 0" }}>{p.title}</h2>
          <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
            {p.desc}
          </p>
        </div>

        <div style={{ background: "hsl(var(--primary)/0.08)", border: "1px dashed hsl(var(--primary)/0.3)", borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "hsl(var(--primary))", marginBottom: 6 }}>🎯 الخطوة التالية المقترحة:</h3>
          <p style={{ fontSize: 13, color: "hsl(var(--foreground))", margin: 0 }}>{p.nextMission}</p>
        </div>

        <button onClick={onClose} style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
          إنهاء والعودة ←
        </button>
      </motion.div>
    );
  }

  if (analyzing) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", border: "4px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", animation: "spin 1s linear infinite" }} />
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>جاري تحليل البنية الذهنية...</h2>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>نحلل التردد، تغيير الاستراتيجيات، والفهم العميق...</p>
      </div>
    );
  }

  const ex = EXERCISES[currentEx];
  const progress = ((currentEx) / EXERCISES.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} dir="rtl">
      {/* Track */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
           <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--primary))" }}>تشخيص طريقة التفكير</span>
           <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>مسألة {currentEx + 1} من {EXERCISES.length}</span>
        </div>
        <div style={{ height: 6, background: "hsl(var(--border))", borderRadius: 3, overflow: "hidden" }}>
          <motion.div animate={{ width: `${progress}%` }} style={{ height: "100%", background: "hsl(var(--primary))", borderRadius: 3 }} />
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ background: ex.badgeBg, border: `1px solid ${ex.badgeColor}40`, color: ex.badgeColor, padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{ex.icon}</span> {ex.typeName}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 600, color: timeSecs > 60 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}>
          {Math.floor(timeSecs / 60).toString().padStart(2, '0')}:{(timeSecs % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Question */}
      <div style={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRight: `3px solid ${ex.badgeColor}`, borderRadius: 12, padding: "20px 16px", fontSize: 16, fontWeight: 700, lineHeight: 1.8 }}>
        {ex.question.split('\n').map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {/* Hint */}
      <div>
        <button onClick={toggleHint} style={{ background: "none", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          💡 تلميح (يؤثر على طريقة التحليل)
        </button>
        {showHint && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ background: "hsl(var(--accent)/0.1)", color: "hsl(var(--accent))", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 8, border: "1px solid hsl(var(--accent)/0.3)" }}>
            {ex.hint}
          </motion.div>
        )}
      </div>

      {/* Answer Area */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>إجابتك النهاية:</label>
        {ex.kind === 'numeric' ? (
          <input 
            type="text" 
            value={inputValue} 
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitAnswer()}
            placeholder={ex.placeholder}
            style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 16, textAlign: "center", fontFamily: "monospace" }}
          />
        ) : (
          <textarea 
            value={inputValue} 
            onChange={e => handleInput(e.target.value)}
            placeholder={ex.placeholder}
            rows={3}
            style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 14, fontFamily: "'Tajawal', sans-serif", resize: "vertical" }}
          />
        )}
      </div>

      {/* Explanation Area */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))" }}>لماذا استخدمت هذه الطريقة؟</label>
          <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "4px 0 0 0" }}>شرح السبب يكشف طريقة تفكيرك الحقيقية.</p>
        </div>
        <textarea 
          value={explanation} 
          onChange={e => setExplanation(e.target.value)}
          placeholder="اشرح خطواتك ومنطقك هنا..."
          rows={2}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))", fontSize: 13, fontFamily: "'Tajawal', sans-serif", resize: "none" }}
        />
        
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>مدى ثقتك بالحل:</span>
          <input 
            type="range" min="0" max="100" value={confidence} onChange={e => setConfidence(Number(e.target.value))}
            style={{ flex: 1, accentColor: "hsl(var(--primary))" }}
          />
          <span style={{ fontSize: 12, fontFamily: "monospace", color: "hsl(var(--primary))", width: 40, textAlign: "center", fontWeight: 700 }}>{confidence}%</span>
        </div>
      </div>

      <button onClick={submitAnswer} style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 8 }}>
        {currentEx === EXERCISES.length - 1 ? 'إنهاء وتحليل النتائج' : 'التالي ←'}
      </button>

      {/* Attempts dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < errors ? "hsl(var(--destructive))" : "hsl(var(--border))" }} />
        ))}
      </div>
    </div>
  );
}
