import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { FigureRenderer } from "@/engine/figures/FigureRenderer";
import { buildAutoFigureSpec } from "@/engine/figures/factory";
import { analyzeStep } from "@/engine/figures/step-focus";
import type { FigureSpec } from "@/engine/figures/types";
import {
  inferAnswerSchema,
  gradeAnswer,
  type Verdict,
  type AnswerSchema,
} from "@/engine/answer-schema";
import { GeometryCanvas, type VerifyResult } from "@/components/geometry/GeometryCanvas";
import { AlgebraEditor } from "@/components/AlgebraEditor";
import { inferConstraints } from "@/engine/figures/construction-checks";
import { CognitiveEntryHeader } from "@/components/solver/CognitiveEntryHeader";
import { QuickInputBar } from "@/components/solver/QuickInputBar";

export default function StudentSolver() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<any>(null);
  const [deconstruction, setDeconstruction] = useState<any>(null);
  const [pattern, setPattern] = useState<any>(null);
  const [manualFigureSpec, setManualFigureSpec] = useState<FigureSpec | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [studentInput, setStudentInput] = useState("");
  const [stepStatus, setStepStatus] = useState<"typing" | "correct" | "partial" | "incorrect" | "hint_shown">("typing");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

      // 4. Fetch optional manual figure spec override
      const { data: figData } = await (supabase as any)
        .from("kb_figures")
        .select("spec")
        .eq("exercise_id", id)
        .maybeSingle();
      if (figData?.spec) setManualFigureSpec(figData.spec as FigureSpec);
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

  // Detect whether the exercise / current step is geometric — drives editor choice.
  const isGeometryStep = useMemo(() => {
    const t = (exercise?.type || "").toLowerCase();
    if (t.includes("هندس") || t.includes("geometr")) return true;
    const txt = `${exercise?.text || ""} ${currentStepText}`.toLowerCase();
    if (/ارسم|أنشئ|المثلث|مثلث|الدائرة|دائرة|المستقيم|مستقيم|قطعة|تحويل|دوران|انسحاب|تماثل|زاوية|منحنى|مجسم|متوازي|مكعب|رؤوس|أوجه|أضلاع/.test(txt)) return true;
    if (/triangle|circle|rectangle|parallelo|trapèze|losange|plot|curve|cube|prism/.test(txt)) return true;
    return false;
  }, [exercise?.type, exercise?.text, currentStepText]);

  // Resolve which figure to render: manual override → auto-detected default → none
  const figureSpec: FigureSpec | null = useMemo(() => {
    if (manualFigureSpec) return manualFigureSpec;
    if (!exercise) return null;
    return buildAutoFigureSpec({
      type: exercise.type, chapter: exercise.chapter, text: exercise.text,
    });
  }, [exercise, manualFigureSpec]);

  // Smart per-step focus on the figure
  const figureHighlights = useMemo(
    () => (figureSpec ? analyzeStep(currentStepText, figureSpec) : {}),
    [figureSpec, currentStepText],
  );

  // ---- Cognitive entry derivation ----
  const cognitiveEntry = useMemo(() => {
    if (!exercise) return null;
    const grade = exercise.grade || "";
    const levelMap: Record<string, string> = {
      "1AS": "1 ثانوي", "2AS": "2 ثانوي", "3AS": "3 ثانوي",
      "1AM": "1 متوسط", "2AM": "2 متوسط", "3AM": "3 متوسط", "4AM": "4 متوسط",
    };
    let level = grade;
    Object.keys(levelMap).forEach((k) => { if (grade.includes(k)) level = levelMap[k]; });
    if (/secondary/i.test(grade)) level = level || "ثانوي";
    if (/middle/i.test(grade)) level = level || "متوسط";

    const skill = pattern?.name || exercise.chapter || exercise.type || "تمرين";
    const goal =
      pattern?.goal ||
      (exercise.chapter ? `إتقان: ${exercise.chapter}` : "حلّ التمرين خطوة بخطوة بفهم تامّ.");
    const firstStepHint = deconstruction?.steps?.[0]
      ? `ابدأ بهذه الخطوة: ${String(deconstruction.steps[0]).slice(0, 140)}`
      : "اقرأ نص التمرين بتأنّ، ثم حدّد المعطيات والمطلوب قبل البدء.";

    const stepsCount = deconstruction?.steps?.length || 1;
    const durationMin = Math.max(2, Math.min(15, stepsCount * 2));
    const xpReward = stepsCount * 10;

    const difficulty: "facile" | "moyen" | "difficile" =
      stepsCount <= 2 ? "facile" : stepsCount >= 5 ? "difficile" : "moyen";

    const needs: string[] = Array.isArray(deconstruction?.needs) ? deconstruction.needs : [];
    const hint = needs.length
      ? `تذكّر المفاهيم: ${needs.join("، ")}.`
      : pattern?.hint || "ابدأ بإعادة كتابة المعطيات بشكل منظّم.";
    const similarExample = pattern?.example || (exercise.similar_example ?? "");
    const method =
      pattern?.method ||
      (Array.isArray(deconstruction?.steps) && deconstruction.steps.length > 1
        ? deconstruction.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")
        : "");

    return { skill, level, goal, firstStepHint, durationMin, xpReward, difficulty, hint, similarExample, method };
  }, [exercise, pattern, deconstruction]);


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

  // Detect if exercise text references a figure that we couldn't render
  const fullText = `${exercise.text || ""} ${exercise.chapter || ""} ${steps.join(" ")}`;
  const referencesFigure = /الشكل المرفق|المجسم المرفق|الشكل أدناه|الشكل التالي|انظر الشكل|حسب الشكل|figure ci-(dessous|contre|jointe)|voir la figure/i.test(fullText);
  const figureMissing = referencesFigure && !figureSpec;

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

          {/* Unified geometry renderer — adapts per step */}
          {figureSpec && (
            <div className="mt-5 p-4 rounded-lg border border-border bg-background/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">
                الشكل: {figureSpec.label || figureSpec.kind}
              </div>
              <FigureRenderer spec={figureSpec} highlights={figureHighlights} />
              {(figureHighlights.vertices?.length || figureHighlights.edges?.length || figureHighlights.faces?.length) ? (
                <div className="text-xs text-muted-foreground text-center mt-2 space-x-3 rtl:space-x-reverse">
                  {figureHighlights.vertices?.length ? (
                    <span>الرؤوس: <span className="font-bold text-primary" dir="ltr">{figureHighlights.vertices.join(", ")}</span></span>
                  ) : null}
                  {figureHighlights.edges?.length ? (
                    <span>الأحرف: <span className="font-bold text-primary" dir="ltr">[{figureHighlights.edges.join("], [")}]</span></span>
                  ) : null}
                  {figureHighlights.faces?.length ? (
                    <span>الأوجه: <span className="font-bold text-primary" dir="ltr">{figureHighlights.faces.join(", ")}</span></span>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {figureMissing && (
            <div className="mt-4 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex gap-3 items-start">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 text-xs leading-relaxed">
                <div className="font-bold text-amber-700 mb-1">الشكل المرفق غير متوفّر</div>
                <p className="text-muted-foreground">
                  هذا التمرين يشير إلى شكل لم يُرفق مع النص. اختر تمريناً آخر يحتوي على كل المعطيات اللازمة.
                </p>
                <button
                  onClick={() => navigate("/exercises")}
                  className="mt-2 text-xs font-bold text-primary hover:underline"
                >
                  اختيار تمرين آخر ←
                </button>
              </div>
            </div>
          )}
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
                <span>{schema.type === "construction" ? "📐" : "📋"}</span>
                {schema.type === "range_filter" && "أدخل الأعداد مفصولة بمسافة"}
                {schema.type === "number_list" && "أدخل قائمة أعداد مفصولة بمسافة"}
                {schema.type === "number" && "أدخل عدداً واحداً (الفاصلة للعشرية، مثل 7,3)"}
                {schema.type === "comparison" && "اختر/اكتب الإجابة"}
                {schema.type === "construction" && "خطوة إنشاء هندسي — استعن بالشكل أعلاه"}
                {(schema.type === "text" || schema.type === "expression") && "اكتب حلك"}
              </div>
            </div>

            {/* Construction step — interactive geometry canvas */}
            {schema.type === "construction" ? (
              <div className="pl-14 space-y-4">
                <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex gap-3 items-start">
                    <span className="text-2xl shrink-0">📐</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground text-sm mb-1">خطوة إنشاء هندسي تفاعلي</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        استعمل الأدوات أدناه لبناء الإنشاء المطلوب على اللوحة، ثم اضغط
                        <strong className="mx-1">"تحقق من الإنشاء"</strong>
                        ليتم التحقق التلقائي من صحته.
                      </p>
                    </div>
                  </div>
                </div>

                <GeometryCanvas
                  seedSpec={figureSpec}
                  constraints={inferConstraints(currentStepText)}
                  onSubmit={(r: VerifyResult) => {
                    if (r.total === 0) {
                      // No constraints inferred → trust the student
                      setStudentInput("done");
                      setVerdict({ status: "correct", message: "تم استلام الإنشاء." });
                      setStepStatus("correct");
                      return;
                    }
                    if (r.passed === r.total) {
                      setStudentInput("done");
                      setVerdict({ status: "correct", message: "إنشاء صحيح ودقيق ✓" });
                      setStepStatus("correct");
                    } else if (r.passed > 0) {
                      setVerdict({
                        status: "partial",
                        message: `أنجزت ${r.passed} من ${r.total} من المتطلبات. راجع العناصر الناقصة.`,
                      });
                      setStepStatus("partial");
                    } else {
                      setVerdict({
                        status: "incorrect",
                        message: "لم يتم تحقيق المتطلبات بعد. تابع البناء.",
                      });
                      setStepStatus("incorrect");
                    }
                  }}
                />

                {stepStatus === "correct" && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                    <div className="text-primary font-bold text-sm flex items-center gap-2">
                      <span>✓</span> {verdict?.message || "تم تأكيد الإنشاء"}
                    </div>
                    <button
                      onClick={nextStep}
                      className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all shadow-md text-sm"
                    >
                      الخطوة التالية ←
                    </button>
                  </div>
                )}
                {stepStatus === "partial" && verdict && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-sm font-bold">
                    ~ {verdict.message}
                  </div>
                )}
                {stepStatus === "incorrect" && verdict && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold">
                    ✗ {verdict.message}
                  </div>
                )}
              </div>
            ) : (
              <>
            {/* Input Area */}
            <div className="pl-14 space-y-4">
              {isGeometryStep ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <span>📐</span> لوحة الإنشاء التفاعلية
                  </div>
                  <GeometryCanvas
                    seedSpec={figureSpec}
                    constraints={inferConstraints(`${exercise?.text || ""} ${currentStepText}`)}
                    onSubmit={(r: VerifyResult) => {
                      setStudentInput(JSON.stringify(r));
                      const passed = r.total > 0 && r.passed === r.total;
                      setVerdict({
                        status: passed ? "correct" : r.passed > 0 ? "partial" : "incorrect",
                        message: r.total > 0 ? `${r.passed} / ${r.total} من القيود محقّقة` : "تم استلام إنشائك.",
                      });
                      setStepStatus(passed ? "correct" : r.passed > 0 ? "partial" : "hint_shown");
                    }}
                  />
                </div>
              ) : schema.type === "algebra" || schema.type === "expression" || schema.type === "text" ? (
                <AlgebraEditor
                  initialLevel={exercise.grade?.includes("secondary") || exercise.grade?.includes("3AS") ? "secondary" : "middle"}
                  placeholder="اكتب خطوة الحل هنا..."
                  onSubmit={(steps) => {
                    const answer = steps.join("\n");
                    setStudentInput(answer);
                    const v = gradeAnswer(answer, schema);
                    setVerdict(v);
                    setStepStatus(v.status === "correct" ? "correct" : v.status === "partial" ? "partial" : "hint_shown");
                  }}
                />
              ) : (
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
              )}

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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
