// ===== Algebra Studio — Smart workspace adapted to all exercises =====
// Side library lists every algebra exercise from the KB (filtered to ones the
// algebra editor can handle). Click any exercise to load it; the studio
// auto-routes to the algebra editor (or geometry canvas when needed) and
// auto-grades the final line.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { StudentAnswerEditor } from "@/components/StudentAnswerEditor";
import { LatexRenderer } from "@/components/LatexRenderer";
import { MathContent } from "@/components/MathContent";
import { AlgebraSolvingGuide } from "@/components/AlgebraSolvingGuide";
import { inferAnswerSchema, gradeAnswer, type Verdict } from "@/engine/answer-schema";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { Search, BookOpen, Loader2 } from "lucide-react";
import { CognitiveEntryHeader } from "@/components/solver/CognitiveEntryHeader";
import { deriveStudioCognitive } from "@/components/solver/studio-cognitive";

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
  type: string | null;
  grade?: string | null;
}

// Mirror of detectEditorType from StudentAnswerEditor — used to show
// the user which editor will appear and to filter the algebra library.
function detectEditorKind(text: string): "algebra" | "geometry" {
  const txt = (text || "").toLowerCase();
  // Trig identities / function studies / proofs → algebra, even if they mention "مثلث" (مثلثية).
  if (/\\sin|\\cos|\\tan|\\cot|sin\(|cos\(|tan\(|جا\s*\(|جتا\s*\(|ظا\s*\(|متطابقة|identité|fonction|دالة/.test(txt)) return "algebra";
  if (/(أثبت|بيّن|برهن|démontr|montr|prouv)\s+(أن|que|صحة|l'égalité|l'identité)/i.test(txt)) return "algebra";
  // Construction-only verbs trigger geometry.
  if (/(ارسم|أنشئ|construire|tracer|dessiner)/.test(txt)) return "geometry";
  // Pure shape names with no algebraic context.
  if (/(الدائرة|المستقيم|قطعة|مستقيم|تحويل|دوران|انسحاب|تماثل|زاوية|منحنى)/.test(txt)) return "geometry";
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
  const [activeExId, setActiveExId] = useState<string | null>(null);
  const [activeGrade, setActiveGrade] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

  // KB browser state — now always loaded into the side panel
  const [kbLoading, setKbLoading] = useState(true);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbItems, setKbItems] = useState<KBExerciseLite[]>([]);
  const [kbQuery, setKbQuery] = useState("");
  const [showAllGrades, setShowAllGrades] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKbLoading(true);
      setKbError(null);
      try {
        const code = gradeCode || "4AM";
        const candidates = Array.from(new Set([code, GRADE_CODE_TO_KEY[code] || code]));
        let query = (supabase as any)
          .from("kb_exercises")
          .select("id, text, chapter, source, type, grade")
          .eq("country_code", countryCode || "DZ")
          .order("chapter")
          .limit(800);
        if (!showAllGrades) query = query.in("grade", candidates);
        const { data, error } = await query;
        if (error) throw error;
        if (cancelled) return;
        // Keep only algebra-leaning exercises (i.e. NOT geometry construction)
        const list = ((data || []) as KBExerciseLite[]).filter(
          (it) => detectEditorKind(it.text) === "algebra",
        );
        setKbItems(list);
      } catch (e: any) {
        if (!cancelled) setKbError(e.message || "تعذّر تحميل المسائل");
      } finally {
        if (!cancelled) setKbLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gradeCode, countryCode, showAllGrades]);

  const filteredKb = useMemo(() => {
    const q = kbQuery.trim().toLowerCase();
    if (!q) return kbItems;
    return kbItems.filter(
      (it) =>
        (it.text || "").toLowerCase().includes(q) ||
        (it.chapter || "").toLowerCase().includes(q) ||
        (it.type || "").toLowerCase().includes(q),
    );
  }, [kbItems, kbQuery]);

  const groupedKb = useMemo(() => {
    const map = new Map<string, KBExerciseLite[]>();
    for (const it of filteredKb) {
      const key = (it.chapter || "متفرّقات").trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [filteredKb]);

  const loadProblem = (it: KBExerciseLite) => {
    setTask(it.text);
    setCommitted(it.text.trim());
    setSteps([]);
    setVerdict(null);
    setActiveExId(it.id);
  };

  const schema = useMemo(
    () => (committed ? inferAnswerSchema(committed, committed) : null),
    [committed],
  );

  const editorKind = useMemo(() => detectEditorKind(committed), [committed]);
  const cognitive = useMemo(
    () => deriveStudioCognitive(committed, editorKind, gradeCode || undefined),
    [committed, editorKind, gradeCode],
  );

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
              محرر ذكي يتأقلم مع كل مسائل المنهاج — جبر وهندسة.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
          محرر ذكي
        </span>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6 pb-24">
        {/* === Main column === */}
        <div className="space-y-5 min-w-0">
          {/* Task description */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              نص المسألة
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="مثال: حل المعادلة 2x + 3 = 7، أو ارسم مثلثاً ABC قائماً في A."
              rows={3}
              className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none transition-all resize-none"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-muted-foreground flex-1 min-w-[200px]">
                يحلّل النظام النص ويفعّل المحرر المناسب مع التصحيح التلقائي.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTask(""); setCommitted(""); setSteps([]); setVerdict(null); setActiveExId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  إفراغ
                </button>
                <button
                  onClick={() => {
                    setCommitted(task.trim()); setVerdict(null); setSteps([]);
                  }}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
                >
                  تحميل ←
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

          {/* Cognitive entry — answers "what / why / where to start" */}
          {committed && cognitive && <CognitiveEntryHeader {...cognitive} />}

          {/* Smart solving guide */}
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

        {/* === Side: exercise library === */}
        <aside className="rounded-xl border border-border bg-card flex flex-col h-[calc(100vh-140px)] sticky top-20">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">مسائل المنهاج</h2>
              <span className="text-[10px] text-muted-foreground mr-auto">
                {filteredKb.length}
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                placeholder="ابحث عن مسألة…"
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-md border border-border bg-background outline-none focus:border-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showAllGrades}
                onChange={(e) => setShowAllGrades(e.target.checked)}
                className="accent-primary"
              />
              عرض كل المستويات
            </label>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {kbLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
              </div>
            ) : kbError ? (
              <div className="text-center text-xs text-destructive py-10 px-4">⚠️ {kbError}</div>
            ) : groupedKb.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 px-4">
                لا توجد مسائل جبرية متاحة الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {groupedKb.map(([chapter, items]) => (
                  <div key={chapter}>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      {chapter}{" "}
                      <span className="text-muted-foreground/60">({items.length})</span>
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 30).map((it) => (
                        <button
                          key={it.id}
                          onClick={() => loadProblem(it)}
                          className={`w-full text-right p-2 rounded-md text-[11px] leading-relaxed transition-colors border ${
                            activeExId === it.id
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <MathContent
                            text={(it.text || "").slice(0, 180) + ((it.text || "").length > 180 ? "…" : "")}
                            className="text-[11px]"
                            autoHighlightNumbers={false}
                          />
                          {it.type && (
                            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {it.type}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
