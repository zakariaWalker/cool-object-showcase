// ===== TMA Exercise View — Student Edition =====
// Warm, readable, encouraging design for Algerian middle & high school students.
// Arabic RTL · Light theme · Tajawal font · Domain-color system
// Renders inline LaTeX ($...$) in all text content.

import { useState, useEffect, useRef } from "react";
import { ImadrassaExercise } from "@/engine/dataset-types";
import { SolveResult, Domain, StatisticsResult, ProbabilityResult } from "@/engine/types";
import { GeometrySolveResult } from "@/engine/geometry/types";
import { ParsedExercise } from "@/engine/exercise-parser";
import { FunctionAnalysis } from "@/engine/functions-engine";
import { astToLatex } from "@/engine/ast-utils"; // used in KatexSpan (KB pattern section)
import { recordExercise } from "@/engine/progress-store";
import { FeatureTabs } from "./FeatureTabs";
import { ExerciseResult } from "./ExerciseResult";
import { motion, AnimatePresence } from "framer-motion";
import katex from "katex";
import "katex/dist/katex.min.css";

/* ─── Inline math renderer ─────────────────────────────────────────────────── */
// Splits text on $...$ markers and renders math segments with KaTeX.
// Handles both inline ($...$) and display ($$...$$) math.
function InlineMath({ text }: { text: string }) {
  if (!text) return null;

  // Split on $$...$$ first, then $...$
  const segments: { content: string; isDisplay: boolean; isMath: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const displayIdx = remaining.indexOf("$$");
    const inlineIdx = remaining.indexOf("$");

    if (inlineIdx === -1) {
      segments.push({ content: remaining, isDisplay: false, isMath: false });
      break;
    }

    if (displayIdx !== -1 && displayIdx === inlineIdx) {
      // Display math $$...$$
      const end = remaining.indexOf("$$", displayIdx + 2);
      if (end === -1) {
        segments.push({ content: remaining, isDisplay: false, isMath: false });
        break;
      }
      if (displayIdx > 0)
        segments.push({ content: remaining.slice(0, displayIdx), isDisplay: false, isMath: false });
      segments.push({ content: remaining.slice(displayIdx + 2, end), isDisplay: true, isMath: true });
      remaining = remaining.slice(end + 2);
    } else {
      // Inline math $...$
      const end = remaining.indexOf("$", inlineIdx + 1);
      if (end === -1) {
        segments.push({ content: remaining, isDisplay: false, isMath: false });
        break;
      }
      if (inlineIdx > 0)
        segments.push({ content: remaining.slice(0, inlineIdx), isDisplay: false, isMath: false });
      segments.push({ content: remaining.slice(inlineIdx + 1, end), isDisplay: false, isMath: true });
      remaining = remaining.slice(end + 1);
    }
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.isMath ? (
          <KatexSpan key={i} latex={seg.content} display={seg.isDisplay} />
        ) : (
          <span key={i}>{seg.content}</span>
        )
      )}
    </>
  );
}

function KatexSpan({ latex, display }: { latex: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          displayMode: display, throwOnError: false, trust: true,
        });
      } catch { if (ref.current) ref.current.textContent = latex; }
    }
  }, [latex, display]);
  return <span ref={ref} style={{ display: display ? "block" : "inline" }} />;
}

/* ─── Domain colour tokens ─────────────────────────────────────────────────── */
const DOMAIN: Record<Domain, {
  label: string; emoji: string;
  bg: string; banner: string; pill: string;
  accent: string; accentLight: string; accentText: string;
  border: string; stepBg: string;
}> = {
  algebra: {
    label: "الجبر", emoji: "🔢",
    bg: "#EEF2FF", banner: "linear-gradient(135deg,#7B75CC 0%,#9B7BC4 100%)",
    pill: "#E0E7FF", accent: "#7B75CC", accentLight: "#C7D2FE",
    accentText: "#3730A3", border: "#A5B4FC", stepBg: "#F5F3FF",
  },
  geometry: {
    label: "الهندسة", emoji: "📐",
    bg: "#ECFDF5", banner: "linear-gradient(135deg,#4DA88D 0%,#5AADA0 100%)",
    pill: "#D1FAE5", accent: "#4DA88D", accentLight: "#A7F3D0",
    accentText: "#065F46", border: "#6EE7B7", stepBg: "#F0FDF4",
  },
  statistics: {
    label: "الإحصاء", emoji: "📊",
    bg: "#FFFBEB", banner: "linear-gradient(135deg,#C49A4A 0%,#CC7A3A 100%)",
    pill: "#FEF3C7", accent: "#C49A4A", accentLight: "#FDE68A",
    accentText: "#92400E", border: "#FCD34D", stepBg: "#FFFBEB",
  },
  probability: {
    label: "الاحتمالات", emoji: "🎲",
    bg: "#F5F3FF", banner: "linear-gradient(135deg,#9B7BC4 0%,#C06CCE 100%)",
    pill: "#EDE9FE", accent: "#9B7BC4", accentLight: "#DDD6FE",
    accentText: "#5B21B6", border: "#C4B5FD", stepBg: "#F5F3FF",
  },
  functions: {
    label: "الدوال", emoji: "📈",
    bg: "#FFF1F2", banner: "linear-gradient(135deg,#C46B7E 0%,#C25D8B 100%)",
    pill: "#FFE4E6", accent: "#C46B7E", accentLight: "#FECDD3",
    accentText: "#9F1239", border: "#FDA4AF", stepBg: "#FFF1F2",
  },
};

// Answers that are DB placeholders — filter them out
const INVALID_ANSWER_TOKENS = [
  "لا يمكن الحل", "لا يمكن", "cannot", "n/a", "null", "none", "",
];

function isValidAnswer(answer: string): boolean {
  if (!answer || !answer.trim()) return false;
  const lower = answer.trim().toLowerCase();
  return !INVALID_ANSWER_TOKENS.some(t => lower === t.toLowerCase());
}

interface TMAExerciseViewProps {
  exercise: ImadrassaExercise;
  parsed: ParsedExercise | null;
  algebraResults: SolveResult[];
  geometryResult: GeometrySolveResult | null;
  statisticsResult?: StatisticsResult | null;
  probabilityResult?: ProbabilityResult | null;
  functionsResult?: FunctionAnalysis | null;
}

export function TMAExerciseView({
  exercise, parsed, algebraResults, geometryResult,
  statisticsResult = null, probabilityResult = null, functionsResult = null,
}: TMAExerciseViewProps) {
  const hasEngine = algebraResults.length > 0 || geometryResult !== null ||
    statisticsResult !== null || probabilityResult !== null || functionsResult !== null;
  const [showEngine, setShowEngine] = useState(hasEngine); // auto-open if solved
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealAnswers, setRevealAnswers] = useState(false);

  // KB pattern state
  const [kbPattern, setKbPattern] = useState<{
    name: string; description: string; type_ar: string;
    steps: string[]; linked_needs: string[];
  } | null>(null);
  const [showKbPattern, setShowKbPattern] = useState(false);

  // Fetch KB pattern for this question
  useEffect(() => {
    const qId = (exercise as any)._meta?.question_id || (exercise as any).id;
    if (!qId) return;
    const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
    fetch(`${apiBase}/api/kb/question/${qId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.name) {
          setKbPattern({
            name: data.name,
            description: data.description || "",
            type_ar: data.type_ar || "",
            steps: Array.isArray(data.steps) ? data.steps : [],
            linked_needs: Array.isArray(data.linked_needs) ? data.linked_needs : (data.concepts || []),
          });
        }
      })
      .catch(() => {/* no pattern — silent */});
  }, [(exercise as any)._meta?.question_id, (exercise as any).id]);

  // Auto-open engine when results arrive
  useEffect(() => {
    if (hasEngine) setShowEngine(true);
  }, [hasEngine]);

  // Inject Tajawal font
  useEffect(() => {
    const id = "tma-font-tajawal";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const domain = parsed?.classification.domain ?? "algebra";
  const d = DOMAIN[domain] ?? DOMAIN.algebra;
  const meta = (exercise as any)._meta ?? {};

  // ── Build exactly 4 answer choices: 1 correct + 3 wrong ────────────────
  // Uses domain-aware distractors based on common student mistakes
  function generateWrongAnswers(correct: string, count: number, domain?: string): string[] {
    const wrongs: string[] = [];
    const num = parseFloat(correct.replace(/[^\d.\-]/g, ""));

    // Algebraic expression distractors — based on common mistakes
    if (isNaN(num) || correct.includes("(") || correct.includes("x") || correct.includes("=")) {
      const algVariants: string[] = [];

      // Sign flip: (x-5)(x+5) → (x+5)(x+5)
      if (correct.includes("-")) algVariants.push(correct.replace(/-/g, "+").slice(0, 30));
      // Missing factor: drop one term
      if (correct.includes(")(")) {
        const parts = correct.split(")(");
        if (parts.length === 2) algVariants.push(parts[0].replace("(", "") + "²");
      }
      // Swap + and - on constants only
      const numericSwap = correct.replace(/(\d+)\)/, (m, n) => `${parseInt(n) + 1})`);
      if (numericSwap !== correct) algVariants.push(numericSwap.slice(0, 30));
      // Common wrong: forget the ² stays
      if (correct.includes("²")) algVariants.push(correct.replace("²", "").slice(0, 30));
      // "لا يمكن التحليل" for factoring questions
      algVariants.push("لا يمكن التحليل");

      for (const v of algVariants) {
        if (wrongs.length >= count) break;
        if (v && v !== correct && !wrongs.includes(v) && v.length > 0) wrongs.push(v);
      }
    } else {
      // Numeric distractors — stay close to correct value
      const base = Math.abs(num);
      const candidates = [
        num + 1, num - 1, num * 2, Math.round(num / 2 * 10) / 10,
        -num, num + 0.5, num - 0.5,
      ].filter(v => v !== num && v !== 0 && !isNaN(v));

      for (const v of candidates) {
        if (wrongs.length >= count) break;
        const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
        if (!wrongs.includes(s) && s !== String(num)) wrongs.push(s);
      }
    }

    while (wrongs.length < count) wrongs.push(`${wrongs.length + 2}`);
    return wrongs.slice(0, count);
  }

  const correctAnswer = exercise.answers.find(isValidAnswer) ?? "";
  const rawWrong = exercise.answers.slice(1).filter(isValidAnswer);
  const extraWrong = rawWrong.length < 3
    ? generateWrongAnswers(correctAnswer, 3 - rawWrong.length, domain)
    : [];
  const allWrong = [...rawWrong, ...extraWrong].slice(0, 3);

  // Build 4-item pool: 1 correct + 3 wrong, then shuffle
  const answerPool = correctAnswer
    ? [
        { text: correctAnswer, isCorrect: true },
        ...allWrong.map(t => ({ text: t, isCorrect: false })),
      ]
    : [];

  // Deterministic shuffle based on exercise URL
  const seed = (exercise.url || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = [...answerPool].sort((a, b) =>
    ((a.text.charCodeAt(0) * 31 + seed) % 13) - ((b.text.charCodeAt(0) * 31 + seed) % 13)
  );

  return (
    <div
      style={{
        fontFamily: "'Tajawal', 'Segoe UI', system-ui, sans-serif",
        backgroundColor: d.bg,
        minHeight: "100dvh",  /* dvh for Telegram/mobile keyboard handling */
        direction: "rtl",
        WebkitTextSizeAdjust: "100%",  /* prevent iOS font boost */
      }}
      className="scroll-safe"
    >
      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div style={{ background: d.banner, padding: "20px 16px 18px", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -20, left: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", bottom: -15, right: 15, width: 55, height: 55, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#fff", fontWeight: 700, backdropFilter: "blur(4px)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {d.emoji} {d.label}
            </span>
            {meta.grade_id && (
              <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.95)" }}>
                {meta.grade_id}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1.45, marginBottom: 4, wordBreak: "break-word" }}>
            {exercise.title || "تمرين رياضي"}
          </h1>
          {(meta.unit || meta.topic) && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500, margin: 0 }}>
              {[meta.unit, meta.topic].filter(Boolean).join("  •  ")}
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: "14px 14px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Statement ────────────────────────────────────────────────── */}
        {exercise.statement && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", borderRight: `4px solid ${d.accent}`, overflow: "hidden" }}>
            <div style={{ background: d.pill, padding: "10px 16px", borderBottom: `1px solid ${d.accentLight}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: d.accentText }}>📝 نص التمرين</span>
            </div>
            <div style={{ padding: "14px 16px", fontSize: 15, lineHeight: 1.9, color: "#1e293b" }} dir="auto">
              {exercise.statement.split("\n").map((line, i) => (
                <div key={i}><InlineMath text={line} /></div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── KB Pattern card ─────────────────────────────────────────── */}
        {kbPattern && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
            style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", borderRight: `4px solid #7c3aed`, overflow: "hidden" }}>
            <button
              onClick={() => setShowKbPattern(v => !v)}
              style={{ width: "100%", background: "#fdf4ff", padding: "10px 16px", borderBottom: showKbPattern ? "1px solid #e9d5ff" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>
                📐 النمط: {kbPattern.name}
              </span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{showKbPattern ? "▲ إخفاء" : "▼ عرض الخطوات"}</span>
            </button>
            {showKbPattern && (
              <div style={{ padding: "14px 16px" }}>
                {kbPattern.description && (
                  <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, lineHeight: 1.7 }}>{kbPattern.description}</p>
                )}
                {kbPattern.steps.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    {kbPattern.steps.map((step, si) => (
                      <div key={si} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{si + 1}</div>
                        <div style={{ fontSize: 13, color: "#374151", fontFamily: "monospace", background: "#f5f3ff", padding: "4px 8px", borderRadius: 6, flex: 1, wordBreak: "break-all" }}>{step}</div>
                      </div>
                    ))}
                  </div>
                )}
                {kbPattern.linked_needs.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af", alignSelf: "center" }}>مفاهيم:</span>
                    {kbPattern.linked_needs.map((n, ni) => (
                      <span key={ni} style={{ fontSize: 11, background: "#ede9fe", color: "#5b21b6", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{n}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Questions ───────────────────────────────────────────────── */}
        {exercise.questions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: d.accentText, marginBottom: 12, paddingRight: 4 }}>
              ✅ المطلوب
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {exercise.questions.map((q, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 + i * 0.06 }}
                  style={{ background: "#fff", borderRadius: 14, padding: "14px 14px", boxShadow: "0 1px 10px rgba(0,0,0,0.05)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 34, height: 34, borderRadius: "50%", background: d.banner, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 15, lineHeight: 1.8, color: "#1e293b", paddingTop: 4, flex: 1 }} dir="auto">
                    <InlineMath text={q.replace(/^\d+[\.\)]\s*/, "")} />
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── SOTA Engine Analysis (full ExerciseResult) ──────────────── */}
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", overflow: "hidden" }}
          >
            {/* Collapsible header */}
            <button
              onClick={() => setShowEngine(v => !v)}
              style={{ width: "100%", padding: "14px 16px", minHeight: 52, background: d.pill, borderBottom: showEngine ? `1px solid ${d.accentLight}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", border: "none", outline: "none" }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: d.accentText, display: "flex", alignItems: "center", gap: 8 }}>
                ⚡ تفكيك التمرين
                {hasEngine && (
                  <span style={{ fontSize: 11, background: "#34D399", color: "#fff", borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>
                    محلول ✓
                  </span>
                )}
              </span>
              <span style={{ fontSize: 18, color: d.accent }}>{showEngine ? "▲" : "▼"}</span>
            </button>

            <AnimatePresence>
              {showEngine && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  {/* Render full ExerciseResult — same component used in desktop */}
                  <div style={{ overflowX: "hidden", direction: "ltr" }}>
                    <ExerciseResult
                      exercise={parsed}
                      algebraResults={algebraResults}
                      geometryResult={geometryResult}
                      statisticsResult={statisticsResult}
                      probabilityResult={probabilityResult}
                      functionsResult={functionsResult}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Answer choices ─────────────────────────────────────────── */}
        {shuffled.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.22 }}
            style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ background: d.pill, padding: "14px 16px", borderBottom: `1px solid ${d.accentLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: d.accentText }}>🎯 اختر الإجابة</span>
              {revealAnswers && (
                <button onClick={() => { setRevealAnswers(false); setSelectedAnswer(null); }}
                  style={{ fontSize: 12, color: d.accent, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", margin: "-4px" }}>
                  إعادة المحاولة ↩
                </button>
              )}
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {shuffled.map((item, i) => {
                const isSelected = selectedAnswer === i;
                let bg = "#F8FAFC", border = "#E2E8F0", textColor = "#374151";
                if (revealAnswers) {
                  if (item.isCorrect) { bg = "#ECFDF5"; border = "#34D399"; textColor = "#065F46"; }
                  else if (isSelected) { bg = "#FFF1F2"; border = "#F87171"; textColor = "#991B1B"; }
                  else { bg = "#F9FAFB"; border = "#E5E7EB"; textColor = "#9CA3AF"; }
                } else if (isSelected) {
                  bg = d.pill; border = d.accent; textColor = d.accentText;
                }

                return (
                  <motion.button key={i} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (!revealAnswers) {
                        setSelectedAnswer(i);
                        setRevealAnswers(true);
                        // Record to SM-2 progress store
                        recordExercise(
                          domain as Domain,
                          parsed?.classification.subdomain ?? domain,
                          exercise.statement || exercise.title || exercise.url,
                          item.isCorrect,
                        );
                      }
                    }}
                    style={{ background: bg, border: `2px solid ${border}`, borderRadius: 14, padding: "16px", minHeight: 60, textAlign: "right", cursor: revealAnswers ? "default" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 12, width: "100%", outline: "none" }}
                    dir="rtl">
                    {revealAnswers ? (
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: item.isCorrect ? "#34D399" : (isSelected ? "#F87171" : "#E5E7EB"), color: item.isCorrect || isSelected ? "#fff" : "#9CA3AF", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {item.isCorrect ? "✓" : (isSelected ? "✗" : "")}
                      </span>
                    ) : (
                      <span style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${isSelected ? d.accent : "#CBD5E1"}`, background: isSelected ? d.accent : "transparent", flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 15, color: textColor, fontWeight: item.isCorrect && revealAnswers ? 800 : 600, lineHeight: 1.6, flex: 1 }}>
                      <InlineMath text={item.text} />
                    </span>
                  </motion.button>
                );
              })}

              <AnimatePresence>
                {revealAnswers && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    style={{ background: shuffled[selectedAnswer ?? -1]?.isCorrect ? "#ECFDF5" : "#FFF7ED", border: `1px solid ${shuffled[selectedAnswer ?? -1]?.isCorrect ? "#A7F3D0" : "#FED7AA"}`, borderRadius: 12, padding: "14px 16px", textAlign: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: shuffled[selectedAnswer ?? -1]?.isCorrect ? "#065F46" : "#C2410C" }}>
                      {shuffled[selectedAnswer ?? -1]?.isCorrect ? "🎉 أحسنت! إجابة صحيحة" : "💪 تابع المحاولة، الإجابة الصحيحة باللون الأخضر"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          // No valid multiple-choice answers — show "open question" message
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.22 }}
            style={{ background: d.pill, borderRadius: 14, padding: "14px 16px", border: `1px dashed ${d.border}`, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: d.accentText, fontWeight: 600, margin: 0 }}>
              📋 سؤال مفتوح — راجع تحليل المحرك أعلاه للحصول على الحل التفصيلي
            </p>
          </motion.div>
        )}

        {/* ── Feature Tabs — الميزات الخمس ───────────────────────── */}
        <FeatureTabs
          exercise={exercise}
          parsed={parsed}
          kbPattern={kbPattern}
        />

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
          💡 elmentor — مرافقك في الرياضيات
        </div>
      </div>
    </div>
  );
}
