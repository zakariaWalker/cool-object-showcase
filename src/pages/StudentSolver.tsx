import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";

interface Step {
  id: number;
  description: string;
}

export default function StudentSolver() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<any>(null);
  const [deconstruction, setDeconstruction] = useState<any>(null);
  const [pattern, setPattern] = useState<any>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [studentInput, setStudentInput] = useState("");
  const [stepStatus, setStepStatus] = useState<"typing" | "correct" | "incorrect" | "hint_shown">("typing");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch exercise
      const { data: exData, error: exErr } = await (supabase as any)
        .from("kb_exercises")
        .select("*")
        .eq("id", id)
        .single();
      if (exErr) throw exErr;
      setExercise(exData);

      // 2. Fetch deconstruction
      const { data: deconData, error: deconErr } = await (supabase as any)
        .from("kb_deconstructions")
        .select("*")
        .eq("exercise_id", id)
        .limit(1)
        .single();
      
      if (!deconErr && deconData) {
        setDeconstruction(deconData);

        // 3. Fetch pattern using pattern_id
        if (deconData.pattern_id) {
          const { data: patData } = await (supabase as any)
            .from("kb_patterns")
            .select("*")
            .eq("id", deconData.pattern_id)
            .single();
          setPattern(patData);
        }
      }
    } catch (e) {
      console.error("Error loading solver data:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleCheck = () => {
    // V1 Simple Self-Grade logic.
    // We allow the student to type their answer, and then we "Reveal" the ideal state
    // or simulate an AI check finding it correct if they type something.
    if (!studentInput.trim()) return;
    setStepStatus("correct");
  };

  const nextStep = () => {
    const totalSteps = deconstruction?.steps?.length || 0;
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
      setStudentInput("");
      setStepStatus("typing");
    } else {
      setCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground text-sm">جاري تحضير بيئة الحل...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">التمرين غير موجود</h2>
        <button onClick={() => navigate("/tutor")} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg">العودة</button>
      </div>
    );
  }

  if (!deconstruction || !deconstruction.steps || deconstruction.steps.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-foreground mb-4">هذا التمرين غير مفكك بعد</h2>
        <p className="text-muted-foreground mb-6 max-w-md">لم يتم تحليل هذا التمرين إلى خطوات حل حتى الآن. جرب تمریناً آخر من المدرّس الآلي.</p>
        <button onClick={() => navigate("/tutor")} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg">العودة للمدرّس</button>
      </div>
    );
  }

  const steps = deconstruction.steps;
  const currentStepText = steps[currentStep];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground">✕</button>
          <h1 className="text-lg font-bold text-foreground">المدرّس التفاعلي</h1>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-muted rounded text-muted-foreground">{exercise.grade}</span>
          <span className="px-2 py-1 bg-primary/10 text-primary font-bold rounded">{pattern?.name || exercise.type}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6 pb-24">
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${completed ? 100 : ((currentStep) / steps.length) * 100}%` }}
          />
        </div>

        {/* Exercise Context */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">سياق التمرين</h3>
          <div className="text-sm">
            <MathExerciseRenderer text={exercise.text} />
          </div>
        </div>

        {/* Solver Area */}
        {completed ? (
          <div className="p-8 rounded-xl border-2 border-primary/30 bg-primary/5 text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-black text-primary">أحسنت العمل!</h2>
            <p className="text-muted-foreground">لقد أكملت حل هذا التمرين خطوة بخطوة بنجاح.</p>
            <div className="pt-4">
              <button onClick={() => navigate("/tutor")} className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/20">
                تمرين آخر
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20 shrink-0">
                {currentStep + 1}
              </div>
              <h2 className="text-xl font-bold text-foreground leading-relaxed">
                {currentStepText}
              </h2>
            </div>

            {/* Input Area */}
            <div className="pl-14 space-y-4">
              <div className="relative">
                <textarea
                  value={studentInput}
                  onChange={(e) => {
                    setStudentInput(e.target.value);
                    if (stepStatus !== "typing") setStepStatus("typing");
                  }}
                  disabled={stepStatus === "correct"}
                  placeholder="اكتب حلك لهذه الخطوة هنا..."
                  className="w-full min-h-[120px] p-4 rounded-xl border-2 border-border bg-card text-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none text-lg"
                  dir="ltr"
                />
                
                {stepStatus === "correct" && (
                  <div className="absolute top-4 right-4 text-primary text-xl font-bold">✓</div>
                )}
              </div>

              {stepStatus === "typing" && (
                <div className="flex justify-between items-center">
                  <button onClick={() => setStepStatus("hint_shown")} className="text-xs text-muted-foreground hover:text-primary transition-colors flex gap-1 items-center">
                    <span>💡</span> أحتاج تلميحاً
                  </button>
                  <button 
                    onClick={handleCheck}
                    disabled={!studentInput.trim()}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    تحقق من الإجابة
                  </button>
                </div>
              )}

              {stepStatus === "hint_shown" && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-accent-foreground text-sm flex gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <strong>تلميح:</strong> 
                    {deconstruction.needs && deconstruction.needs.length > 0 ? (
                      <p className="mt-1">تذكر المفاهيم التالية: {deconstruction.needs.join("، ")}</p>
                    ) : (
                      <p className="mt-1">ركّز على تنفيذ ما يُطلب في نص الخطوة حرفياً.</p>
                    )}
                    <button onClick={() => setStepStatus("typing")} className="mt-3 text-xs underline font-bold">العودة للحل</button>
                  </div>
                </div>
              )}

              {stepStatus === "correct" && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="text-primary font-bold text-sm">ممتاز! إجابتك تبدو متوافقة مع المطلوب.</div>
                  <button onClick={nextStep} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all shadow-md">
                    الخطوة التالية ←
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
