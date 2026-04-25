import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import {
  inferAnswerSchema,
  gradeAnswer,
  type Verdict,
  type AnswerSchema,
} from "@/engine/answer-schema";

export default function StudentSolver() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<any>(null);
  const [deconstruction, setDeconstruction] = useState<any>(null);
  const [pattern, setPattern] = useState<any>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [studentInput, setStudentInput] = useState("");
  const [stepStatus, setStepStatus] = useState<"typing" | "correct" | "partial" | "incorrect" | "hint_shown">("typing");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
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

  // Build a real schema for the current step from the exercise text
  const currentStepText: string = deconstruction?.steps?.[currentStep] ?? "";
  const schema: AnswerSchema = useMemo(
    () => inferAnswerSchema(exercise?.text || "", currentStepText),
    [exercise?.text, currentStepText],
  );

  const handleCheck = () => {
    if (!studentInput.trim()) return;
    const v = gradeAnswer(studentInput, schema);
    setVerdict(v);
    // "unknown" means we couldn't auto-grade — do NOT mark it as correct.
    // Treat it as a soft "needs review" state visually closer to incorrect/partial,
    // never as a green check.
    setStepStatus(
      v.status === "correct"
        ? "correct"
        : v.status === "partial"
          ? "partial"
          : v.status === "unknown"
            ? "hint_shown"
            : "incorrect",
    );
  };

  const nextStep = () => {
    const totalSteps = deconstruction?.steps?.length || 0;
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
      setStudentInput("");
      setStepStatus("typing");
      setVerdict(null);
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

  // Detect exercises that reference a missing figure/diagram
  const referencesFigure = /الشكل المرفق|المجسم المرفق|الشكل أدناه|الشكل التالي|انظر الشكل|حسب الشكل|figure ci-(dessous|contre|jointe)|voir la figure/i
    .test(`${exercise.text || ""} ${steps.join(" ")}`);
  const hasFigureData = !!(exercise.figure_url || exercise.diagram_spec || exercise.image_url);
  const figureMissing = referencesFigure && !hasFigureData;

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

            {/* Schema hint — tell student what format we expect */}
            <div className="pl-14">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                <span>📋</span>
                {schema.type === "range_filter" && "أدخل الأعداد مفصولة بمسافة"}
                {schema.type === "number_list" && "أدخل قائمة أعداد مفصولة بمسافة"}
                {schema.type === "number" && "أدخل عدداً واحداً (الفاصلة للعشرية، مثل 7,3)"}
                {schema.type === "comparison" && "اختر/اكتب الإجابة"}
                {(schema.type === "text" || schema.type === "expression") && "اكتب حلك"}
              </div>
            </div>

            {/* Input Area */}
            <div className="pl-14 space-y-4">
              <div className="relative">
                <textarea
                  value={studentInput}
                  onChange={(e) => {
                    setStudentInput(e.target.value);
                    if (stepStatus !== "typing") {
                      setStepStatus("typing");
                      setVerdict(null);
                    }
                  }}
                  disabled={stepStatus === "correct"}
                  placeholder={
                    schema.type === "range_filter" || schema.type === "number_list"
                      ? "مثال: 7,32   7,34"
                      : schema.type === "number"
                        ? "مثال: 7,3"
                        : "اكتب حلك لهذه الخطوة هنا..."
                  }
                  className={`w-full min-h-[120px] p-4 rounded-xl border-2 bg-card text-foreground focus:ring-4 transition-all resize-none text-lg ${
                    stepStatus === "correct"
                      ? "border-primary/50 focus:border-primary focus:ring-primary/10"
                      : stepStatus === "incorrect"
                        ? "border-destructive/60 focus:border-destructive focus:ring-destructive/10"
                        : stepStatus === "partial"
                          ? "border-amber-500/60 focus:border-amber-500 focus:ring-amber-500/10"
                          : "border-border focus:border-primary focus:ring-primary/10"
                  }`}
                  dir="ltr"
                />

                {stepStatus === "correct" && (
                  <div className="absolute top-4 right-4 text-primary text-xl font-bold">✓</div>
                )}
                {stepStatus === "incorrect" && (
                  <div className="absolute top-4 right-4 text-destructive text-xl font-bold">✗</div>
                )}
                {stepStatus === "partial" && (
                  <div className="absolute top-4 right-4 text-amber-500 text-xl font-bold">~</div>
                )}
              </div>

              {(stepStatus === "typing" || stepStatus === "incorrect" || stepStatus === "partial") && (
                <div className="flex justify-between items-center">
                  <button onClick={() => setStepStatus("hint_shown")} className="text-xs text-muted-foreground hover:text-primary transition-colors flex gap-1 items-center">
                    <span>💡</span> أحتاج تلميحاً
                  </button>
                  <button
                    onClick={handleCheck}
                    disabled={!studentInput.trim()}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {stepStatus === "incorrect" || stepStatus === "partial" ? "أعد المحاولة" : "تحقق من الإجابة"}
                  </button>
                </div>
              )}

              {stepStatus === "incorrect" && verdict && (
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/30 space-y-1 animate-in slide-in-from-bottom-2">
                  <div className="text-destructive font-bold text-sm flex items-center gap-2">
                    <span>✗</span> {verdict.message}
                  </div>
                  {verdict.expected && (
                    <div className="text-xs text-muted-foreground">
                      الصيغة المتوقعة: <span className="font-mono font-bold text-foreground" dir="ltr">{verdict.expected}</span>
                    </div>
                  )}
                </div>
              )}

              {stepStatus === "partial" && verdict && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 space-y-1 animate-in slide-in-from-bottom-2">
                  <div className="text-amber-700 font-bold text-sm flex items-center gap-2">
                    <span>~</span> {verdict.message}
                  </div>
                  <div className="text-xs text-muted-foreground">أكمل القائمة قبل المتابعة.</div>
                </div>
              )}

              {stepStatus === "hint_shown" && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-accent-foreground text-sm space-y-3">
                  <div className="flex gap-3">
                    <span className="text-xl">{verdict?.status === "unknown" ? "📝" : "💡"}</span>
                    <div className="flex-1">
                      {verdict?.status === "unknown" ? (
                        <>
                          <strong>تم استلام إجابتك.</strong>
                          <p className="mt-1">{verdict.message}</p>
                        </>
                      ) : (
                        <>
                          <strong>تلميح:</strong>
                          {deconstruction.needs && deconstruction.needs.length > 0 ? (
                            <p className="mt-1">تذكر المفاهيم التالية: {deconstruction.needs.join("، ")}</p>
                          ) : (
                            <p className="mt-1">ركّز على تنفيذ ما يُطلب في نص الخطوة حرفياً.</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <button onClick={() => setStepStatus("typing")} className="text-xs underline font-bold">
                      تعديل الإجابة
                    </button>
                    {verdict?.status === "unknown" && (
                      <button
                        onClick={nextStep}
                        className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-all shadow-md"
                      >
                        متابعة ←
                      </button>
                    )}
                  </div>
                </div>
              )}

              {stepStatus === "correct" && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="text-primary font-bold text-sm">
                    {verdict?.status === "unknown"
                      ? "تم استلام إجابتك. تابع للخطوة التالية."
                      : verdict?.message || "إجابة صحيحة!"}
                  </div>
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
