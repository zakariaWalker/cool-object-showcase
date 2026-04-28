// ===== Student Enrichment Layer =====
// Captures structured answers from the student about a geometry exercise
// (givens, goal, shape, relations, tags) and:
//   1. Translates them into extra Constraints that strengthen the canvas
//      verification (better than text-only regex).
//   2. Persists them to `kb_geometry_enrichments` so future learners benefit.

import { supabase } from "@/integrations/supabase/client";
import type { Constraint } from "./construction-checks";
import { hashGeometryText } from "./kb-context";

export interface Given {
  /** e.g. "AB", "A", "angle(BAC)" */
  label: string;
  /** e.g. "5 cm", "60°", "midpoint of [BC]" */
  value: string;
  kind?: "length" | "angle" | "point" | "other";
}

export interface RelationHint {
  kind: "perpendicular" | "parallel" | "equal_length" | "equal_angle" | "midpoint" | "on_circle" | "tangent";
  labels: string[];
  note?: string;
}

export interface Enrichment {
  givens: Given[];
  goal: string;
  shape_hint: string;
  relations: RelationHint[];
  tags: string[];
  notes: string;
}

export const EMPTY_ENRICHMENT: Enrichment = {
  givens: [],
  goal: "",
  shape_hint: "",
  relations: [],
  tags: [],
  notes: "",
};

/** Convert relation hints into Constraint objects compatible with the canvas. */
export function relationsToConstraints(rels: RelationHint[]): Constraint[] {
  const out: Constraint[] = [];
  for (const r of rels) {
    const labels = (r.labels || []).filter(Boolean);
    if (r.kind === "perpendicular" && labels.length >= 4) {
      out.push({
        kind: "perpendicular",
        labels: labels.slice(0, 4),
        description: `(${labels[0]}${labels[1]}) ⟂ (${labels[2]}${labels[3]})`,
      });
    } else if (r.kind === "parallel" && labels.length >= 4) {
      out.push({
        kind: "parallel",
        labels: labels.slice(0, 4),
        description: `(${labels[0]}${labels[1]}) ∥ (${labels[2]}${labels[3]})`,
      });
    } else if (r.kind === "midpoint" && labels.length >= 3) {
      out.push({
        kind: "midpoint",
        labels: labels.slice(0, 3),
        description: `${labels[0]} منتصف [${labels[1]}${labels[2]}]`,
      });
    } else if (r.kind === "on_circle" && labels.length >= 2) {
      out.push({
        kind: "on_circle",
        labels: [labels[0]],
        context: labels[1],
        description: `${labels[0]} ينتمي إلى الدائرة (${labels[1]})`,
      });
    }
  }
  return out;
}

/** Suggest follow-up questions based on the exercise text. */
export function suggestQuestions(text: string): string[] {
  const t = (text || "").toLowerCase();
  const qs: string[] = ["ما الشكل المطروح؟", "ما هي المعطيات الصريحة في النص؟", "ما المطلوب إثباته أو إنشاؤه؟"];
  if (/مثلث|triangle/.test(t)) qs.push("هل المثلث قائم/متساوي الساقين/متساوي الأضلاع؟");
  if (/دائرة|circle|cercle/.test(t)) qs.push("ما مركز الدائرة ونصف قطرها؟");
  if (/منصّ?ف|médiatrice|bissectrice/.test(t)) qs.push("هل المنصّف عمودي أم منصّف زاوية؟");
  if (/متوازي|parallèle/.test(t)) qs.push("ما المستقيمان المتوازيان؟");
  if (/متعامد|perpendicul/.test(t)) qs.push("ما المستقيمان المتعامدان؟");
  return qs;
}

/** Persist (or upvote) an enrichment for the given exercise text. */
export async function saveEnrichment(opts: {
  text: string;
  exerciseId?: string | null;
  enrichment: Enrichment;
}): Promise<{ ok: boolean; id?: string }> {
  const text = (opts.text || "").trim();
  if (!text) return { ok: false };
  const text_hash = hashGeometryText(text);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    // One row per (user, text_hash) — upsert by hand.
    const { data: existing } = await (supabase as any)
      .from("kb_geometry_enrichments")
      .select("id,upvotes")
      .eq("text_hash", text_hash)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await (supabase as any)
        .from("kb_geometry_enrichments")
        .update({
          givens: opts.enrichment.givens,
          goal: opts.enrichment.goal,
          shape_hint: opts.enrichment.shape_hint,
          relations: opts.enrichment.relations,
          tags: opts.enrichment.tags,
          notes: opts.enrichment.notes,
          upvotes: Number(existing.upvotes || 1) + 1,
          exercise_id: opts.exerciseId ?? null,
        })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true, id: existing.id };
    }

    const { data, error } = await (supabase as any)
      .from("kb_geometry_enrichments")
      .insert({
        text_hash,
        text_sample: text.slice(0, 500),
        exercise_id: opts.exerciseId ?? null,
        user_id: user.id,
        givens: opts.enrichment.givens,
        goal: opts.enrichment.goal,
        shape_hint: opts.enrichment.shape_hint,
        relations: opts.enrichment.relations,
        tags: opts.enrichment.tags,
        notes: opts.enrichment.notes,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: data?.id };
  } catch (err) {
    console.warn("[saveEnrichment] failed:", err);
    return { ok: false };
  }
}

/** Load the best (most-upvoted) enrichment for a given exercise text. */
export async function loadBestEnrichment(text: string): Promise<Enrichment | null> {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const text_hash = hashGeometryText(trimmed);
  try {
    const { data } = await (supabase as any)
      .from("kb_geometry_enrichments")
      .select("givens,goal,shape_hint,relations,tags,notes")
      .eq("text_hash", text_hash)
      .order("upvotes", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      givens: Array.isArray(data.givens) ? data.givens : [],
      goal: data.goal || "",
      shape_hint: data.shape_hint || "",
      relations: Array.isArray(data.relations) ? data.relations : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      notes: data.notes || "",
    };
  } catch {
    return null;
  }
}
