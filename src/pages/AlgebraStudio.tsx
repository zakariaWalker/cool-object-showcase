// ===== Algebra Studio — Standalone step-by-step algebra workspace =====
// Mirrors GeometryStudio: optional task description with auto-inferred
// answer schema, the AlgebraEditor for step-by-step solutions, and live
// verification of the final answer.

import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlgebraEditor } from "@/components/AlgebraEditor";
import { LatexRenderer } from "@/components/LatexRenderer";
import { inferAnswerSchema } from "@/engine/answer-schema";
import { gradeAnswer, type Verdict } from "@/engine/answer-schema";

export default function AlgebraStudio() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const seedText = params.get("text") || "";

  const [task, setTask] = useState(seedText);
  const [committed, setCommitted] = useState(seedText);
  const [steps, setSteps] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const schema = useMemo(
    () => (committed ? inferAnswerSchema(committed, committed) : null),
    [committed],
  );

  const handleSubmit = (newSteps: string[]) => {
    setSteps(newSteps);
    if (schema) {
      // Grade the LAST non-empty step as the final answer.
      const finalLine = [...newSteps].reverse().find((s) => s.trim().length > 0) || "";
      setVerdict(gradeAnswer(finalLine, schema));
    } else {
      setVerdict(null);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground"
            aria-label="رجوع"
          >
            ✕
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">استوديو الجبر</h1>
            <p className="text-[11px] text-muted-foreground">
              مساحة عمل تفاعلية لكتابة الحلول الجبرية خطوة بخطوة مع التحقّق التلقائي.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
          LaTeX
        </span>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-5 pb-24">
        {/* Optional task description — drives auto-inferred grading schema */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
            صف المسألة (اختياري)
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="مثال: حل المعادلة 2x + 3 = 7، أو احسب قيمة (3 + 5) × 2."
            rows={2}
            className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none transition-all resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              عند الضغط على "تحميل المسألة"، يستخرج النظام نوع الإجابة المتوقعة
              تلقائياً ويفعّل التصحيح الآلي.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTask("");
                  setCommitted("");
                  setSteps([]);
                  setVerdict(null);
                }}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                إفراغ
              </button>
              <button
                onClick={() => {
                  setCommitted(task.trim());
                  setVerdict(null);
                }}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                تحميل المسألة ←
              </button>
            </div>
          </div>

          {committed && schema && (
            <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-3">
              نوع الإجابة المتوقع:{" "}
              <span className="font-bold text-foreground">{schema.type}</span>
              {schema.expected !== undefined && (
                <span className="opacity-70"> — جاهز للتصحيح التلقائي</span>
              )}
            </div>
          )}
        </div>

        {/* Editor */}
        <AlgebraEditor onSubmit={handleSubmit} />

        {/* Verdict */}
        {verdict && (
          <div
            className={`p-4 rounded-xl border ${
              verdict.status === "correct"
                ? "border-primary/30 bg-primary/5 text-primary"
                : verdict.status === "partial"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
                  : verdict.status === "incorrect"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-border bg-muted/30 text-muted-foreground"
            }`}
          >
            <div className="text-sm font-bold mb-1">
              {verdict.status === "correct"
                ? "✓ إجابة صحيحة"
                : verdict.status === "partial"
                  ? "~ إجابة جزئية"
                  : verdict.status === "incorrect"
                    ? "✗ إجابة غير صحيحة"
                    : "تم استلام إجابتك"}
            </div>
            <div className="text-xs opacity-90">{verdict.message}</div>
            {verdict.expected && (
              <div className="text-xs mt-2 opacity-80">
                الإجابة المتوقعة:{" "}
                <span className="font-mono font-bold">{verdict.expected}</span>
              </div>
            )}
          </div>
        )}

        {/* Submitted steps recap */}
        {steps.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              خطوات الحل المُرسلة
            </div>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-[10px] font-bold text-muted-foreground w-5 text-center pt-1">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <LatexRenderer
                      latex={s}
                      className="text-sm text-foreground"
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
