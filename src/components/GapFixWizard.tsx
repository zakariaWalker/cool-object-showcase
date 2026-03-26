import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, X, Plus, Trash2, CheckCircle, Wand2, Loader2 } from "lucide-react";
import { KnowledgeGap } from "@/engine/knowledge/types";
import { suggestStepsForExercise } from "@/lib/gemini";
import { toast } from "sonner";

interface GapFixWizardProps {
  gap: KnowledgeGap;
  onSolve: (steps: { description: string; ruleHint?: string }[]) => void;
  onCancel: () => void;
}

export function GapFixWizard({ gap, onSolve, onCancel }: GapFixWizardProps) {
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [steps, setSteps] = useState<{ description: string; ruleHint?: string }[]>([
    { description: "" }
  ]);

  const addStep = () => setSteps([...steps, { description: "" }]);
  
  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index].description = value;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleAISuggest = async () => {
    setIsAIThinking(true);
    try {
      const suggestions = await suggestStepsForExercise(gap.sourceExercise, gap.signature);
      setSteps(suggestions);
      toast.success("تم استنتاج الخطوات بنجاح عبر الذكاء الاصطناعي ✨");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ غير متوقع");
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleFinish = () => {
    const validSteps = steps.filter(s => s.description.trim().length > 0);
    if (validSteps.length === 0) return;
    onSolve(validSteps);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-[18px] font-bold text-foreground">تدريب المحرك الذكي 🎓</h2>
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Training Mode: Pattern Learning</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 text-right" dir="rtl">
          <div className="mb-8 bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="text-[11px] text-muted-foreground mb-2">التمرين الذي لم أفهمه:</div>
            <div className="text-[14px] font-mono text-foreground italic">"{gap.sourceExercise}"</div>
            <div className="mt-2 text-[10px] text-primary font-bold">Signature: {gap.signature}</div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-md">
              ساعدني في تعلم كيفية حل هذا التمرين. أدخل الخطوات المنطقية للحل وسأقوم بإنشاء "قاعدة ذكية" جديدة.
            </p>
            <button 
                onClick={handleAISuggest}
                disabled={isAIThinking}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent/10 border border-accent/20 text-accent rounded-2xl text-[12px] font-bold hover:bg-accent/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
                {isAIThinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Wand2 className="w-4 h-4" />
                )}
                استنتاج الخطوات بالذكاء الاصطناعي
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 items-start"
              >
                <div className="mt-2 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 font-bold text-primary text-[12px]">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="اكتب الخطوة هنا (مثلاً: ننشر 3 على القوس)..."
                    className="w-full bg-muted/50 border border-border rounded-xl p-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px] resize-none"
                  />
                </div>
                {steps.length > 1 && (
                  <button 
                    onClick={() => removeStep(index)}
                    className="mt-2 p-2 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <button 
            onClick={addStep}
            className="mt-6 flex items-center gap-2 text-[12px] font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            إضافة خطوة حل أخرى
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/20 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>سيتم تحويل هذه الخطوات إلى DeconstructionSchema دائم في قاعدة معرفتك.</span>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={handleFinish}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                <CheckCircle className="w-4 h-4" />
                تثبيت القاعدة الجديدة في المحرك
            </button>
            <button 
                onClick={onCancel}
                className="w-32 border border-border flex items-center justify-center py-3 rounded-xl font-bold text-[14px] text-muted-foreground hover:bg-white/5 transition-colors"
            >
                إلغاء
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
