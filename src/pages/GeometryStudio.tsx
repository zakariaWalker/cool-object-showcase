// ===== Geometry Studio — Interactive board adapted to all exercises =====
// JSXGraph-powered canvas. Now adapts to every exercise in the KB:
// browse the exercise library on the right, click any geometry exercise to
// load it into the board with auto-seeded figure + verification constraints.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { GeometryCanvas, type VerifyResult } from "@/components/geometry/GeometryCanvas";
import { buildAutoFigureSpec, detectFigureKind, defaultFigureSpec, relabelSpec } from "@/engine/figures/factory";
import type { FigureSpec } from "@/engine/figures/types";
import { inferConstraints, type Constraint } from "@/engine/figures/construction-checks";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { Search, BookOpen, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const { countryCode } = useUserCurriculum();

  const seedText = params.get("text") || "";
  const [task, setTask] = useState(seedText);
  const [committed, setCommitted] = useState(seedText);
  const [lastResult, setLastResult] = useState<VerifyResult | null>(null);
  const [activeExId, setActiveExId] = useState<string | null>(null);

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

  // Regex-based fallback (instant, deterministic).
  const fallbackSpec = useMemo(
    () => (committed ? buildAutoFigureSpec({ text: committed }) : null),
    [committed],
  );
  const fallbackConstraints = useMemo(
    () => (committed ? inferConstraints(committed) : []),
    [committed],
  );

  // AI-enhanced spec/constraints (loaded on commit).
  const [aiSpec, setAiSpec] = useState<FigureSpec | null>(null);
  const [aiConstraints, setAiConstraints] = useState<Constraint[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCaption, setAiCaption] = useState<string>("");
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  // Whichever is best: AI when available & confident, otherwise regex.
  const figureSpec = aiSpec ?? fallbackSpec;
  const constraints = aiConstraints ?? fallbackConstraints;

  // Call the AI analyzer whenever the committed text changes.
  useEffect(() => {
    if (!committed.trim()) {
      setAiSpec(null); setAiConstraints(null); setAiCaption(""); setAiConfidence(null);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "analyze-geometry-context",
          { body: { text: committed } },
        );
        if (cancelled) return;
        if (error) throw error;
        const r = data?.result;
        if (!r || typeof r !== "object") {
          setAiSpec(null); setAiConstraints(null); return;
        }
        // Build FigureSpec from AI output
        let spec: FigureSpec | null = null;
        if (r.kind && r.kind !== "point_set") {
          const base = defaultFigureSpec(r.kind);
          if (Array.isArray(r.vertices) && r.vertices.length > 0) {
            const verts: Record<string, [number, number, number?]> = {};
            for (const v of r.vertices) {
              if (typeof v?.label === "string" && typeof v.x === "number" && typeof v.y === "number") {
                verts[v.label] = typeof v.z === "number" ? [v.x, v.y, v.z] : [v.x, v.y];
              }
            }
            spec = {
              ...base,
              kind: r.kind,
              vertices: Object.keys(verts).length ? verts : base.vertices,
              edges: Array.isArray(r.edges) && r.edges.length
                ? r.edges as [string, string][]
                : base.edges,
              dims: r.dims || base.dims,
              label: Array.isArray(r.labels) ? r.labels.join("") : base.label,
            };
          } else if (Array.isArray(r.labels) && r.labels.length) {
            spec = relabelSpec(base, r.labels);
          } else {
            spec = base;
          }
        }
        const cs: Constraint[] = Array.isArray(r.constraints)
          ? r.constraints
              .filter((c: any) => c && typeof c.kind === "string" && typeof c.description === "string")
              .map((c: any) => ({
                kind: c.kind,
                labels: Array.isArray(c.labels) ? c.labels : [],
                context: c.context,
                description: c.description,
              }))
          : [];
        setAiSpec(spec);
        setAiConstraints(cs);
        setAiCaption(typeof r.caption === "string" ? r.caption : "");
        setAiConfidence(typeof r.confidence === "number" ? r.confidence : null);
      } catch (err: any) {
        if (cancelled) return;
        console.error("[GeometryStudio] AI analyze failed:", err);
        if (err?.message?.includes("429")) toast.error("الحدّ الزمني للذكاء الاصطناعي بلغ، حاول بعد قليل.");
        else if (err?.message?.includes("402")) toast.error("نفذت أرصدة الذكاء الاصطناعي.");
        // Silent regex fallback otherwise
        setAiSpec(null); setAiConstraints(null);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [committed]);


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

      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6 pb-24">
        {/* === Main column === */}
        <div className="space-y-4 min-w-0">
          {/* Task input */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
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
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTask(""); setCommitted(""); setLastResult(null); setActiveExId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  إفراغ
                </button>
                <button
                  onClick={() => { setCommitted(task.trim()); setLastResult(null); }}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
                >
                  تحميل ←
                </button>
              </div>
            </div>

            {/* AI parsing status */}
            {committed && (
              <div className="flex items-center gap-2 text-[11px] border-t border-border/50 pt-3">
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-muted-foreground">يحلّل الذكاء الاصطناعي السياق…</span>
                  </>
                ) : aiSpec || (aiConstraints && aiConstraints.length > 0) ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-foreground">تحليل ذكي:</span>
                    <span className="text-muted-foreground line-clamp-1 flex-1">
                      {aiCaption || `${constraints.length} قيد للتحقّق`}
                    </span>
                    {aiConfidence != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        {Math.round(aiConfidence * 100)}%
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">تحليل سريع (بدون ذكاء اصطناعي).</span>
                  </>
                )}
              </div>
            )}
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

        {/* === Side: exercise library === */}
        <aside className="rounded-xl border border-border bg-card flex flex-col h-[calc(100vh-140px)] sticky top-20">
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
                          <span className="line-clamp-3">{e.text}</span>
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
