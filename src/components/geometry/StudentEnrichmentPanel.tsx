// ===== Student Enrichment Panel — Interactive Wizard =====
// Step-by-step guided flow: one question at a time, compact layout, no scrolling.

import { useEffect, useMemo, useState } from "react";
import {
  Lightbulb, Plus, X, Save, Loader2, Check, ArrowRight, ArrowLeft, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Enrichment,
  type Given,
  type RelationHint,
  type ExerciseDomain,
  EMPTY_ENRICHMENT,
  saveEnrichment,
  loadBestEnrichment,
  suggestTags,
  detectDomain,
} from "@/engine/figures/enrichments";

const RELATION_OPTIONS: { value: RelationHint["kind"]; label: string }[] = [
  { value: "perpendicular", label: "تعامد ⟂" },
  { value: "parallel", label: "توازي ∥" },
  { value: "midpoint", label: "منتصف" },
  { value: "equal_length", label: "تساوي أطوال" },
  { value: "equal_angle", label: "تساوي زوايا" },
  { value: "on_circle", label: "ينتمي للدائرة" },
  { value: "tangent", label: "مماس" },
];

interface Props {
  text: string;
  exerciseId: string | null;
  domain?: ExerciseDomain;
  onApply?: (e: Enrichment) => void;
  compact?: boolean;
}

type StepId = "shape" | "givens" | "relations" | "goal" | "tags" | "review";

export function StudentEnrichmentPanel({ text, exerciseId, domain, onApply }: Props) {
  const [enr, setEnr] = useState<Enrichment>(EMPTY_ENRICHMENT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const resolvedDomain = useMemo<ExerciseDomain>(
    () => domain ?? detectDomain(text),
    [domain, text],
  );
  const tagPool = useMemo(() => suggestTags(resolvedDomain), [resolvedDomain]);
  const showRelations = resolvedDomain === "geometry";
  const shapeLabel = resolvedDomain === "geometry" ? "الشكل المطروح" : "الموضوع/النوع";

  const steps = useMemo<{ id: StepId; title: string; question: string; hint?: string }[]>(() => {
    const s: { id: StepId; title: string; question: string; hint?: string }[] = [
      { id: "shape", title: shapeLabel, question: `ما ${shapeLabel}؟`, hint: "بكلمة واحدة: مثلث، دائرة، دالة…" },
      { id: "givens", title: "المعطيات", question: "ما هي المعطيات الصريحة؟", hint: "أضف كل معطى على شكل (رمز = قيمة)" },
    ];
    if (showRelations) s.push({ id: "relations", title: "العلاقات", question: "هل توجد علاقات هندسية؟", hint: "تعامد، توازي، منتصف…" });
    s.push({ id: "goal", title: "المطلوب", question: "ما المطلوب بالضبط؟", hint: "اكتب الهدف بجملة واحدة" });
    s.push({ id: "tags", title: "وسوم", question: "اختر وسوماً تصف التمرين", hint: "تساعد على تنظيم أفكارك" });
    s.push({ id: "review", title: "مراجعة", question: "راجع ثم احفظ", hint: "" });
    return s;
  }, [shapeLabel, showRelations]);

  const step = steps[Math.min(stepIdx, steps.length - 1)];

  // Pre-fill from community enrichment.
  useEffect(() => {
    if (!text.trim()) { setEnr(EMPTY_ENRICHMENT); return; }
    let cancelled = false;
    setLoading(true);
    setStepIdx(0);
    setSavedOnce(false);
    loadBestEnrichment(text)
      .then((found) => {
        if (cancelled) return;
        if (found) { setEnr(found); onApply?.(found); }
        else setEnr(EMPTY_ENRICHMENT);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const addGiven = () =>
    setEnr((e) => ({ ...e, givens: [...e.givens, { label: "", value: "", kind: "other" }] }));
  const updateGiven = (i: number, patch: Partial<Given>) =>
    setEnr((e) => ({ ...e, givens: e.givens.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));
  const removeGiven = (i: number) =>
    setEnr((e) => ({ ...e, givens: e.givens.filter((_, j) => j !== i) }));

  const addRelation = () =>
    setEnr((e) => ({
      ...e,
      relations: [...e.relations, { kind: "perpendicular", labels: ["", "", "", ""] }],
    }));
  const updateRelation = (i: number, patch: Partial<RelationHint>) =>
    setEnr((e) => ({ ...e, relations: e.relations.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const removeRelation = (i: number) =>
    setEnr((e) => ({ ...e, relations: e.relations.filter((_, j) => j !== i) }));

  const toggleTag = (tag: string) =>
    setEnr((e) => ({
      ...e,
      tags: e.tags.includes(tag) ? e.tags.filter((t) => t !== tag) : [...e.tags, tag],
    }));

  const handleApply = () => { onApply?.(enr); toast.success("تمّ تطبيق المعطيات على اللوحة"); };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveEnrichment({ text, exerciseId, enrichment: enr });
    setSaving(false);
    if (res.ok) {
      setSavedOnce(true);
      onApply?.(enr);
      toast.success("شكراً لمساهمتك!");
    } else {
      toast.error("سجّل دخولك لحفظ المساهمة");
    }
  };

  const goNext = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const goPrev = () => setStepIdx((i) => Math.max(i - 1, 0));
  const isLast = stepIdx === steps.length - 1;

  // Per-step completion / count badge.
  const stepStatus = (id: StepId): { done: boolean; count?: number } => {
    switch (id) {
      case "shape": return { done: !!enr.shape_hint.trim() };
      case "givens": return { done: enr.givens.some((g) => g.label.trim()), count: enr.givens.filter((g) => g.label.trim()).length };
      case "relations": return { done: enr.relations.length > 0, count: enr.relations.length };
      case "goal": return { done: !!enr.goal.trim() };
      case "tags": return { done: enr.tags.length > 0, count: enr.tags.length };
      case "review": return { done: savedOnce };
    }
  };

  if (!text.trim()) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-l from-primary/10 to-transparent border-b border-border">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">رتّب أفكارك خطوة بخطوة</h3>
          <p className="text-[10px] text-muted-foreground leading-tight">إجاباتك تُغذّي العمل وتُثري قاعدة المعرفة</p>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
          {stepIdx + 1}/{steps.length}
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 px-4 pt-3">
        {steps.map((s, i) => {
          const st = stepStatus(s.id);
          const active = i === stepIdx;
          return (
            <button
              key={s.id}
              onClick={() => setStepIdx(i)}
              className={`flex-1 group flex flex-col items-center gap-1 ${active ? "" : "opacity-70 hover:opacity-100"}`}
              title={s.title}
            >
              <div
                className={`w-full h-1.5 rounded-full transition-colors ${
                  active ? "bg-primary" : st.done ? "bg-primary/50" : "bg-muted"
                }`}
              />
              <span className={`text-[9px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>
                {s.title}
                {typeof st.count === "number" && st.count > 0 ? ` (${st.count})` : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active step body — fixed min-height to prevent jumpy layout */}
      <div className="px-4 py-4 min-h-[180px] flex flex-col">
        <div className="mb-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {step.question}
          </p>
          {step.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{step.hint}</p>}
        </div>

        <div className="flex-1">
          {step.id === "shape" && (
            <input
              value={enr.shape_hint}
              onChange={(e) => setEnr((s) => ({ ...s, shape_hint: e.target.value }))}
              placeholder="مثلث، دائرة، مستطيل، دالة تآلفية…"
              autoFocus
              className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          )}

          {step.id === "givens" && (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {enr.givens.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic text-center py-2">لا توجد معطيات بعد.</p>
              )}
              {enr.givens.map((g, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    value={g.label}
                    onChange={(e) => updateGiven(i, { label: e.target.value })}
                    placeholder="AB"
                    className="w-20 p-2 rounded-md border border-border bg-background text-xs text-center font-mono focus:border-primary focus:outline-none"
                  />
                  <span className="text-muted-foreground text-xs">=</span>
                  <input
                    value={g.value}
                    onChange={(e) => updateGiven(i, { value: e.target.value })}
                    placeholder="5 cm"
                    className="flex-1 p-2 rounded-md border border-border bg-background text-xs focus:border-primary focus:outline-none"
                  />
                  <button onClick={() => removeGiven(i)} className="p-1 text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addGiven}
                className="w-full py-2 rounded-md border border-dashed border-border text-[11px] text-primary hover:bg-primary/5 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> إضافة معطى
              </button>
            </div>
          )}

          {step.id === "relations" && (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {enr.relations.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic text-center py-2">لا توجد علاقات بعد.</p>
              )}
              {enr.relations.map((r, i) => (
                <div key={i} className="flex gap-1.5 flex-wrap items-center">
                  <select
                    value={r.kind}
                    onChange={(e) => updateRelation(i, { kind: e.target.value as RelationHint["kind"] })}
                    className="p-2 rounded-md border border-border bg-background text-xs focus:border-primary focus:outline-none"
                  >
                    {RELATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    value={(r.labels || []).join(",")}
                    onChange={(e) =>
                      updateRelation(i, {
                        labels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="A,B,C,D"
                    className="flex-1 min-w-[120px] p-2 rounded-md border border-border bg-background text-xs font-mono focus:border-primary focus:outline-none"
                  />
                  <button onClick={() => removeRelation(i)} className="p-1 text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addRelation}
                className="w-full py-2 rounded-md border border-dashed border-border text-[11px] text-primary hover:bg-primary/5 flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> إضافة علاقة
              </button>
            </div>
          )}

          {step.id === "goal" && (
            <textarea
              value={enr.goal}
              onChange={(e) => setEnr((s) => ({ ...s, goal: e.target.value }))}
              placeholder="مثال: أثبت أنّ المثلث ABC قائم في A"
              autoFocus
              rows={4}
              className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:border-primary focus:outline-none"
            />
          )}

          {step.id === "tags" && (
            <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto">
              {tagPool.map((t) => {
                const on = enr.tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      on
                        ? "bg-primary text-primary-foreground border-primary scale-105"
                        : "bg-background border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {on && "✓ "}{t}
                  </button>
                );
              })}
            </div>
          )}

          {step.id === "review" && (
            <div className="space-y-1.5 text-[11px] max-h-[180px] overflow-y-auto pr-1">
              <Row label={shapeLabel} value={enr.shape_hint || "—"} />
              <Row label="المطلوب" value={enr.goal || "—"} />
              <Row label="معطيات" value={enr.givens.filter((g) => g.label).map((g) => `${g.label}=${g.value}`).join(" • ") || "—"} />
              {showRelations && (
                <Row label="علاقات" value={enr.relations.length ? `${enr.relations.length} علاقة` : "—"} />
              )}
              <Row label="وسوم" value={enr.tags.join(" • ") || "—"} />
            </div>
          )}
        </div>
      </div>

      {/* Footer — navigation + final actions */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-t border-border">
        <button
          onClick={goPrev}
          disabled={stepIdx === 0}
          className="px-3 py-2 rounded-lg border border-border text-xs font-bold hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ArrowRight className="w-3.5 h-3.5" /> السابق
        </button>

        {!isLast ? (
          <button
            onClick={goNext}
            className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1"
          >
            التالي <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            {onApply && (
              <button
                onClick={handleApply}
                className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-bold hover:bg-muted"
              >
                تطبيق على اللوحة
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedOnce ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {savedOnce ? "محفوظ" : "حفظ وإثراء KB"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="font-bold text-muted-foreground min-w-[70px]">{label}:</span>
      <span className="text-foreground flex-1 break-words">{value}</span>
    </div>
  );
}
