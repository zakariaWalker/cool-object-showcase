// ===== Student Enrichment Panel =====
// Guided questions that help the learner organize their thinking AND enrich
// the KB with structured tags + givens. Appears alongside the canvas.

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, Plus, X, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  type Enrichment,
  type Given,
  type RelationHint,
  type ExerciseDomain,
  EMPTY_ENRICHMENT,
  saveEnrichment,
  loadBestEnrichment,
  suggestQuestions,
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
  /** Optional: caller may force the domain. Defaults to auto-detect. */
  domain?: ExerciseDomain;
  /** When the learner clicks "تطبيق على اللوحة". */
  onApply?: (e: Enrichment) => void;
  /** Compact rendering for embedding in tabs/sidebars. */
  compact?: boolean;
}

export function StudentEnrichmentPanel({ text, exerciseId, domain, onApply, compact }: Props) {
  const [enr, setEnr] = useState<Enrichment>(EMPTY_ENRICHMENT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  const resolvedDomain = useMemo<ExerciseDomain>(
    () => domain ?? detectDomain(text),
    [domain, text],
  );
  const questions = useMemo(() => suggestQuestions(text, resolvedDomain), [text, resolvedDomain]);
  const tagPool = useMemo(() => suggestTags(resolvedDomain), [resolvedDomain]);
  const showRelations = resolvedDomain === "geometry";
  const shapeLabel = resolvedDomain === "geometry" ? "الشكل" : "النوع/الموضوع";

  // Pre-fill from existing community enrichment.
  useEffect(() => {
    if (!text.trim()) {
      setEnr(EMPTY_ENRICHMENT);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadBestEnrichment(text)
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setEnr(found);
          onApply(found);
        } else {
          setEnr(EMPTY_ENRICHMENT);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const addGiven = () =>
    setEnr((e) => ({ ...e, givens: [...e.givens, { label: "", value: "", kind: "other" }] }));
  const updateGiven = (i: number, patch: Partial<Given>) =>
    setEnr((e) => ({
      ...e,
      givens: e.givens.map((g, j) => (j === i ? { ...g, ...patch } : g)),
    }));
  const removeGiven = (i: number) =>
    setEnr((e) => ({ ...e, givens: e.givens.filter((_, j) => j !== i) }));

  const addRelation = () =>
    setEnr((e) => ({
      ...e,
      relations: [...e.relations, { kind: "perpendicular", labels: ["", "", "", ""] }],
    }));
  const updateRelation = (i: number, patch: Partial<RelationHint>) =>
    setEnr((e) => ({
      ...e,
      relations: e.relations.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));
  const removeRelation = (i: number) =>
    setEnr((e) => ({ ...e, relations: e.relations.filter((_, j) => j !== i) }));

  const toggleTag = (tag: string) =>
    setEnr((e) => ({
      ...e,
      tags: e.tags.includes(tag) ? e.tags.filter((t) => t !== tag) : [...e.tags, tag],
    }));

  const handleApply = () => {
    onApply(enr);
    toast.success("تمّ تطبيق المعطيات على اللوحة");
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveEnrichment({ text, exerciseId, enrichment: enr });
    setSaving(false);
    if (res.ok) {
      setSavedOnce(true);
      onApply(enr);
      toast.success("شكراً لمساهمتك! تمّ إثراء قاعدة المعرفة");
    } else {
      toast.error("سجّل دخولك لحفظ المساهمة");
    }
  };

  if (!text.trim()) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">رتّب أفكارك</h3>
        <span className="text-[10px] text-muted-foreground">
          إجاباتك تُغذّي اللوحة وتُثري قاعدة المعرفة
        </span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mr-auto" />}
      </div>

      {/* Guiding questions */}
      <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pr-4">
        {questions.map((q, i) => <li key={i}>{q}</li>)}
      </ul>

      {/* Goal */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase">المطلوب</label>
        <input
          value={enr.goal}
          onChange={(e) => setEnr((s) => ({ ...s, goal: e.target.value }))}
          placeholder="مثال: أثبت أنّ المثلث ABC قائم في A"
          className="w-full mt-1 p-2 rounded-md border border-border bg-background text-xs"
        />
      </div>

      {/* Shape hint */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase">{shapeLabel}</label>
        <input
          value={enr.shape_hint}
          onChange={(e) => setEnr((s) => ({ ...s, shape_hint: e.target.value }))}
          placeholder="مثلث، دائرة، مستطيل…"
          className="w-full mt-1 p-2 rounded-md border border-border bg-background text-xs"
        />
      </div>

      {/* Givens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-muted-foreground uppercase">المعطيات</label>
          <button
            onClick={addGiven}
            className="text-[10px] flex items-center gap-1 text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> إضافة
          </button>
        </div>
        {enr.givens.map((g, i) => (
          <div key={i} className="flex gap-1">
            <input
              value={g.label}
              onChange={(e) => updateGiven(i, { label: e.target.value })}
              placeholder="AB"
              className="w-20 p-1.5 rounded-md border border-border bg-background text-xs text-center font-mono"
            />
            <span className="self-center text-muted-foreground text-xs">=</span>
            <input
              value={g.value}
              onChange={(e) => updateGiven(i, { value: e.target.value })}
              placeholder="5 cm"
              className="flex-1 p-1.5 rounded-md border border-border bg-background text-xs"
            />
            <button
              onClick={() => removeGiven(i)}
              className="px-2 text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Relations — only relevant for geometry */}
      {showRelations && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">العلاقات</label>
            <button
              onClick={addRelation}
              className="text-[10px] flex items-center gap-1 text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> إضافة
            </button>
          </div>
          {enr.relations.map((r, i) => (
            <div key={i} className="flex gap-1 flex-wrap">
              <select
                value={r.kind}
                onChange={(e) => updateRelation(i, { kind: e.target.value as RelationHint["kind"] })}
                className="p-1.5 rounded-md border border-border bg-background text-xs"
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
                className="flex-1 min-w-[100px] p-1.5 rounded-md border border-border bg-background text-xs font-mono"
              />
              <button
                onClick={() => removeRelation(i)}
                className="px-2 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase">وسوم</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {tagPool.map((t) => {
            const on = enr.tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border/50">
        {onApply && (
          <button
            onClick={handleApply}
            className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-bold hover:bg-muted transition-colors"
          >
            تطبيق على اللوحة
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : savedOnce ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
          {savedOnce ? "محفوظ" : "حفظ وإثراء KB"}
        </button>
      </div>
    </div>
  );
}
