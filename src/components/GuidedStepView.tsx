// ===== Guided Step-by-Step Exercise View =====
// Progressive disclosure: shows one step at a time with interactive choices

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import katex from "katex";
import "katex/dist/katex.min.css";
import { MathExerciseRenderer } from "./MathExerciseRenderer";
import { GeometryCanvas } from "./geometry/GeometryCanvas";
import { AlgebraEditor } from "./AlgebraEditor";
import { inferAnswerSchema } from "@/engine/answer-schema";
import { inferConstraints } from "@/engine/figures/construction-checks";
import { buildAutoFigureSpec } from "@/engine/figures/factory";

interface GuidedStepViewProps {
  exerciseText: string;
  patternName: string;
  patternType: string;
  patternDescription?: string;
  steps: string[];
  needs: string[];
  concepts: string[];
  notes?: string;
  aiGenerated?: boolean;
  mathExpressions?: string[];
  onComplete?: () => void;
}

function InlineMath({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, { displayMode: false, throwOnError: false, trust: true });
      } catch { if (ref.current) ref.current.textContent = latex; }
    }
  }, [latex]);
  return <span ref={ref} dir="ltr" className="inline-block" style={{ unicodeBidi: "isolate", direction: "ltr" }} />;
}

export function GuidedStepView({
  exerciseText, patternName, patternType, patternDescription,
  steps, needs, concepts, notes, aiGenerated, mathExpressions, onComplete,
}: GuidedStepViewProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = exercise view, 0+ = steps
  const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set());
  const [userChoices, setUserChoices] = useState<Record<number, string>>({});
  const [showFeedback, setShowFeedback] = useState<number | null>(null);

  const totalSteps = steps.length;
  const isComplete = revealedSteps.size === totalSteps;

  // Auto-detect a figure for geometry exercises so the canvas can seed itself.
  const figureSpec = useMemo(
    () => buildAutoFigureSpec({ text: exerciseText, type: patternType }),
    [exerciseText, patternType],
  );

  const handleRevealStep = (idx: number) => {
    setRevealedSteps(prev => new Set([...prev, idx]));
    setCurrentStep(idx);
    if (idx === totalSteps - 1 && onComplete) {
      setTimeout(onComplete, 500);
    }
  };

  const handleNextStep = () => {
    const next = currentStep + 1;
    if (next < totalSteps) {
      setCurrentStep(next);
    }
  };

  // Generate a simple quiz for each step (what should be done next?)
  const getStepChoices = (stepIdx: number): { label: string; correct: boolean }[] => {
    if (stepIdx >= totalSteps) return [];
    const correctStep = steps[stepIdx];
    
    // Create distractors from other steps or generic options
    const distractors = steps
      .filter((_, i) => i !== stepIdx)
      .slice(0, 2)
      .map(s => ({ label: s.length > 60 ? s.slice(0, 57) + "..." : s, correct: false }));
    
    const correct = { label: correctStep.length > 60 ? correctStep.slice(0, 57) + "..." : correctStep, correct: true };
    
    // Shuffle
    const all = [...distractors, correct].sort(() => Math.random() - 0.5);
    return all.length >= 2 ? all : [correct];
  };

  return (
    <div dir="rtl" className="border-t border-border bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg">
          🧭
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-extrabold text-foreground" style={{ fontFamily: "'Tajawal', sans-serif" }}>
            {patternName}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {patternType} {aiGenerated && "• 🤖 تفكيك آلي"} • {totalSteps} خطوات
          </p>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                revealedSteps.has(i) 
                  ? "bg-primary scale-110" 
                  : i === currentStep 
                    ? "bg-primary/40 animate-pulse" 
                    : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Exercise text */}
      <div className="p-4 bg-card/50 border-b border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">📝 التمرين</div>
        <div className="bg-background border border-border rounded-xl p-4 text-sm leading-relaxed">
          <MathExerciseRenderer text={exerciseText} showDiagram />
        </div>
      </div>

      {/* Prerequisite concepts */}
      {needs.length > 0 && currentStep === -1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-border/50"
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">🔑 المفاهيم المطلوبة</div>
          <div className="flex flex-wrap gap-2">
            {needs.map((need, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                {need}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Step-by-step guided area */}
      <div className="p-4 space-y-3">
        {currentStep === -1 ? (
          /* Initial state: "Ready to start?" */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <div className="text-3xl mb-3">🎯</div>
            <h4 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              جاهز لاكتشاف الحل؟
            </h4>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed max-w-sm mx-auto">
              سنرشدك خطوة بخطوة. حاول التفكير قبل كشف كل خطوة.
            </p>
            {patternDescription && (
              <p className="text-xs text-muted-foreground/80 mb-4 italic">
                💡 {patternDescription}
              </p>
            )}
            <button
              onClick={() => setCurrentStep(0)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              ابدأ الحل ←
            </button>
          </motion.div>
        ) : (
          /* Steps area */
          <div className="space-y-3">
            {steps.map((step, idx) => {
              if (idx > currentStep) return null;
              const isRevealed = revealedSteps.has(idx);
              const isCurrent = idx === currentStep && !isRevealed;
              const mathExpr = mathExpressions?.[idx];
              const relatedConcept = concepts[idx];

              return (
                <AnimatePresence key={idx}>
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: isCurrent ? 0.1 : 0 }}
                    className={`rounded-xl border transition-all duration-300 ${
                      isRevealed 
                        ? "border-primary/20 bg-primary/5" 
                        : isCurrent 
                          ? "border-primary/40 bg-card shadow-lg" 
                          : "border-border bg-card/50"
                    }`}
                  >
                    {/* Step header */}
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black transition-colors ${
                        isRevealed 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isRevealed ? "✓" : idx + 1}
                      </div>
                      <div className="flex-1">
                        {isRevealed ? (
                          <p className="text-sm text-foreground font-medium leading-relaxed" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            {step}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            ما هي الخطوة التالية؟
                          </p>
                        )}
                      </div>
                      {relatedConcept && isRevealed && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 flex-shrink-0">
                          {relatedConcept}
                        </span>
                      )}
                    </div>

                    {/* Math expression */}
                    {isRevealed && mathExpr && (
                      <div className="px-4 pb-3">
                        <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                          <InlineMath latex={mathExpr} />
                        </div>
                      </div>
                    )}

                    {/* Geometry canvas — appears when the revealed step is a
                        construction / observation on a figure. */}
                    {isRevealed && (() => {
                      const schema = inferAnswerSchema(exerciseText, step);
                      if (schema.type !== "construction") return null;
                      const constraints = inferConstraints(step);
                      return (
                        <div className="px-4 pb-3 space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <span>📐</span> لوحة الإنشاء التفاعلية
                          </div>
                          <GeometryCanvas seedSpec={figureSpec} constraints={constraints} />
                        </div>
                      );
                    })()}

                    {/* Interactive choice for current unrevealed step */}
                    {isCurrent && (
                      <div className="px-4 pb-4 space-y-2">
                        {totalSteps >= 3 ? (
                          /* Show quiz choices if enough steps for distractors */
                          <>
                            <p className="text-[11px] text-muted-foreground mb-2">🤔 اختر الخطوة الصحيحة:</p>
                            {getStepChoices(idx).map((choice, ci) => (
                              <button
                                key={ci}
                                onClick={() => {
                                  setUserChoices(prev => ({ ...prev, [idx]: choice.label }));
                                  if (choice.correct) {
                                    setShowFeedback(idx);
                                    setTimeout(() => {
                                      handleRevealStep(idx);
                                      setShowFeedback(null);
                                      if (idx + 1 < totalSteps) handleNextStep();
                                    }, 800);
                                  } else {
                                    setShowFeedback(idx);
                                    setTimeout(() => setShowFeedback(null), 1500);
                                  }
                                }}
                                disabled={showFeedback === idx}
                                className={`w-full text-right text-xs p-3 rounded-lg border transition-all ${
                                  showFeedback === idx && userChoices[idx] === choice.label
                                    ? choice.correct
                                      ? "border-green-500 bg-green-500/10 text-green-700"
                                      : "border-destructive bg-destructive/10 text-destructive"
                                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                                }`}
                                style={{ fontFamily: "'Tajawal', sans-serif" }}
                              >
                                {choice.label}
                              </button>
                            ))}
                          </>
                        ) : (
                          /* Simple reveal button */
                          <button
                            onClick={() => {
                              handleRevealStep(idx);
                              if (idx + 1 < totalSteps) handleNextStep();
                            }}
                            className="w-full text-center text-xs p-3 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-bold"
                          >
                            👁️ اكشف الخطوة
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              );
            })}

            {/* Completion message */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 text-center"
              >
                <div className="text-2xl mb-2">🎉</div>
                <h4 className="text-sm font-bold text-accent mb-1" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  أحسنت! أكملت كل الخطوات
                </h4>
                {notes && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">
                    💡 {notes}
                  </p>
                )}
              </motion.div>
            )}

            {/* Next step button */}
            {!isComplete && currentStep >= 0 && revealedSteps.has(currentStep) && currentStep + 1 < totalSteps && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center pt-2"
              >
                <button
                  onClick={handleNextStep}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  الخطوة التالية ←
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Concepts summary — shown after completion */}
      {isComplete && concepts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 border-t border-border/50"
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">🧠 المفاهيم المستخدمة</div>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {c}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
