// ===== Algebra Studio — Smart workspace that auto-picks the right editor =====
// Describe a problem; the studio infers the answer schema AND auto-switches
// between the AlgebraEditor and the GeometryCanvas (via StudentAnswerEditor).

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { StudentAnswerEditor } from "@/components/StudentAnswerEditor";
import { LatexRenderer } from "@/components/LatexRenderer";
import { MathContent } from "@/components/MathContent";
import { AlgebraSolvingGuide } from "@/components/AlgebraSolvingGuide";
import { inferAnswerSchema, gradeAnswer, type Verdict } from "@/engine/answer-schema";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";

const GRADE_CODE_TO_KEY: Record<string, string> = {
  "1AM": "middle_1", "2AM": "middle_2", "3AM": "middle_3", "4AM": "middle_4",
  "1AS": "secondary_1", "2AS": "secondary_2", "3AS": "secondary_3",
  "1AP": "primary_1", "2AP": "primary_2", "3AP": "primary_3", "4AP": "primary_4", "5AP": "primary_5",
};

interface KBExerciseLite {
  id: string;
  text: string;
  chapter: string | null;
  source: string | null;
}

// Mirror of detectEditorType from StudentAnswerEditor — used only to show
// the user which editor will appear after committing the task.
function detectEditorKind(text: string): "algebra" | "geometry" {
  const txt = (text || "").toLowerCase();
  if (/ارسم|أنشئ|المثلث|الدائرة|المستقيم|قطعة|مستقيم|تحويل|دوران|انسحاب|تماثل|زاوية|منحنى/.test(txt)) return "geometry";
  if (/triangle|circle|rectangle|parallelo|trapèze|losange|plot|curve/.test(txt)) return "geometry";
  return "algebra";
}

export default function AlgebraStudio() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { gradeCode, countryCode } = useUserCurriculum();

  const seedText = params.get("text") || "";

  const [task, setTask] = useState(seedText);
  const [committed, setCommitted] = useState(seedText);
  const [steps, setSteps] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // KB browser state
  const [kbOpen, setKbOpen] = useState(false);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbItems, setKbItems] = useState<KBExerciseLite[]>([]);
  const [kbQuery, setKbQuery] = useState("");

  useEffect(() => {
    if (!kbOpen) return;
    let cancelled = false;
    (async () => {
      setKbLoading(true);
      setKbError(null);
      try {
        const code = gradeCode || "4AM";
        const candidates = Array.from(new Set([code, GRADE_CODE_TO_KEY[code] || code]));
        const { data, error } = await (supabase as any)
          .from("kb_exercises")
          .select("id, text, chapter, source")
          .eq("country_code", countryCode || "DZ")
          .in("grade", candidates)
          .order("chapter")
          .limit(200);
        if (error) throw error;
        if (cancelled) return;
        setKbItems((data || []) as KBExerciseLite[]);
      } catch (e: any) {
        if (!cancelled) setKbError(e.message || "تعذّر تحميل المسائل");
      } finally {
        if (!cancelled) setKbLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kbOpen, gradeCode, countryCode]);

  const filteredKb = useMemo(() => {
    const q = kbQuery.trim().toLowerCase();
    if (!q) return kbItems;
    return kbItems.filter(it =>
      (it.text || "").toLowerCase().includes(q) ||
      (it.chapter || "").toLowerCase().includes(q),
    );
  }, [kbItems, kbQuery]);

  const groupedKb = useMemo(() => {
    const map = new Map<string, KBExerciseLite[]>();
    for (const it of filteredKb) {
      const key = (it.chapter || "بدون فصل").trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [filteredKb]);

  const loadProblem = (text: string) => {
    setTask(text);
    setCommitted(text.trim());
    setSteps([]);
    setVerdict(null);
    setKbOpen(false);
  };

  const schema = useMemo(
    () => (committed ? inferAnswerSchema(committed, committed) : null),
    [committed],
  );

  const editorKind = useMemo(() => detectEditorKind(committed), [committed]);

  const handleAlgebraSubmit = (newSteps: string[]) => {
    setSteps(newSteps);
    if (schema) {
      const finalLine = [...newSteps].reverse().find((s) => s.trim().length > 0) || "";
      setVerdict(gradeAnswer(finalLine, schema));
    } else {
      setVerdict(null);
    }
  };

  const handleGeometrySubmit = (data: any) => {
    setVerdict({
      status: data?.passed === data?.total && data?.total > 0 ? "correct" : "partial",
      message:
        data?.total > 0
          ? `${data.passed} / ${data.total} من القيود محقّقة`
          : "تم استلام إنشائك.",
    });
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
              صف المسألة، وسيختار الاستوديو تلقائياً المحرر الجبري أو الهندسي
              المناسب.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
          محرر ذكي
        </span>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-5 pb-24">
        {/* Task description */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
            صف المسألة (اختياري)
          </label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="مثال: حل المعادلة 2x + 3 = 7، أو ارسم مثلثاً ABC قائماً في A."
            rows={2}
            className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none transition-all resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              عند الضغط على "تحميل المسألة"، يحلّل النظام النص ويفعّل المحرر
              المناسب مع التصحيح التلقائي.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setKbOpen(true)}
                className="px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
              >
                📚 اختر من المكتبة
              </button>
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
                  setSteps([]);
                }}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                تحميل المسألة ←
              </button>
            </div>
          </div>

          {committed && (
            <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-3 flex items-center gap-3 flex-wrap">
              <span>
                المحرر النشط:{" "}
                <span className="font-bold text-foreground">
                  {editorKind === "geometry" ? "هندسي 📐" : "جبري 🧮"}
                </span>
              </span>
              {schema && (
                <>
                  <span className="opacity-40">•</span>
                  <span>
                    نوع الإجابة:{" "}
                    <span className="font-bold text-foreground">
                      {schema.type}
                    </span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Smart solving guide — explains the method, steps, symbols & pitfalls */}
        {committed && editorKind === "algebra" && (
          <AlgebraSolvingGuide problemText={committed} />
        )}

        {/* Smart editor — auto-routes algebra ↔ geometry */}
        <StudentAnswerEditor
          exerciseText={committed || ""}
          onSubmitAlgebra={handleAlgebraSubmit}
          onSubmitGeometry={handleGeometrySubmit}
        />

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

        {/* Submitted algebra steps recap */}
        {editorKind === "algebra" && steps.length > 0 && (
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

      {/* KB picker modal */}
      {kbOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setKbOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-foreground">📚 مكتبة المسائل</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  اختر مسألة من منهجك ({gradeCode || "—"} / {countryCode || "DZ"}) لتحميلها مباشرة في الاستوديو.
                </p>
              </div>
              <button
                onClick={() => setKbOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-3 border-b border-border">
              <input
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                placeholder="بحث في النص أو الفصل..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {kbLoading && (
                <div className="text-center py-10 text-sm text-muted-foreground">⏳ جاري تحميل المسائل...</div>
              )}
              {kbError && (
                <div className="text-center py-10 text-sm text-destructive">⚠️ {kbError}</div>
              )}
              {!kbLoading && !kbError && groupedKb.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  لا توجد مسائل متاحة لهذا المستوى بعد.
                </div>
              )}
              {!kbLoading && !kbError && groupedKb.map(([chapter, items]) => (
                <div key={chapter} className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-primary border-b border-primary/20 pb-1">
                    {chapter} <span className="text-muted-foreground/70 font-normal">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => loadProblem(it.text)}
                        className="w-full text-right p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {it.source || "تمرين"}
                          </span>
                          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            تحميل ←
                          </span>
                        </div>
                        <MathContent
                          text={(it.text || "").slice(0, 220) + ((it.text || "").length > 220 ? "..." : "")}
                          className="text-xs"
                          autoHighlightNumbers={false}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
