// ===== Algebra Solving Guide Panel =====
// Visual scaffold that explains *how* and *what* to use to solve a given
// algebra problem: detected kind, method, ordered steps, key symbols and
// a LaTeX example skeleton. Pure presentation — no business logic.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Sparkles,
  ListOrdered,
  Calculator,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { LatexRenderer } from "./LatexRenderer";
import { getAlgebraStrategy } from "@/engine/algebra-strategy";

interface AlgebraSolvingGuideProps {
  problemText: string;
  className?: string;
}

export function AlgebraSolvingGuide({
  problemText,
  className = "",
}: AlgebraSolvingGuideProps) {
  const [open, setOpen] = useState(true);
  const strategy = getAlgebraStrategy(problemText);

  return (
    <div
      className={`rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <Sparkles size={16} />
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-wider text-primary">
              دليل الحلّ الذكيّ
            </div>
            <div className="text-sm font-bold text-foreground">
              {strategy.titleAr}
            </div>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
              {/* Method */}
              <div className="rounded-lg bg-card border border-border/60 p-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  <Lightbulb size={12} className="text-amber-500" />
                  الطريقة المقترحة
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {strategy.methodAr}
                </p>
              </div>

              {/* Ordered steps */}
              <div className="rounded-lg bg-card border border-border/60 p-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                  <ListOrdered size={12} className="text-primary" />
                  خطوات الحلّ
                </div>
                <ol className="space-y-1.5">
                  {strategy.bulletStepsAr.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground/90 leading-relaxed">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Key symbols */}
              {strategy.keySymbols.length > 0 && (
                <div className="rounded-lg bg-card border border-border/60 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                    <Calculator size={12} className="text-primary" />
                    الرّموز التي ستستعملها
                  </div>
                  <div className="flex flex-wrap gap-1.5" dir="ltr">
                    {strategy.keySymbols.map((sym, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold border border-primary/20"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* LaTeX example skeleton */}
              {strategy.exampleStepsLatex.length > 0 && (
                <div className="rounded-lg bg-muted/30 border border-border/60 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                    مثال على الشكل المتوقّع
                  </div>
                  <div className="space-y-1.5" dir="ltr">
                    {strategy.exampleStepsLatex.map((line, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded bg-card border border-border/40"
                      >
                        <LatexRenderer
                          latex={line}
                          className="text-sm text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitfalls */}
              {strategy.pitfallsAr && strategy.pitfallsAr.length > 0 && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/30 p-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-600 mb-2">
                    <AlertTriangle size={12} />
                    احذر من هذه الأخطاء
                  </div>
                  <ul className="space-y-1">
                    {strategy.pitfallsAr.map((p, i) => (
                      <li
                        key={i}
                        className="text-xs text-foreground/80 leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
