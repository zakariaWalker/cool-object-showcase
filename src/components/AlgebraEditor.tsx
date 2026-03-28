// ===== Algebra Editor — Step-by-step student answer input =====
import { useState, useRef, useEffect } from "react";
import { LatexRenderer } from "./LatexRenderer";
import { ALGEBRA_TEMPLATES } from "./MathEditorTemplates";
import { 
  ChevronDown, Plus, Trash2, Eye, Edit3, Type, 
  Layout, CheckCircle2, GraduationCap, Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Level = "primary" | "middle" | "secondary";

interface AlgebraEditorProps {
  onSubmit: (steps: string[]) => void;
  initialLevel?: Level;
  placeholder?: string;
  className?: string;
}

const SYMBOLS: Record<Level, { label: string; insert: string; category: string }[]> = {
  primary: [
    { label: "+", insert: "+", category: "أساسي" },
    { label: "-", insert: "-", category: "أساسي" },
    { label: "×", insert: " × ", category: "أساسي" },
    { label: "÷", insert: " ÷ ", category: "أساسي" },
    { label: "=", insert: " = ", category: "أساسي" },
    { label: "frac", insert: "( )/( )", category: "كسور" },
  ],
  middle: [
    { label: "x²", insert: "x²", category: "أساسي" },
    { label: "√", insert: "√( )", category: "أساسي" },
    { label: "frac", insert: "( )/( )", category: "أساسي" },
    { label: "sin", insert: "sin( )", category: "مثلثات" },
    { label: "cos", insert: "cos( )", category: "مثلثات" },
    { label: "tan", insert: "tan( )", category: "مثلثات" },
    { label: "°", insert: "°", category: "مثلثات" },
    { label: "vec", insert: "vec( )", category: "أشعة" },
    { label: "⇒", insert: " ⇒ ", category: "منطق" },
    { label: "{=}", insert: "begin{cases}  ... \\\\  ... end{cases}", category: "جملة" },
  ],
  secondary: [
    { label: "lim", insert: "lim(x→ )", category: "تحليل" },
    { label: "∫", insert: "∫( )dx", category: "تحليل" },
    { label: "Σ", insert: "Σ(i=0, n, )", category: "تحليل" },
    { label: "ln", insert: "ln( )", category: "دوال" },
    { label: "eˣ", insert: "e^( )", category: "دوال" },
    { label: "i", insert: "i", category: "مركبة" },
    { label: "z̄", insert: "bar(z)", category: "مركبة" },
    { label: "∞", insert: "∞", category: "أساسي" },
    { label: "f'", insert: "f'(x)", category: "اشتقاق" },
    { label: "ℝ", insert: "ℝ", category: "مجموعات" },
  ]
};

const LEVEL_LABELS: Record<Level, string> = {
  primary: "ابتدائي",
  middle: "متوسط",
  secondary: "ثانوي (BAC)"
};

// Helper to convert natural text to LaTeX for rendering
export function toLatex(text: string): string {
  let l = text;
  // Basic symbols
  l = l.replace(/×/g, "\\times ");
  l = l.replace(/÷/g, "\\div ");
  l = l.replace(/±/g, "\\pm ");
  l = l.replace(/≠/g, "\\neq ");
  l = l.replace(/⇒/g, "\\Rightarrow ");
  l = l.replace(/∞/g, "\\infty ");
  l = l.replace(/ℝ/g, "\\mathbb{R} ");
  l = l.replace(/°/g, "^{\\circ}");
  l = l.replace(/≤/g, "\\leq ");
  l = l.replace(/≥/g, "\\geq ");
  l = l.replace(/π/g, "\\pi ");
  l = l.replace(/θ/g, "\\theta ");
  l = l.replace(/α/g, "\\alpha ");
  l = l.replace(/β/g, "\\beta ");
  l = l.replace(/γ/g, "\\gamma ");

  // Advanced functions
  l = l.replace(/√\((.*?)\)/g, "\\sqrt{$1}");
  l = l.replace(/√(\d+)/g, "\\sqrt{$1}"); // √2 -> \sqrt{2}
  l = l.replace(/√([a-z]|[α-ω])/gi, "\\sqrt{$1}"); // √x -> \sqrt{x}

  l = l.replace(/\((.*?)\)\/\((.*?)\)/g, "\\frac{$1}{$2}");
  l = l.replace(/(\w+)\/\((.*?)\)/g, "\\frac{$1}{$2}"); // x/(...)
  l = l.replace(/\((.*?)\)\/(\w+)/g, "\\frac{$1}{$2}"); // (...)/y

  l = l.replace(/sin\((.*?)\)/g, "\\sin($1)");
  l = l.replace(/cos\((.*?)\)/g, "\\cos($1)");
  l = l.replace(/tan\((.*?)\)/g, "\\tan($1)");
  l = l.replace(/ln\((.*?)\)/g, "\\ln($1)");
  l = l.replace(/e\^\((.*?)\)/g, "e^{$1}");
  l = l.replace(/vec\((.*?)\)/g, "\\vec{$1}");
  l = l.replace(/bar\((.*?)\)/g, "\\bar{$1}");
  l = l.replace(/lim\(x→(.*?)\)/g, "\\lim_{x \\to $1}");
  l = l.replace(/x²/g, "x^{2}");
  l = l.replace(/(\w+)\^(\d+)/g, "$1^{$2}"); // x^2 -> x^{2}

  // Structural
  l = l.replace(/begin\{cases\}/g, "\\begin{cases}");
  l = l.replace(/end\{cases\}/g, "\\end{cases}");

  return l;
}

export function AlgebraEditor({ onSubmit, initialLevel = "middle", placeholder = "أدخل خطوات الحل...", className = "" }: AlgebraEditorProps) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [steps, setSteps] = useState<string[]>([""]);
  const [activeStep, setActiveStep] = useState(0);
  const [preview, setPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
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
    if (steps.length <= 1) {
      setSteps([""]);
      return;
    }
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
      // Intelligent cursor positioning: if symbol has ( ), place cursor inside
      let cursorPos = start + symbol.length;
      if (symbol.includes("( )")) {
        cursorPos = start + symbol.indexOf("( )") + 1;
      } else if (symbol.includes("{ }")) {
        cursorPos = start + symbol.indexOf("{ }") + 1;
      } else if (symbol.includes("...")) {
        cursorPos = start + symbol.indexOf("...");
      }
      ref.setSelectionRange(cursorPos, cursorPos);
    }, 10);
  };

  const applyTemplate = (templateSteps: string[]) => {
    setSteps(templateSteps);
    setShowTemplates(false);
    setActiveStep(0);
  };

  const handleSubmit = () => {
    const filledSteps = steps.filter(s => s.trim().length > 0);
    if (filledSteps.length > 0) onSubmit(filledSteps.map(s => toLatex(s)));
  };

  const hasContent = steps.some(s => s.trim().length > 0);

  return (
    <div className={`rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col ${className}`} dir="rtl">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Calculator size={18} />
          </div>
          <div>
            <button 
              onClick={() => setShowLevelSelect(!showLevelSelect)}
              className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              محرر الجبر ({LEVEL_LABELS[level]})
              <ChevronDown size={14} className={`transition-transform ${showLevelSelect ? "rotate-180" : ""}`} />
            </button>
            <p className="text-[10px] text-muted-foreground">صمم حلك بطريقة رياضية دقيقة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
              showTemplates 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            }`}
          >
            <Layout size={12} />
            قوالب جاهزة
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-transparent"
          >
            {preview ? <Edit3 size={12} /> : <Eye size={12} />}
            {preview ? "تعديل" : "معاينة"}
          </button>
        </div>
      </div>

      {/* Level Selector Modal/Panel */}
      <AnimatePresence>
        {showLevelSelect && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/5 border-b border-border/50 overflow-hidden"
          >
            <div className="p-3 flex gap-2">
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l => (
                <button
                  key={l}
                  onClick={() => { setLevel(l); setShowLevelSelect(false); }}
                  className={`flex-1 flex flex-col items-center p-2 rounded-xl border transition-all ${
                    level === l 
                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GraduationCap size={16} />
                  <span className="text-[10px] font-bold mt-1">{LEVEL_LABELS[l]}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Panel - Filtered by Level */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-muted/20 border-b border-border/50"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALGEBRA_TEMPLATES.filter(t => t.level === level).map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTemplate(tmpl.steps)}
                  className="flex flex-col items-start p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-right group"
                >
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{tmpl.name}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{tmpl.description}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar - Dynamic by Level */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-border/50 bg-muted/10">
        {SYMBOLS[level].map((sym, i) => (
          <button
            key={i}
            onClick={() => insertSymbol(sym.insert)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all shadow-sm active:scale-95"
            title={sym.category}
          >
            <LatexRenderer latex={sym.label} />
          </button>
        ))}
        {/* Fillers to keep basic symbols always available unless primary */}
        {level !== "primary" && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            {[{ label: "±", insert: "\\pm" }, { label: "≠", insert: "\\neq" }, { label: "×", insert: "\\times" }].map((sym, i) => (
              <button
                key={`shared-${i}`}
                onClick={() => insertSymbol(sym.insert)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-card border border-border/60 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
              >
                {sym.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Solving Canvas */}
      <div className="flex-1 p-5 space-y-4 max-h-[400px] overflow-y-auto bg-gradient-to-b from-transparent to-muted/5 custom-scrollbar">
        {steps.map((step, i) => (
          <motion.div 
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            key={i} 
            className="group relative"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm ${
                  activeStep === i ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 h-full bg-gradient-to-b from-primary/30 to-transparent min-h-[20px]" />
                )}
              </div>
              
              <div className="flex-1">
                {preview && step.trim() ? (
                  <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm min-h-[50px] flex items-center hover:border-primary/30 transition-colors">
                    <LatexRenderer latex={toLatex(step)} className="text-sm md:text-base text-foreground leading-relaxed" />
                  </div>
                ) : (
                  <div className={`relative transition-all ${activeStep === i ? "ring-2 ring-primary/20 rounded-xl" : ""}`}>
                    <textarea
                      ref={el => { inputRefs.current[i] = el; }}
                      value={step}
                      onChange={e => updateStep(i, e.target.value)}
                      onFocus={() => setActiveStep(i)}
                      placeholder={i === 0 ? placeholder : `الخطوة ${i + 1}...`}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground font-mono resize-none min-h-[50px] focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
                      rows={1}
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    />
                    {/* Live Preview for active step */}
                    {!preview && activeStep === i && step.trim() && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-primary-foreground min-h-[40px] flex items-center justify-center"
                      >
                         <LatexRenderer latex={toLatex(step)} className="text-sm text-foreground" />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeStep(i)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        {!preview && (
          <button
            onClick={addStep}
            className="flex items-center gap-2 mr-10 px-4 py-2 rounded-xl border border-dashed border-primary/30 text-primary text-[11px] font-bold hover:bg-primary/5 transition-all group"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
            إضافة خطوة حل جديدة
          </button>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Type size={12} />
          <span>استخدم الرموز أعلاه للإدراج الرياضي. يمكنك كتابة الشرح باللغة العربية بين الخطوات.</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!hasContent}
          className="group relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all disabled:opacity-40 shadow-lg"
        >
          <CheckCircle2 size={14} />
          <span>تأكيد الإجابة</span>
        </button>
      </div>
    </div>
  );
}
