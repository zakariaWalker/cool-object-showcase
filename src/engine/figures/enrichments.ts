// ===== Student Enrichment Layer =====
// Captures structured answers from the student about a geometry exercise
// (givens, goal, shape, relations, tags) and:
//   1. Translates them into extra Constraints that strengthen the canvas
//      verification (better than text-only regex).
//   2. Persists them to `kb_geometry_enrichments` so future learners benefit.

import { supabase } from "@/integrations/supabase/client";
import type { Constraint } from "./construction-checks";
import { hashGeometryText } from "./kb-context";

// ===== Local (anonymous) enrichment cache =====
// Stores contributions from signed-out users. They get silently flushed to the
// DB the next time the same browser signs in (see flushPendingEnrichments).
const LOCAL_KEY = "qed.pending_enrichments.v1";

interface PendingEnrichment {
  text_hash: string;
  text_sample: string;
  exercise_id: string | null;
  enrichment: Enrichment;
  saved_at: string;
}

function readPending(): Record<string, PendingEnrichment> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}
function writePending(map: Record<string, PendingEnrichment>) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

function savePendingLocal(p: PendingEnrichment) {
  const map = readPending();
  map[p.text_hash] = p;
  writePending(map);
}

export function loadPendingLocal(text: string): Enrichment | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const h = hashGeometryText(trimmed);
  const map = readPending();
  return map[h]?.enrichment ?? null;
}

/** Flush all locally-cached enrichments into the DB once the user is signed in. */
export async function flushPendingEnrichments(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const map = readPending();
    const entries = Object.values(map);
    if (entries.length === 0) return 0;
    let flushed = 0;
    for (const p of entries) {
      const { data: existing } = await (supabase as any)
        .from("kb_geometry_enrichments")
        .select("id,upvotes")
        .eq("text_hash", p.text_hash)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        await (supabase as any)
          .from("kb_geometry_enrichments")
          .update({
            givens: p.enrichment.givens,
            goal: p.enrichment.goal,
            shape_hint: p.enrichment.shape_hint,
            relations: p.enrichment.relations,
            tags: p.enrichment.tags,
            notes: p.enrichment.notes,
            upvotes: Number(existing.upvotes || 1) + 1,
            exercise_id: p.exercise_id ?? null,
          })
          .eq("id", existing.id);
      } else {
        await (supabase as any)
          .from("kb_geometry_enrichments")
          .insert({
            text_hash: p.text_hash,
            text_sample: p.text_sample,
            exercise_id: p.exercise_id ?? null,
            user_id: user.id,
            givens: p.enrichment.givens,
            goal: p.enrichment.goal,
            shape_hint: p.enrichment.shape_hint,
            relations: p.enrichment.relations,
            tags: p.enrichment.tags,
            notes: p.enrichment.notes,
          });
      }
      flushed++;
    }
    writePending({});
    return flushed;
  } catch (err) {
    console.warn("[flushPendingEnrichments] failed:", err);
    return 0;
  }
}

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

export type ExerciseDomain = "geometry" | "algebra" | "functions" | "statistics" | "probability" | "arithmetic" | "general";

/** Detect the dominant domain of an exercise from its text. */
export function detectDomain(text: string): ExerciseDomain {
  const t = (text || "").toLowerCase();
  // Trigonometry / unit circle / functions of angle → algebra (calculation)
  if (/(\\sin|\\cos|\\tan|\\cot|sin\(|cos\(|tan\(|جا\s*\(|جتا\s*\(|ظا\s*\()/.test(t)) return "algebra";
  if (/(دائرة\s+مثلثية|cercle\s+trigonom|الدائرة\s+الوحدوية)/i.test(t)) return "algebra";
  if (/(\\pi|\bπ\b)/.test(t) && /(cos|sin|tan|جا|جتا|ظا)/i.test(t)) return "algebra";
  // Pure algebra signals (no construction verb)
  if (/(معادلة|متراجحة|كثير\s*حدود|équation|inéquation|polynôme|développer|factoriser|simplifier|تحليل|نشر|بسّط)/i.test(t)
      && !/(ارسم|أنشئ|construire|tracer|dessiner)/i.test(t)) return "algebra";
  if (/مثلث|دائرة|مستطيل|مربّ?ع|متوازي|منصّ?ف|عمودي|triangle|circle|cercle|carré|rectangle|losange/.test(t)) return "geometry";
  if (/دالة|منحنى|fonction|courbe/.test(t)) return "functions";
  if (/متوسّ?ط|وسيط|تكرار|متغير|moyenne|médiane|effectif|écart/.test(t)) return "statistics";
  if (/احتمال|probabilit/.test(t)) return "probability";
  if (/جمع|طرح|ضرب|قسمة|نسبة|مضاعف|قاسم/.test(t)) return "arithmetic";
  return "general";
}

/** Suggest domain-aware follow-up questions for any exercise. */
export function suggestQuestions(text: string, domain?: ExerciseDomain): string[] {
  const d = domain ?? detectDomain(text);
  const t = (text || "").toLowerCase();
  const base = ["ما هي المعطيات الصريحة في النص؟", "ما المطلوب بالضبط؟"];

  if (d === "geometry") {
    base.push("ما الشكل المطروح؟");
    if (/مثلث|triangle/.test(t)) base.push("هل المثلث قائم/متساوي الساقين/متساوي الأضلاع؟");
    if (/دائرة|circle|cercle/.test(t)) base.push("ما مركز الدائرة ونصف قطرها؟");
    if (/منصّ?ف|médiatrice|bissectrice/.test(t)) base.push("هل المنصّف عمودي أم منصّف زاوية؟");
    if (/متوازي|parallèle/.test(t)) base.push("ما المستقيمان المتوازيان؟");
    if (/متعامد|perpendicul/.test(t)) base.push("ما المستقيمان المتعامدان؟");
  } else if (d === "algebra") {
    base.push("ما المتغيّرات والثوابت؟");
    base.push("ما نوع المسألة؟ (تبسيط، تحليل، حل معادلة، …)");
    if (/معادلة|équation/.test(t)) base.push("ما درجة المعادلة؟");
    if (/متراجحة|inéquation/.test(t)) base.push("ما اتجاه المتراجحة؟");
  } else if (d === "functions") {
    base.push("ما تعبير الدالة؟ وما مجال تعريفها؟");
    base.push("هل المطلوب دراسة التغيّرات أم رسم المنحنى أم حساب صورة؟");
  } else if (d === "statistics") {
    base.push("ما المتغيّر الإحصائي وما حجم العيّنة؟");
    base.push("هل المعطيات في جدول تكراري؟");
  } else if (d === "probability") {
    base.push("ما الفضاء العيّني؟");
    base.push("ما الحدث المطلوب احتماله؟");
  } else if (d === "arithmetic") {
    base.push("ما الأعداد المتدخّلة وما العملية المطلوبة؟");
  } else {
    base.push("ما الفكرة الرياضية الأساسية في هذا التمرين؟");
  }
  return base;
}

/** Domain-aware tag suggestions to help organize KB. */
export function suggestTags(domain: ExerciseDomain): string[] {
  switch (domain) {
    case "geometry":
      return ["فيثاغورس", "طاليس", "تشابه", "تطابق", "محور تناظر", "زاوية قائمة", "متوازي أضلاع", "دائرة محيطة"];
    case "algebra":
      return ["تبسيط", "تحليل", "نشر", "معادلة من الدرجة الأولى", "معادلة من الدرجة الثانية", "متراجحة", "هويات شهيرة"];
    case "functions":
      return ["دالة خطية", "دالة تآلفية", "تغيّرات", "صورة", "سابقة", "منحنى"];
    case "statistics":
      return ["متوسط حسابي", "وسيط", "تكرارات", "مدى", "تباين"];
    case "probability":
      return ["حدث", "فضاء عيّني", "احتمال متساوي", "أحداث متنافية"];
    case "arithmetic":
      return ["قسمة إقليدية", "PGCD", "PPCM", "نسبة", "تناسب"];
    default:
      return ["مفهوم أساسي", "تطبيق مباشر", "برهان", "حساب"];
  }
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
