// ===== Geometry Studio — Standalone GeoGebra-style editor =====
// A dedicated page that opens the JSXGraph-powered GeometryCanvas
// without any specific exercise. Useful for free exploration, teacher
// demos, and quick student practice.

import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GeometryCanvas, type VerifyResult } from "@/components/geometry/GeometryCanvas";
import { buildAutoFigureSpec } from "@/engine/figures/factory";
import { inferConstraints } from "@/engine/figures/construction-checks";

export default function GeometryStudio() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Optional seed text via ?text=... (e.g. coming from a textbook lesson).
  const seedText = params.get("text") || "";

  const [task, setTask] = useState(seedText);
  const [committed, setCommitted] = useState(seedText);
  const [lastResult, setLastResult] = useState<VerifyResult | null>(null);

  const figureSpec = useMemo(
    () => (committed ? buildAutoFigureSpec({ text: committed }) : null),
    [committed],
  );
  const constraints = useMemo(
    () => (committed ? inferConstraints(committed) : []),
    [committed],
  );

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
            <h1 className="text-lg font-bold text-foreground">استوديو الهندسة</h1>
            <p className="text-[11px] text-muted-foreground">
              لوحة إنشاء تفاعلية بأسلوب GeoGebra — ارسم، جرّب، وتحقّق.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
          JSXGraph
        </span>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-5 pb-24">
        {/* Optional task description — drives auto-seed + constraints */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
            صف ما تريد إنشاءه (اختياري)
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="مثال: ارسم مثلثاً ABC، ثم أنشئ المنصّف العمودي للضلع [BC]."
            rows={2}
            className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none transition-all resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              عند الضغط على "تحميل المهمة"، تُبذَر اللوحة بالشكل المناسب وتُستخرج
              قيود التحقّق تلقائياً من النص.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTask("");
                  setCommitted("");
                  setLastResult(null);
                }}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                إفراغ
              </button>
              <button
                onClick={() => {
                  setCommitted(task.trim());
                  setLastResult(null);
                }}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                تحميل المهمة ←
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-xl border border-border bg-card p-4">
          <GeometryCanvas
            seedSpec={figureSpec}
            constraints={constraints}
            onSubmit={(r) => setLastResult(r)}
          />
        </div>

        {/* Last verification result */}
        {lastResult && lastResult.total > 0 && (
          <div
            className={`p-4 rounded-xl border ${
              lastResult.passed === lastResult.total
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-amber-500/30 bg-amber-500/5 text-amber-700"
            }`}
          >
            <div className="text-sm font-bold">
              {lastResult.passed === lastResult.total
                ? "✓ تحقّقت كل القيود"
                : `~ ${lastResult.passed} / ${lastResult.total} من القيود محقّقة`}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-foreground/80">
              {lastResult.details.map((d, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span>{d.ok ? "✓" : "✗"}</span>
                  <span className="flex-1">{d.reason || d.constraint.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
