// ===== Algebra Editor — Step-by-step student answer input =====
import { useState, useRef, useEffect } from "react";
import { LatexRenderer } from "./LatexRenderer";

interface AlgebraEditorProps {
  onSubmit: (steps: string[]) => void;
  placeholder?: string;
  className?: string;
}

const SYMBOLS = [
  { label: "x²", insert: "x^2" },
  { label: "√", insert: "\\sqrt{}" },
  { label: "π", insert: "\\pi" },
  { label: "±", insert: "\\pm" },
  { label: "≤", insert: "\\leq" },
  { label: "≥", insert: "\\geq" },
  { label: "≠", insert: "\\neq" },
  { label: "∞", insert: "\\infty" },
  { label: "÷", insert: "\\div" },
  { label: "×", insert: "\\times" },
  { label: "frac", insert: "\\frac{}{}" },
  { label: "()", insert: "()" },
];

export function AlgebraEditor({ onSubmit, placeholder = "أدخل خطوات الحل...", className = "" }: AlgebraEditorProps) {
  const [steps, setSteps] = useState<string[]>([""]);
  const [activeStep, setActiveStep] = useState(0);
  const [preview, setPreview] = useState(false);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const addStep = () => {
    setSteps([...steps, ""]);
    setActiveStep(steps.length);
    setTimeout(() => inputRefs.current[steps.length]?.focus(), 50);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
    setActiveStep(Math.min(activeStep, newSteps.length - 1));
  };

  const insertSymbol = (symbol: string) => {
    const ref = inputRefs.current[activeStep];
    if (!ref) return;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    const current = steps[activeStep];
    const newVal = current.slice(0, start) + symbol + current.slice(end);
    updateStep(activeStep, newVal);
    setTimeout(() => {
      ref.focus();
      const cursorPos = start + symbol.length;
      ref.setSelectionRange(cursorPos, cursorPos);
    }, 10);
  };

  const handleSubmit = () => {
    const filledSteps = steps.filter(s => s.trim().length > 0);
    if (filledSteps.length > 0) onSubmit(filledSteps);
  };

  const hasContent = steps.some(s => s.trim().length > 0);

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-primary/5 to-transparent border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm">✏️</span>
          <span className="text-xs font-bold text-foreground">محرر الجبر</span>
        </div>
        <button
          onClick={() => setPreview(!preview)}
          className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {preview ? "✏️ تحرير" : "👁 معاينة"}
        </button>
      </div>

      {/* Symbol toolbar */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border bg-muted/30">
        {SYMBOLS.map((sym, i) => (
          <button
            key={i}
            onClick={() => insertSymbol(sym.insert)}
            className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all"
            title={sym.insert}
          >
            {sym.label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
        {steps.map((step, i) => (
          <div key={i} className="group">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1">
                {i + 1}
              </div>
              {preview && step.trim() ? (
                <div className="flex-1 p-2 rounded-lg bg-muted/30 min-h-[36px] flex items-center">
                  <LatexRenderer latex={step} className="text-sm" />
                </div>
              ) : (
                <textarea
                  ref={el => { inputRefs.current[i] = el; }}
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  onFocus={() => setActiveStep(i)}
                  placeholder={i === 0 ? placeholder : `الخطوة ${i + 1}...`}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground font-mono resize-none min-h-[36px] focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                  rows={1}
                  dir="ltr"
                  style={{ textAlign: "left" }}
                />
              )}
              {steps.length > 1 && (
                <button
                  onClick={() => removeStep(i)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs mt-2 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className="mr-3 h-3 border-r border-dashed border-primary/30" />
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border bg-muted/20">
        <button
          onClick={addStep}
          className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
        >
          + خطوة جديدة
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSubmit}
          disabled={!hasContent}
          className="px-5 py-2 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
        >
          ✓ إرسال الحل
        </button>
      </div>
    </div>
  );
}
