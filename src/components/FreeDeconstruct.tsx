// ===== تفكيك التمرين الحر — KB + Gemini =====
// 1. يبحث في KB عن أقرب نمط
// 2. يرسل التمرين + النمط لـ Gemini لشرح خطوة بخطوة بالعربية
// Student types any exercise → Gemini deconstructs it step by step in Arabic.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = (import.meta.env.VITE_GEMINI_KEY ?? import.meta.env.VITE_GEMINI_API_KEY ?? "");
const GEMINI_MODEL = "gemini-2.0-flash";

interface KBPattern {
  kb_id: string;
  name: string;
  type: string;
  type_ar?: string;
  description: string;
  steps: string[];
  concepts: string[];
  linked_needs?: string[];
}

interface DeconstructStep {
  step: number;
  title: string;
  explanation: string;
  formula?: string;
  why: string;
}

interface DeconstructResult {
  kbPattern: KBPattern | null;
  concept: string;
  domain: string;
  difficulty: string;
  prerequisites: string[];
  steps: DeconstructStep[];
  common_mistakes: string[];
  summary: string;
  source: "kb+ai" | "ai_only" | "kb_only";
}

// ─── KB keyword matching ───────────────────────────────────────────────────────

const TYPE_KEYWORDS: Record<string, string[]> = {
  equations:       ["معادل", "equation", "équation", "حل", "مجهول"],
  triangle_circle: ["مثلث", "triangle", "دائرة", "cercle", "وتر", "فيثاغورس"],
  functions:       ["دالة", "fonction", "function", "مشتقة", "f(x)", "تغيرات"],
  statistics:      ["متوسط", "moyenne", "وسيط", "انحراف", "تكرار", "إحصاء"],
  probability:     ["احتمال", "probabilité", "probability", "نرد", "كرة", "عملة"],
  sequences:       ["متتالية", "suite", "sequence", "حسابية", "هندسية"],
  factoring:       ["حلل", "factoriser", "factor", "عوامل", "توزيع"],
  simplification:  ["بسط", "simplifier", "simplify", "أنشر", "développer", "expand"],
  geometry:        ["مساحة", "aire", "area", "محيط", "périmètre", "perimeter"],
  inequalities:    ["متراجح", "inégalité", "inequality", "أكبر", "أصغر"],
};

function scorePattern(pat: KBPattern, text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of TYPE_KEYWORDS[pat.type] ?? [])
    if (lower.includes(kw.toLowerCase())) score += 3;
  for (const w of (pat.name + " " + pat.description).toLowerCase().split(/\s+/))
    if (w.length > 3 && lower.includes(w)) score += 1;
  for (const c of pat.concepts ?? [])
    if (lower.includes(c.toLowerCase())) score += 2;
  return score;
}

const TYPE_COLOR: Record<string, string> = {
  equations: "#4F46E5", triangle_circle: "#059669", functions: "#E11D48",
  statistics: "#D97706", probability: "#7C3AED", sequences: "#0891B2",
  factoring: "#4F46E5", simplification: "#4F46E5", geometry: "#059669",
  inequalities: "#DC2626",
};

const EXAMPLES = [
  { label: "جبر",    text: "أنشر وبسّط: A = 3(2x − 5) + 4(x + 3)" },
  { label: "هندسة", text: "مثلث ABC قائم في A، AB=6cm، AC=8cm. احسب BC." },
  { label: "احتمال",text: "نرمي نرداً مرة. احسب احتمال الحصول على عدد أكبر من 4." },
  { label: "دوال",  text: "f(x) = x² − 4x + 3. احسب f'(x) وجذورها." },
  { label: "نسب مثلثية", text: "cos(x) = 1/2، احسب sin(x) و tan(x)" },
];

export function FreeDeconstruct() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DeconstructResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

  async function deconstruct() {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true); setError(""); setResult(null);

    let kbPattern: KBPattern | null = null;

    // ── Step 1: Search KB ──────────────────────────────────────────────────
    try {
      setLoadingMsg("🔍 البحث في قاعدة المعرفة...");
      const res = await fetch(`${apiBase}/api/kb/patterns?limit=50`);
      if (res.ok) {
        const data = await res.json();
        const patterns: KBPattern[] = data.patterns ?? [];
        const scored = patterns
          .map(p => ({ ...p, score: scorePattern(p, text) }))
          .sort((a, b) => (b as any).score - (a as any).score);
        if (scored.length > 0 && (scored[0] as any).score > 0) {
          kbPattern = scored[0];
        }
      }
    } catch { /* KB unavailable — continue to AI */ }

    // ── Step 2: Gemini with KB context ────────────────────────────────────
    if (!GEMINI_KEY) {
      if (!kbPattern) {
        setError("لا يوجد تطابق في الـ KB ومفتاح Gemini غير مُهيَّأ.");
        setLoading(false);
        return;
      }
      setResult({
        kbPattern,
        concept: kbPattern.name,
        domain: kbPattern.type_ar ?? kbPattern.type,
        difficulty: "غير محدد",
        prerequisites: [],
        steps: kbPattern.steps.map((s, i) => ({ step: i + 1, title: `خطوة ${i + 1}`, explanation: s, why: "" })),
        common_mistakes: [],
        summary: kbPattern.description,
        source: "kb_only",
      });
      setLoading(false);
      return;
    }

    try {
      setLoadingMsg("🤖 Gemini يشرح الخطوات...");

      const kbContext = kbPattern
        ? `النمط من قاعدة المعرفة: "${kbPattern.name}"
النوع: ${kbPattern.type_ar ?? kbPattern.type}
الوصف: ${kbPattern.description}
الخطوات المعروفة: ${kbPattern.steps.join(" → ")}
المفاهيم: ${[...(kbPattern.concepts ?? []), ...(kbPattern.linked_needs ?? [])].join(", ")}`
        : "لم يُعثر على نمط في قاعدة المعرفة.";

      const prompt = `أنت مدرّس رياضيات خبير في المنهج الجزائري (BEM/BAC).

التمرين: "${text}"

${kbContext}

فكّك هذا التمرين تفكيكاً كاملاً بالعربية الجزائرية التعليمية.
أجب فقط بـ JSON صحيح (لا تضف نصاً خارجه):
{
  "concept": "اسم المفهوم الرئيسي",
  "domain": "الجبر أو الهندسة أو الإحصاء أو الاحتمالات أو الدوال",
  "difficulty": "سهل أو متوسط أو صعب",
  "prerequisites": ["مفهوم 1", "مفهوم 2"],
  "steps": [
    { "step": 1, "title": "عنوان الخطوة", "explanation": "شرح واضح", "formula": "القانون أو المعادلة (اختياري)", "why": "لماذا هذه الخطوة" }
  ],
  "common_mistakes": ["خطأ شائع 1", "خطأ شائع 2"],
  "summary": "ملخص الطريقة في جملة"
}`;

      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const res = await model.generateContent(prompt);
      const raw = res.response.text();
      
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("لم يُعطِ الذكاء الاصطناعي إجابة صحيحة");
      const parsed = JSON.parse(jsonMatch[0]);

      setResult({
        kbPattern,
        concept: parsed.concept ?? kbPattern?.name ?? "—",
        domain: parsed.domain ?? kbPattern?.type_ar ?? "—",
        difficulty: parsed.difficulty ?? "—",
        prerequisites: parsed.prerequisites ?? [],
        steps: parsed.steps ?? [],
        common_mistakes: parsed.common_mistakes ?? [],
        summary: parsed.summary ?? "",
        source: kbPattern ? "kb+ai" : "ai_only",
      });
      setExpandedStep(0);
    } catch (e) {
      setError("حدث خطأ في التفكيك — تحقق من الشبكة أو أعد المحاولة.");
      console.error("[FreeDeconstruct]", e);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  const DOMAIN_COLOR: Record<string, string> = {
    "الجبر": "#4F46E5", "الهندسة": "#059669", "الإحصاء": "#D97706",
    "الاحتمالات": "#7C3AED", "الدوال": "#E11D48",
  };
  const DIFF_COLOR: Record<string, string> = {
    "سهل": "#059669", "متوسط": "#D97706", "صعب": "#DC2626",
  };

  const accent = result?.kbPattern
    ? (TYPE_COLOR[result.kbPattern.type] ?? "#4F46E5")
    : result?.domain
    ? (DOMAIN_COLOR[result.domain] ?? "#4F46E5")
    : "#4F46E5";

  const SOURCE_BADGE: Record<string, { text: string; bg: string; color: string }> = {
    "kb+ai":   { text: "KB + Gemini", bg: "#ECFDF5", color: "#059669" },
    "ai_only": { text: "Gemini فقط",  bg: "#EEF2FF", color: "#4F46E5" },
    "kb_only": { text: "KB فقط",      bg: "#FFFBEB", color: "#D97706" },
  };

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: "0 0 4px 0" }}>🔬 تفكيك التمرين الحر</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.7 }}>
          اكتب أي تمرين رياضي وسيُفكَّك لك خطوة بخطوة بالعربية مع سبب كل خطوة.
        </p>
      </div>

      {/* Examples */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => setInput(ex.text)}
            style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE", cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            {ex.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ position: "relative" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="اكتب تمرينك هنا...
مثال: cos(x) = 1/2، احسب sin(x) و tan(x)"
          rows={4}
          style={{
            width: "100%", resize: "vertical", borderRadius: 14,
            border: "1.5px solid #D1D5DB", padding: "12px 14px",
            fontSize: 14, fontFamily: "'Tajawal', sans-serif",
            direction: "rtl", outline: "none", lineHeight: 1.7,
            background: "#F9FAFB", boxSizing: "border-box",
            transition: "border 0.2s",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "#4F46E5"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "#D1D5DB"; }}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={deconstruct}
        disabled={!input.trim() || loading}
        style={{
          background: input.trim() && !loading
            ? "linear-gradient(135deg, #4F46E5, #7C3AED)"
            : "#E5E7EB",
          color: input.trim() && !loading ? "#fff" : "#9CA3AF",
          border: "none", borderRadius: 12, padding: "14px",
          fontSize: 14, fontWeight: 800, cursor: input.trim() && !loading ? "pointer" : "default",
          fontFamily: "'Tajawal', sans-serif",
          transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {loading ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{ display: "inline-block" }}
            >⚙️</motion.span>
            {loadingMsg || "جارٍ التفكيك..."}
          </>
        ) : "🔬 فكّك التمرين"}
      </button>

      {/* Error display */}
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Header chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>{result.concept}</span>
              <span style={{ fontSize: 11, background: `${accent}18`, color: accent, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{result.domain}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: `${DIFF_COLOR[result.difficulty] ?? "#6b7280"}18`, color: DIFF_COLOR[result.difficulty] ?? "#6b7280", padding: "2px 10px", borderRadius: 10 }}>
                {result.difficulty}
              </span>
              {/* Source badge */}
              {(() => { const b = SOURCE_BADGE[result.source]; return <span style={{ fontSize: 10, background: b.bg, color: b.color, padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginRight: "auto" }}>{b.text}</span>; })()}
            </div>

            {/* KB pattern name if found */}
            {result.kbPattern && (
              <div style={{ background: `${accent}05`, border: `1px solid ${accent}15`, borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 2px 0" }}>📐 نمط KB متطابق:</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: 0 }}>{result.kbPattern.name}</p>
              </div>
            )}

            {/* Prerequisites */}
            {result.prerequisites.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px 0", fontWeight: 600 }}>🧠 المتطلبات الأساسية:</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {result.prerequisites.map((p, i) => (
                    <span key={i} style={{ fontSize: 11, background: "#F1F5F9", color: "#475569", padding: "3px 10px", borderRadius: 10, fontWeight: 600 }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Steps accordion */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px 0" }}>
                📋 خطوات الحل ({result.steps.length} خطوات)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.steps.map((s, i) => {
                  const open = expandedStep === i;
                  return (
                    <div
                      key={i}
                      style={{
                        background: open ? `${accent}08` : "#fff",
                        border: `1px solid ${open ? accent : "#E5E7EB"}`,
                        borderRadius: 12, overflow: "hidden",
                        transition: "all 0.2s",
                      }}
                    >
                      <button
                        onClick={() => setExpandedStep(open ? null : i)}
                        style={{
                          width: "100%", background: "none", border: "none",
                          padding: "12px 14px", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10,
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          background: open ? accent : "#F1F5F9",
                          color: open ? "#fff" : "#64748B",
                          fontSize: 13, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {s.step}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: open ? accent : "#1e293b", flex: 1, textAlign: "right" }}>
                          {s.title}
                        </span>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{open ? "▲" : "▼"}</span>
                      </button>

                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, margin: 0 }}>
                                {s.explanation}
                              </p>
                              {s.formula && (
                                <div style={{ background: `${accent}10`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, color: accent, direction: "ltr", textAlign: "center" }}>
                                  {s.formula}
                                </div>
                              )}
                              {s.why && (
                                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                                  <span style={{ fontSize: 11, background: "#FFFBEB", color: "#92400E", padding: "2px 8px", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" }}>
                                    💡 لماذا؟
                                  </span>
                                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.7 }}>{s.why}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Common mistakes */}
            {result.common_mistakes.length > 0 && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#C2410C", margin: "0 0 8px 0" }}>
                  ⚠️ أخطاء شائعة يجب تجنّبها
                </p>
                {result.common_mistakes.map((m, i) => (
                  <p key={i} style={{ fontSize: 12, color: "#92400E", margin: "0 0 4px 0", lineHeight: 1.7 }}>
                    • {m}
                  </p>
                ))}
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <div style={{ background: `${accent}10`, borderRadius: 12, padding: "12px 14px", borderRight: `4px solid ${accent}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: accent, margin: "0 0 4px 0" }}>📌 ملخص</p>
                <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.8 }}>{result.summary}</p>
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setInput(""); }}
              style={{
                background: "none", border: "1px solid #E5E7EB", borderRadius: 10,
                padding: "8px", fontSize: 12, color: "#6b7280", cursor: "pointer",
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              🔄 تمرين جديد
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
