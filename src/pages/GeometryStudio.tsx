// ===== Geometry Studio — Interactive board adapted to all exercises =====
// JSXGraph-powered canvas. Now adapts to every exercise in the KB:
// browse the exercise library on the right, click any geometry exercise to
// load it into the board with auto-seeded figure + verification constraints.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GeometryCanvas, type VerifyResult } from "@/components/geometry/GeometryCanvas";
import { detectFigureKind, isNonConstructible } from "@/engine/figures/factory";
import type { FigureSpec } from "@/engine/figures/types";
import type { Constraint } from "@/engine/figures/construction-checks";
import { analyzeGeometryFromKB, recordLearnedGeometry } from "@/engine/figures/kb-context";
import { relationsToConstraints } from "@/engine/figures/enrichments";
import { StudentEnrichmentPanel } from "@/components/geometry/StudentEnrichmentPanel";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { Search, BookOpen, Loader2, Database } from "lucide-react";
import { CognitiveEntryHeader } from "@/components/solver/CognitiveEntryHeader";
import { deriveStudioCognitive } from "@/components/solver/studio-cognitive";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";

interface KBEx {
  id: string;
  text: string;
  type: string | null;
  chapter: string | null;
  grade: string | null;
}

export default function GeometryStudio() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { countryCode, gradeCode } = useUserCurriculum();

  const seedText = params.get("text") || "";
  const [task, setTask] = useState(seedText);
  const [committed, setCommitted] = useState(seedText);
  const [lastResult, setLastResult] = useState<VerifyResult | null>(null);
  const [activeExId, setActiveExId] = useState<string | null>(null);
  const [activeGrade, setActiveGrade] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);

  // Exercise library (filtered to ones the canvas can seed)
  const [exercises, setExercises] = useState<KBEx[]>([]);
  const [loadingEx, setLoadingEx] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingEx(true);
      try {
        const { data } = await (supabase as any)
          .from("kb_exercises")
          .select("id,text,type,chapter,grade")
          .eq("country_code", countryCode || "DZ")
          .limit(800);
        if (cancelled) return;
        const list = (data || []) as KBEx[];
        // Keep only exercises where a figure can be detected (i.e. geometry-relevant)
        const filtered = list.filter((e) =>
          detectFigureKind({ text: e.text, type: e.type, chapter: e.chapter }),
        );
        setExercises(filtered);
      } finally {
        if (!cancelled) setLoadingEx(false);
      }
    })();
    return () => { cancelled = true; };
  }, [countryCode]);

  // KB-driven analysis (no AI calls — uses kb_figures, kb_skills, kb_patterns
  // and the deterministic regex detectors).
  const [figureSpec, setFigureSpec] = useState<FigureSpec | null>(null);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [caption, setCaption] = useState<string>("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [analysisSource, setAnalysisSource] = useState<string>("");

  // Student enrichment layer — extra constraints derived from guided answers.
  const [enrichmentConstraints, setEnrichmentConstraints] = useState<Constraint[]>([]);
  const mergedConstraints = useMemo(() => {
    const seen = new Set<string>();
    const all = [...constraints, ...enrichmentConstraints];
    return all.filter((c) => {
      const k = `${c.kind}|${(c.labels || []).join("-")}|${c.context || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [constraints, enrichmentConstraints]);

  useEffect(() => {
    if (!committed.trim()) {
      setFigureSpec(null);
      setConstraints([]);
      setCaption("");
      setConfidence(null);
      setAnalysisSource("");
      return;
    }
    let cancelled = false;
    setAnalyzing(true);
    (async () => {
      try {
        const ctx = await analyzeGeometryFromKB(committed, {
          exerciseId: activeExId,
          countryCode: countryCode || "DZ",
        });
        if (cancelled) return;
        setFigureSpec(ctx.spec);
        setConstraints(ctx.constraints);
        setCaption(ctx.caption);
        setConfidence(ctx.confidence);
        setAnalysisSource(ctx.source);
      } catch (err) {
        if (cancelled) return;
        console.error("[GeometryStudio] KB analyze failed:", err);
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [committed, activeExId, countryCode]);



  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.text?.toLowerCase().includes(q) ||
        e.chapter?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q),
    );
  }, [exercises, search]);

  // Group by chapter for clearer browsing
  const grouped = useMemo(() => {
    const map = new Map<string, KBEx[]>();
    for (const e of filteredExercises) {
      const key = e.chapter || "متفرّقات";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filteredExercises]);

  const loadExercise = (e: KBEx) => {
    setTask(e.text);
    setCommitted(e.text);
    setLastResult(null);
    setActiveExId(e.id);
    setActiveGrade(e.grade || null);
    setActiveChapter(e.chapter || null);
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
            <h1 className="text-lg font-bold text-foreground">استوديو الهندسة</h1>
            <p className="text-[11px] text-muted-foreground">
              لوحة إنشاء تفاعلية تتأقلم مع كل تمارين المنهاج.
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
          JSXGraph
        </span>
      </div>

      <div className="max-w-[1600px] mx-auto p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-[340px_1fr_300px] gap-3 lg:gap-4 pb-6">
        {/* === Left: Student enrichment (sticky) === */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
          {committed ? (
            <StudentEnrichmentPanel
              text={committed}
              exerciseId={activeExId}
              onApply={(e) => setEnrichmentConstraints(relationsToConstraints(e.relations))}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
              حمّل تمريناً لبدء ترتيب أفكارك خطوة بخطوة.
            </div>
          )}
        </aside>

        {/* === Main column === */}
        <div className="space-y-3 min-w-0">
          {/* Wrong studio guard */}
          {committed && isNonConstructible(committed, exercises.find(e => e.id === activeExId)?.type || null) && (
            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3" dir="rtl">
              <span className="text-2xl shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">هذا التمرين ليس إنشاءً هندسياً</h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                  يبدو أنه تمرين جبري أو مثلثاتي يُحلّ بالحساب وليس بالبركار والمسطرة. ننصح بفتحه في استوديو الجبر.
                </p>
              </div>
              <button
                onClick={() => navigate(`/algebra-studio?text=${encodeURIComponent(committed)}`)}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold shadow hover:opacity-90 shrink-0"
              >
                فتح في استوديو الجبر ←
              </button>
            </div>
          )}


          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {committed ? (
              <>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-black text-primary uppercase tracking-wider">
                      📜 نص التمرين
                    </div>
                    <button
                      onClick={() => {
                        setTask(""); setCommitted(""); setLastResult(null); setActiveExId(null);
                      }}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      تمرين جديد
                    </button>
                  </div>
                  <MathExerciseRenderer text={committed} className="text-sm leading-relaxed text-foreground" />
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2" dir="rtl">
                  <span className="text-lg shrink-0">👇</span>
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    <span className="font-bold">ابدأ من هنا:</span> اقرأ التمرين أعلاه، ثم استعمل اللوحة التفاعلية أدناه لرسم الشكل خطوة بخطوة. ستجد على اليسار لوحة «رتّب أفكارك» لتساعدك على التفكير قبل الرسم.
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  نص التمرين أو ما تريد إنشاءه
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="مثال: ارسم مثلثاً ABC، ثم أنشئ المنصّف العمودي للضلع [BC]."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none transition-all resize-none"
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-muted-foreground flex-1 min-w-[200px]">
                    اللوحة تُبذَر بالشكل المناسب وتُستخرج قيود التحقّق تلقائياً.
                  </p>
                  <button
                    onClick={() => { setCommitted(task.trim()); setLastResult(null); }}
                    disabled={!task.trim()}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    تحميل ←
                  </button>
                </div>
              </>
            )}

            {/* KB analysis status */}
            {committed && (
              <div className="flex items-center gap-2 text-[11px] border-t border-border/50 pt-3">
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-muted-foreground">يحلّل من قاعدة المعرفة…</span>
                  </>
                ) : figureSpec || constraints.length > 0 ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-foreground">
                      {analysisSource === "kb_learned"
                        ? "✓ معرفة مكتسبة:"
                        : analysisSource === "kb_figure"
                        ? "شكل من KB:"
                        : analysisSource === "kb_enriched"
                        ? "تحليل مُعزَّز من KB:"
                        : "تحليل آلي:"}
                    </span>
                    <span className="text-muted-foreground line-clamp-1 flex-1">
                      {caption || `${constraints.length} قيد للتحقّق`}
                    </span>
                    {confidence != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">لم يُتعرَّف على شكل في النص.</span>
                )}
              </div>
            )}
          </div>

          {/* Cognitive entry — visible help + first step */}
          {committed && (() => {
            const c = deriveStudioCognitive(committed, "geometry", activeGrade || gradeCode || undefined, activeChapter || undefined);
            return c ? <CognitiveEntryHeader {...c} /> : null;
          })()}

          {/* Canvas */}
          <div className="rounded-xl border border-border bg-card p-4">
            <GeometryCanvas
              seedSpec={figureSpec}
              constraints={mergedConstraints}
              onSubmit={(r) => {
                setLastResult(r);
                if (
                  r.total > 0 &&
                  r.passed === r.total &&
                  figureSpec &&
                  committed.trim()
                ) {
                  recordLearnedGeometry({
                    text: committed,
                    spec: figureSpec,
                    constraints: mergedConstraints,
                    caption,
                    exerciseId: activeExId,
                  }).catch(() => {});
                }
              }}
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

          {/* Student enrichment — mobile only (sidebar handles desktop) */}
          {committed && (
            <div className="lg:hidden">
              <StudentEnrichmentPanel
                text={committed}
                exerciseId={activeExId}
                onApply={(e) => setEnrichmentConstraints(relationsToConstraints(e.relations))}
              />
            </div>
          )}
        </div>

        {/* === Side: exercise library === */}
        <aside className="rounded-xl border border-border bg-card flex flex-col h-[calc(100vh-100px)] lg:sticky lg:top-20 lg:self-start">
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">تمارين المنهاج</h2>
              <span className="text-[10px] text-muted-foreground mr-auto">
                {filteredExercises.length}
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن تمرين…"
                className="w-full pr-8 pl-3 py-1.5 text-xs rounded-md border border-border bg-background outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {loadingEx ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-10 px-4">
                لا توجد تمارين هندسية متاحة الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {grouped.map(([chapter, items]) => (
                  <div key={chapter}>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                      {chapter} <span className="text-muted-foreground/60">({items.length})</span>
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 30).map((e) => (
                        <button
                          key={e.id}
                          onClick={() => loadExercise(e)}
                          className={`w-full text-right p-2 rounded-md text-[11px] leading-relaxed transition-colors border ${
                            activeExId === e.id
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="line-clamp-3" dir="rtl">
                            <MathExerciseRenderer text={e.text} className="text-[11px] leading-relaxed" />
                          </div>
                          {e.type && (
                            <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {e.type}
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
