import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MathExerciseRenderer } from "./MathExerciseRenderer";

/* ──────────────────────────────────────────────────────────────
   Concept Context Card
   Sits above an interactive visualization to give it pedagogical
   weight: definition, formula, worked example, key takeaways and
   common pitfalls. Designed to feel like a polished textbook
   sidebar, not a help tooltip.
   ──────────────────────────────────────────────────────────── */

export interface ConceptContext {
  /** Short curriculum chapter label, e.g. "1AM · Géométrie". */
  eyebrow: string;
  /** Main Arabic title of the concept. */
  title: string;
  /** Optional French / English subtitle. */
  subtitle?: string;
  /** One-paragraph formal definition (Arabic). */
  definition: string;
  /** Headline formula(s) in LaTeX-flavoured plain text. */
  formula?: string[];
  /** Worked example: prompt + 2-4 solution steps. */
  example?: {
    prompt: string;
    steps: string[];
  };
  /** 2-4 things every student must remember. */
  keyTakeaways: string[];
  /** 1-3 frequent student mistakes with a quick fix. */
  commonMistakes?: { mistake: string; fix: string }[];
  /** Optional accent color token. */
  accent?: "primary" | "geometry" | "statistics" | "probability" | "functions" | "algebra";
}

const ACCENT_MAP: Record<NonNullable<ConceptContext["accent"]>, string> = {
  primary: "var(--primary)",
  geometry: "var(--geometry)",
  statistics: "var(--statistics)",
  probability: "var(--probability)",
  functions: "var(--functions)",
  algebra: "var(--algebra)",
};

interface ConceptContextCardProps {
  context: ConceptContext;
}

export function ConceptContextCard({ context }: ConceptContextCardProps) {
  const [tab, setTab] = useState<"def" | "ex" | "tips">("def");
  const accent = `hsl(${ACCENT_MAP[context.accent ?? "primary"]})`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card overflow-hidden mb-4"
      dir="rtl"
    >
      {/* Header */}
      <header
        className="px-5 py-4 border-b border-border"
        style={{
          backgroundImage: `linear-gradient(to left, color-mix(in srgb, ${accent} 8%, transparent), transparent)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-[10px] font-black uppercase tracking-[0.18em] mb-1"
              style={{ color: accent }}
            >
              {context.eyebrow}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground leading-tight font-display">
              {context.title}
            </h2>
            {context.subtitle && (
              <div className="text-[11px] text-muted-foreground font-medium mt-0.5" dir="ltr">
                {context.subtitle}
              </div>
            )}
          </div>
          <div
            className="hidden sm:flex w-10 h-10 rounded-md items-center justify-center text-background flex-shrink-0"
            style={{ background: accent }}
          >
            <span className="text-base font-black font-display">∎</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 mt-3" role="tablist">
          {[
            { id: "def" as const, label: "التعريف والقاعدة" },
            { id: "ex" as const, label: "مثال محلول" },
            { id: "tips" as const, label: "نصائح وأخطاء شائعة" },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors border"
                style={{
                  background: active ? accent : "transparent",
                  color: active ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                  borderColor: active ? accent : "hsl(var(--border))",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Body */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {tab === "def" && (
            <motion.div
              key="def"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <p className="text-[13px] leading-relaxed text-foreground">
                <MathExerciseRenderer text={context.definition} />
              </p>

              {context.formula && context.formula.length > 0 && (
                <div
                  className="rounded-md border border-dashed p-4 space-y-2"
                  style={{
                    borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
                    background: `color-mix(in srgb, ${accent} 4%, transparent)`,
                  }}
                  dir="ltr"
                >
                  <div
                    className="text-[9px] font-black uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    Formule clé
                  </div>
                  {context.formula.map((f, i) => (
                    <div key={i} className="text-[14px] font-display text-foreground">
                      <MathExerciseRenderer text={f} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "ex" && context.example && (
            <motion.div
              key="ex"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              <div className="text-[12px] font-bold text-foreground">
                <MathExerciseRenderer text={context.example.prompt} />
              </div>
              <ol className="space-y-2 mt-3">
                {context.example.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start text-[12px] leading-relaxed text-foreground"
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                      style={{
                        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                        color: accent,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <MathExerciseRenderer text={step} />
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
          )}

          {tab === "ex" && !context.example && (
            <motion.div
              key="no-ex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-muted-foreground text-center py-4"
            >
              المثال المحلول قيد الإعداد
            </motion.div>
          )}

          {tab === "tips" && (
            <motion.div
              key="tips"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Key takeaways */}
              <div>
                <div
                  className="text-[9px] font-black uppercase tracking-[0.18em] mb-2"
                  style={{ color: accent }}
                >
                  لِتتذكّر
                </div>
                <ul className="space-y-1.5">
                  {context.keyTakeaways.map((k, i) => (
                    <li
                      key={i}
                      className="flex gap-2 items-start text-[12px] leading-relaxed text-foreground"
                    >
                      <span
                        className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full"
                        style={{ background: accent }}
                      />
                      <span className="flex-1">
                        <MathExerciseRenderer text={k} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common mistakes */}
              {context.commonMistakes && context.commonMistakes.length > 0 && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] mb-2 text-destructive">
                    أخطاء شائعة
                  </div>
                  <div className="space-y-2">
                    {context.commonMistakes.map((m, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-destructive/20 bg-destructive/5 p-3"
                      >
                        <div className="flex gap-2 items-start text-[12px] text-foreground">
                          <span className="text-destructive font-black">✗</span>
                          <span className="flex-1">
                            <MathExerciseRenderer text={m.mistake} />
                          </span>
                        </div>
                        <div className="flex gap-2 items-start text-[11px] text-muted-foreground mt-1.5">
                          <span style={{ color: accent }} className="font-black">
                            ✓
                          </span>
                          <span className="flex-1">
                            <MathExerciseRenderer text={m.fix} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
