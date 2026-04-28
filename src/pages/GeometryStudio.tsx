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
import { Search, BookOpen, Loader2, Database, LayoutPanelLeft, Library } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"board" | "library">(seedText ? "board" : "library");

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
    setActiveTab("board");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header with tabs */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground"
              aria-label="رجوع"
            >
              ✕
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight">استوديو الهندسة</h1>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {activeChapter ? `الفصل: ${activeChapter}` : "لوحة إنشاء تفاعلية تتأقلم مع كل تمارين المنهاج"}
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold shrink-0">
            JSXGraph
          </span>
        </div>

        {/* Tab bar */}
        <div className="px-4 flex items-center gap-1">
          <TabButton
            active={activeTab === "board"}
            onClick={() => setActiveTab("board")}
            icon={<LayoutPanelLeft className="w-4 h-4" />}
            label="اللوحة"
            badge={committed ? "1" : undefined}
          />
          <TabButton
            active={activeTab === "library"}
            onClick={() => setActiveTab("library")}
            icon={<Library className="w-4 h-4" />}
            label="تمارين المنهاج"
            badge={String(filteredExercises.length || exercises.length || 0)}
          />
        </div>
      </div>

      {/* === Main content area === */}
      <div className="flex-1 max-w-[1500px] w-full mx-auto p-3 lg:p-4">
        {activeTab === "board" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 lg:gap-4">
            {/* Main column — exercise + canvas */}
            <div className="space-y-3 min-w-0">
              {!committed ? (
                /* Empty board state */
                <div className="rounded-xl border border-dashed border-border bg-card/60 p-6 space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <LayoutPanelLeft className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-base font-bold text-foreground">ابدأ بتمرين</h2>
                    <p className="text-xs text-muted-foreground">
                      اكتب نصاً أو اختر من{" "}
                      <button
                        onClick={() => setActiveTab("library")}
                        className="text-primary underline underline-offset-2 font-bold"
                      >
                        تمارين المنهاج
                      </button>
                    </p>
                  </div>
                  <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="مثال: ارسم مثلثاً ABC، ثم أنشئ المنصّف العمودي للضلع [BC]."
                    rows={3}
                    className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setCommitted(task.trim()); setLastResult(null); }}
                      disabled={!task.trim()}
                      className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      تحميل ←
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Wrong studio guard */}
                  {isNonConstructible(committed, exercises.find(e => e.id === activeExId)?.type || null) && (
                    <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
                      <span className="text-2xl shrink-0">⚠️</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">هذا التمرين ليس إنشاءً هندسياً</h3>
                        <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                          يبدو أنه تمرين جبري أو مثلثاتي يُحلّ بالحساب. ننصح بفتحه في استوديو الجبر.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/algebra-studio?text=${encodeURIComponent(committed)}`)}
                        className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold shadow hover:opacity-90 shrink-0"
                      >
                        فتح في الجبر ←
                      </button>
                    </div>
                  )}

                  {/* Exercise text — collapsible-feel compact card */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
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

                    {/* Silent readiness */}
                    <div className="flex items-center gap-2 text-[11px] border-t border-border/50 pt-3">
                      {analyzing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span className="text-muted-foreground">جارٍ تجهيز اللوحة…</span>
                        </>
                      ) : figureSpec || constraints.length > 0 ? (
                        <>
                          <Database className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-muted-foreground line-clamp-1 flex-1">
                            {caption || "اللوحة جاهزة — ابدأ الإنشاء"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">اللوحة جاهزة — ابدأ الإنشاء.</span>
                      )}
                    </div>
                  </div>

                  {/* Cognitive entry — visible help + first step */}
                  {(() => {
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

                  {/* Mobile enrichment */}
                  <div className="lg:hidden">
                    <StudentEnrichmentPanel
                      text={committed}
                      exerciseId={activeExId}
                      onApply={(e) => setEnrichmentConstraints(relationsToConstraints(e.relations))}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right: enrichment panel (sticky, desktop) */}
            <aside className="hidden lg:block lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto">
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
          </div>
        ) : (
          /* === Library tab === */
          <div className="rounded-xl border border-border bg-card flex flex-col h-[calc(100vh-180px)]">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">تمارين المنهاج</h2>
                <span className="text-xs text-muted-foreground mr-auto">
                  {filteredExercises.length} تمرين
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن تمرين، فصل، أو موضوع…"
                  className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {loadingEx ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحميل…
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-20 px-4">
                  لا توجد تمارين هندسية متاحة الآن.
                </div>
              ) : (
                <div className="space-y-4">
                  {grouped.map(([chapter, items]) => (
                    <div key={chapter}>
                      <div className="text-[11px] font-black text-muted-foreground uppercase tracking-wider px-2 mb-2 sticky top-0 bg-card py-1 z-[1]">
                        {chapter} <span className="text-muted-foreground/60">({items.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {items.slice(0, 60).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => loadExercise(e)}
                            className={`text-right p-3 rounded-lg text-xs leading-relaxed transition-all border ${
                              activeExId === e.id
                                ? "bg-primary/10 border-primary/40 text-foreground"
                                : "border-border hover:border-primary/40 hover:bg-muted/40 text-foreground"
                            }`}
                          >
                            <div className="line-clamp-3" dir="rtl">
                              <MathExerciseRenderer text={e.text} className="text-xs leading-relaxed" />
                            </div>
                            {e.type && (
                              <span className="inline-block mt-2 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
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
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}
