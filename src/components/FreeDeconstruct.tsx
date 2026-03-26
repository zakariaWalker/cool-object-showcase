// ===== تفكيك التمرين الحر — KB فقط =====
// يبحث في KB عن أقرب نمط ويعرض خطوات التفكيك

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface DeconstructResult {
  kbPattern: KBPattern;
  steps: { step: number; title: string; explanation: string }[];
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
  const [error, setError] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

  async function deconstruct() {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true); setError(""); setResult(null);

    try {
      const res = await fetch(`${apiBase}/api/kb/patterns?limit=50`);
      if (!res.ok) throw new Error("تعذر الاتصال بقاعدة المعرفة");
      
      const data = await res.json();
      const patterns: KBPattern[] = data.patterns ?? [];
      const scored = patterns
        .map(p => ({ ...p, score: scorePattern(p, text) }))
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0 || scored[0].score === 0) {
        setError("لم يُعثر على نمط مطابق في قاعدة المعرفة. جرّب صياغة مختلفة.");
        setLoading(false);
        return;
      }

      const kbPattern = scored[0];
      setResult({
        kbPattern,
        steps: kbPattern.steps.map((s, i) => ({
          step: i + 1,
          title: `خطوة ${i + 1}`,
          explanation: s,
        })),
      });
      setExpandedStep(0);
    } catch {
      setError("حدث خطأ في البحث — تحقق من الشبكة أو أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>

      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "hsl(var(--foreground))", margin: "0 0 4px 0" }}>🔬 تفكيك التمرين الحر</h3>
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7 }}>
          اكتب أي تمرين رياضي وسيُفكَّك لك خطوة بخطوة من قاعدة المعرفة.
        </p>
      </div>

      {/* Examples */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => setInput(ex.text)}
            style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", border: "1px solid hsl(var(--border))", cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            {ex.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="اكتب تمرينك هنا...
مثال: cos(x) = 1/2، احسب sin(x) و tan(x)"
        rows={4}
        style={{
          width: "100%", resize: "vertical", borderRadius: 14,
          border: "1.5px solid hsl(var(--border))", padding: "12px 14px",
          fontSize: 14, fontFamily: "'Tajawal', sans-serif",
          direction: "rtl", outline: "none", lineHeight: 1.7,
          background: "hsl(var(--muted))", color: "hsl(var(--foreground))",
          boxSizing: "border-box", transition: "border 0.2s",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
      />

      {/* Submit button */}
      <button
        onClick={deconstruct}
        disabled={!input.trim() || loading}
        style={{
          background: input.trim() && !loading
            ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))"
            : "hsl(var(--muted))",
          color: input.trim() && !loading ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
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
            🔍 البحث في قاعدة المعرفة...
          </>
        ) : "🔬 فكّك التمرين"}
      </button>

      {/* Error */}
      {error && (
        <div style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "hsl(var(--destructive))" }}>
          {error}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Header */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "hsl(var(--foreground))" }}>{result.kbPattern.name}</span>
              <span style={{ fontSize: 11, background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                {result.kbPattern.type_ar ?? result.kbPattern.type}
              </span>
              <span style={{ fontSize: 10, background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginRight: "auto" }}>
                KB فقط
              </span>
            </div>

            {/* KB pattern info */}
            <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: "10px 14px" }}>
              <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "0 0 2px 0" }}>📐 نمط KB متطابق:</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>{result.kbPattern.name}</p>
              {result.kbPattern.description && (
                <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "4px 0 0 0", lineHeight: 1.7 }}>{result.kbPattern.description}</p>
              )}
            </div>

            {/* Concepts */}
            {result.kbPattern.concepts.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "0 0 6px 0", fontWeight: 600 }}>🧠 المفاهيم:</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {result.kbPattern.concepts.map((c, i) => (
                    <span key={i} style={{ fontSize: 11, background: "hsl(var(--muted))", color: "hsl(var(--foreground))", padding: "3px 10px", borderRadius: 10, fontWeight: 600 }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Steps accordion */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 8px 0" }}>
                📋 خطوات الحل ({result.steps.length} خطوات)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.steps.map((s, i) => {
                  const open = expandedStep === i;
                  return (
                    <div key={i} style={{
                      background: open ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                      border: `1px solid ${open ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                      borderRadius: 12, overflow: "hidden", transition: "all 0.2s",
                    }}>
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
                          background: open ? "hsl(var(--primary))" : "hsl(var(--muted))",
                          color: open ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                          fontSize: 13, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {s.step}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: open ? "hsl(var(--primary))" : "hsl(var(--foreground))", flex: 1, textAlign: "right" }}>
                          {s.title}
                        </span>
                        <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{open ? "▲" : "▼"}</span>
                      </button>

                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ padding: "0 14px 14px" }}>
                              <p style={{ fontSize: 13, color: "hsl(var(--foreground))", lineHeight: 1.8, margin: 0 }}>
                                {s.explanation}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Needs */}
            {(result.kbPattern.linked_needs ?? []).length > 0 && (
              <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 8px 0" }}>
                  ⚡ المتطلبات المسبقة
                </p>
                {result.kbPattern.linked_needs!.map((n, i) => (
                  <p key={i} style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: "0 0 4px 0", lineHeight: 1.7 }}>
                    • {n}
                  </p>
                ))}
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => { setResult(null); setInput(""); }}
              style={{
                background: "none", border: "1px solid hsl(var(--border))", borderRadius: 10,
                padding: "8px", fontSize: 12, color: "hsl(var(--muted-foreground))", cursor: "pointer",
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
