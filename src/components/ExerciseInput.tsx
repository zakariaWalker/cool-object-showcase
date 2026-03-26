// ===== Exercise Input — Student-Friendly Edition =====

import { useState, useRef, useEffect } from "react";
import { parseExercise, ParsedExercise } from "@/engine/exercise-parser";
import { Domain } from "@/engine/types";
import { motion, AnimatePresence } from "framer-motion";

interface ExerciseInputProps {
  onParsed: (exercise: ParsedExercise, rawText?: string) => void;
  error: string | null;
}

const DOMAIN_ICONS: Record<Domain, { labelAr: string; emoji: string; color: string; bg: string }> = {
  algebra:     { labelAr: "جبر",     emoji: "🔢", color: "#4F46E5", bg: "#EEF2FF" },
  geometry:    { labelAr: "هندسة",   emoji: "📐", color: "#059669", bg: "#ECFDF5" },
  statistics:  { labelAr: "إحصاء",   emoji: "📊", color: "#D97706", bg: "#FFFBEB" },
  functions:   { labelAr: "دوال",    emoji: "📈", color: "#E11D48", bg: "#FFF1F2" },
  probability: { labelAr: "احتمال",  emoji: "🎲", color: "#7C3AED", bg: "#F5F3FF" },
} as any;

const EXAMPLES = [
  {
    label: "جبر — أنشر",
    emoji: "🔢",
    text: `A = 3(2x − 5) + 4(x + 3) − 2(3x − 1)\n\nالمطلوب:\n1. أنشر ثم بسط العبارة A\n2. احسب قيمة A من أجل x = 2`,
  },
  {
    label: "هندسة — مثلث",
    emoji: "📐",
    text: `ABC مثلث قائم في A حيث:\nAB = 6 cm\nAC = 8 cm\n\nالمطلوب:\n1. احسب BC\n2. احسب مساحة المثلث`,
  },
  {
    label: "إحصاء — وسط",
    emoji: "📊",
    text: `5 8 12 15 20 7 9 11\n\nالمطلوب:\n1. احسب المتوسط الحسابي\n2. احسب الوسيط`,
  },
  {
    label: "احتمال — نرد",
    emoji: "🎲",
    text: `نرمي نرداً متوازناً مرة واحدة.\n\nاحسب احتمال الحصول على عدد زوجي.`,
  },
];

export function ExerciseInput({ onParsed, error }: ExerciseInputProps) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedExercise | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    if (text.trim().length > 10) {
      import("@/engine/exercise-parser").then(({ parseExercise, cleanMathText }) => {
        try { setPreview(parseExercise(cleanMathText(text))); } catch { setPreview(null); }
      });
    } else {
      setPreview(null);
    }
  }, [text]);

  const handleSubmit = () => {
    if (text.trim().length < 5) return;
    import("@/engine/exercise-parser").then(({ parseExercise, cleanMathText }) => {
      try { onParsed(parseExercise(cleanMathText(text)), text); } catch {}
    });
  };


  const domainInfo = preview ? DOMAIN_ICONS[preview.classification.domain] : null;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Example chips */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--muted)/0.4)" }}>
        <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          أمثلة جاهزة
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setText(ex.text)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                fontSize: 12,
                fontFamily: "'Tajawal', sans-serif",
                fontWeight: 600,
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "white",
                color: "hsl(var(--foreground))",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--primary))";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--primary))";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--foreground))";
              }}
            >
              <span>{ex.emoji}</span> {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12, gap: 10, overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            placeholder={"الصق نص التمرين هنا...\n\nمثال: ABC مثلث قائم في A حيث AB = 6 cm و AC = 8 cm"}
            dir="auto"
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              minHeight: 140,
              resize: "none",
              padding: "14px 16px",
              fontSize: 14,
              fontFamily: "'Tajawal', sans-serif",
              lineHeight: 1.8,
              color: "hsl(var(--foreground))",
              background: "white",
              border: "2px solid hsl(var(--border))",
              borderRadius: 12,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
          />
          {text.length > 0 && (
            <button
              onClick={() => { setText(""); setPreview(null); }}
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "hsl(var(--muted))",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="مسح"
            >✕</button>
          )}
        </div>

        {/* Live domain detection */}
        <AnimatePresence>
          {domainInfo && preview && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                background: domainInfo.bg,
                border: `1px solid ${domainInfo.color}33`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>{domainInfo.emoji}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: domainInfo.color, margin: 0 }}>
                  تم اكتشاف: {domainInfo.labelAr}
                </p>
                {preview.intent.tasks.length > 0 && (
                  <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: 0 }}>
                    المهام: {preview.intent.tasks.slice(0, 3).join("، ")}
                  </p>
                )}
              </div>
              <div style={{
                marginRight: "auto",
                width: 8, height: 8, borderRadius: "50%",
                background: domainInfo.color,
                animation: "pulse-soft 1.5s ease-in-out infinite"
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div style={{
            background: "#FFF1F2",
            border: "1px solid #FDA4AF",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: "#BE123C",
            fontFamily: "'Tajawal', sans-serif",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={text.trim().length < 5}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: text.trim().length >= 5
              ? "linear-gradient(135deg, #4F46E5, #7C3AED)"
              : "hsl(var(--muted))",
            color: text.trim().length >= 5 ? "white" : "hsl(var(--muted-foreground))",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'Tajawal', sans-serif",
            cursor: text.trim().length >= 5 ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            boxShadow: text.trim().length >= 5 ? "0 4px 16px rgba(79,70,229,0.35)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span>⚡ تحليل وحل التمرين</span>
          <span style={{ fontSize: 11, opacity: 0.7, fontFamily: "'Nunito', sans-serif" }}>(Ctrl+Enter)</span>
        </button>
      </div>
    </div>
  );
}
