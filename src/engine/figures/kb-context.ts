// ===== KB-driven Geometry Context Analyzer =====
// Replaces the Gemini edge function with a deterministic pipeline that
// pulls from our own Knowledge Base (kb_figures, kb_skills, kb_patterns)
// and combines it with the existing regex detectors.
//
// Strategy:
//   1. If the exercise is in kb_exercises and has a hand-authored figure
//      in kb_figures → use that spec directly (highest confidence).
//   2. Otherwise, run the regex detectors (buildAutoFigureSpec /
//      inferConstraints) and enrich them with KB patterns / skills that
//      match concepts found in the text.
//   3. Build a short Arabic caption from the recognized concepts.

import { supabase } from "@/integrations/supabase/client";
import {
  buildAutoFigureSpec,
  detectFigureKind,
  defaultFigureSpec,
  relabelSpec,
} from "./factory";
import type { FigureSpec } from "./types";
import { inferConstraints, type Constraint } from "./construction-checks";

export interface KBGeometryContext {
  spec: FigureSpec | null;
  constraints: Constraint[];
  caption: string;
  confidence: number; // 0..1
  source: "kb_learned" | "kb_figure" | "kb_enriched" | "regex" | "empty";
  matchedSkills: string[]; // skill names
  matchedPatterns: string[]; // pattern names
  learnedHash?: string; // exposed so caller can later record success
  learnedSuccessCount?: number;
}

/**
 * Stable hash of the exercise text used as the learned-figures key.
 * Normalizes whitespace + Arabic diacritics so trivial variations collide.
 */
export function hashGeometryText(text: string): string {
  const normalized = (text || "")
    .replace(/[\u064B-\u0652\u0670]/g, "") // strip tashkeel
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  // djb2 hash → hex
  let h = 5381;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h + normalized.charCodeAt(i)) | 0;
  }
  return "g_" + (h >>> 0).toString(16) + "_" + normalized.length.toString(36);
}


// Lightweight concept dictionary used to score skill/pattern relevance.
// Keep it in sync with KIND_KEYWORDS in factory.ts.
const CONCEPT_KEYWORDS: Array<{ concept: string; re: RegExp }> = [
  { concept: "محور تناظر", re: /محور\s*تناظر|axe\s*de\s*sym/i },
  { concept: "منصف عمودي", re: /منصّ?ف\s*عمودي|médiatrice/i },
  { concept: "منصف زاوية", re: /منصّ?ف(?!\s*عمودي)|bissectrice/i },
  { concept: "ارتفاع", re: /ارتفاع|hauteur/i },
  { concept: "متوسط", re: /متوسّ?ط|médiane/i },
  { concept: "مماس", re: /مماس|tangent/i },
  { concept: "وتر", re: /\bوتر\b|corde/i },
  { concept: "قطر", re: /قطر|diamètre/i },
  { concept: "نصف قطر", re: /نصف\s*قطر|rayon/i },
  { concept: "متعامد", re: /متعامد|perpendicul/i },
  { concept: "متوازي", re: /متواز(ي|ٍ)|parallèle/i },
  { concept: "تطابق", re: /تطابق|متطابق|congruent/i },
  { concept: "تشابه", re: /تشابه|similaire/i },
  { concept: "زاوية قائمة", re: /زاوية\s*قائمة|angle\s*droit/i },
  { concept: "فيثاغورس", re: /فيثاغورس|pythagore/i },
  { concept: "طاليس", re: /طاليس|thalès|thales/i },
];

function extractConcepts(text: string): string[] {
  const found: string[] = [];
  for (const { concept, re } of CONCEPT_KEYWORDS) {
    if (re.test(text)) found.push(concept);
  }
  return found;
}

function extractLabels(text: string): string[] {
  // Capture single uppercase Latin letters used as point labels (A, B, C...).
  const matches = text.match(/\b[A-Z]\b/g) || [];
  return Array.from(new Set(matches)).slice(0, 12);
}

function buildCaption(opts: {
  kind: string | null;
  concepts: string[];
  labels: string[];
}): string {
  const parts: string[] = [];
  if (opts.kind) parts.push(`شكل: ${opts.kind}`);
  if (opts.labels.length) parts.push(`نقاط: ${opts.labels.join("، ")}`);
  if (opts.concepts.length) parts.push(`مفاهيم: ${opts.concepts.join("، ")}`);
  return parts.join(" • ");
}

/**
 * Analyze an exercise text using only the local KB (no AI calls).
 */
export async function analyzeGeometryFromKB(
  text: string,
  opts: { exerciseId?: string | null; countryCode?: string } = {},
): Promise<KBGeometryContext> {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      spec: null,
      constraints: [],
      caption: "",
      confidence: 0,
      source: "empty",
      matchedSkills: [],
      matchedPatterns: [],
    };
  }

  // 1. Hand-authored figure for this exercise → trust it fully.
  if (opts.exerciseId) {
    try {
      const { data: fig } = await (supabase as any)
        .from("kb_figures")
        .select("spec,figure_type,description")
        .eq("exercise_id", opts.exerciseId)
        .maybeSingle();
      if (fig?.spec && typeof fig.spec === "object") {
        const constraints = inferConstraints(trimmed);
        const concepts = extractConcepts(trimmed);
        return {
          spec: fig.spec as FigureSpec,
          constraints,
          caption:
            fig.description ||
            buildCaption({
              kind: fig.figure_type || null,
              concepts,
              labels: extractLabels(trimmed),
            }),
          confidence: 0.98,
          source: "kb_figure",
          matchedSkills: [],
          matchedPatterns: [],
        };
      }
    } catch {
      /* fall through */
    }
  }

  // 2. Regex detectors (always available, deterministic).
  const kind = detectFigureKind({ text: trimmed });
  const labels = extractLabels(trimmed);
  let spec = buildAutoFigureSpec({ text: trimmed });
  if (spec && labels.length >= 2) {
    spec = relabelSpec(spec, labels);
  } else if (!spec && kind) {
    spec = defaultFigureSpec(kind);
  }
  const constraints = inferConstraints(trimmed);
  const concepts = extractConcepts(trimmed);

  // 3. Enrich with KB skills & patterns matching the detected concepts.
  let matchedSkills: string[] = [];
  let matchedPatterns: string[] = [];
  let enriched = false;

  if (concepts.length || kind) {
    try {
      // Match skills whose name_ar / description contains any concept
      const orFilters = [
        ...concepts.map((c) => `name_ar.ilike.%${c}%`),
        ...concepts.map((c) => `description.ilike.%${c}%`),
        ...(kind ? [`name_ar.ilike.%${kind}%`] : []),
      ];
      if (orFilters.length) {
        const { data: skills } = await (supabase as any)
          .from("kb_skills")
          .select("name_ar,name")
          .or(orFilters.join(","))
          .limit(6);
        matchedSkills = (skills || [])
          .map((s: any) => s.name_ar || s.name)
          .filter(Boolean);
      }

      if (concepts.length) {
        const patternFilters = concepts.map((c) => `name.ilike.%${c}%`);
        const { data: patterns } = await (supabase as any)
          .from("kb_patterns")
          .select("name")
          .or(patternFilters.join(","))
          .limit(4);
        matchedPatterns = (patterns || []).map((p: any) => p.name).filter(Boolean);
      }

      enriched = matchedSkills.length > 0 || matchedPatterns.length > 0;
    } catch {
      /* enrichment is optional */
    }
  }

  // Confidence heuristic
  let confidence = 0.35;
  if (spec) confidence += 0.25;
  if (constraints.length) confidence += 0.1 + Math.min(constraints.length, 4) * 0.04;
  if (concepts.length) confidence += Math.min(concepts.length, 3) * 0.05;
  if (enriched) confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  const captionExtras: string[] = [];
  if (matchedSkills.length) captionExtras.push(`مهارات KB: ${matchedSkills.slice(0, 3).join("، ")}`);
  if (matchedPatterns.length) captionExtras.push(`أنماط: ${matchedPatterns.slice(0, 2).join("، ")}`);
  const caption = [
    buildCaption({ kind: kind || null, concepts, labels }),
    ...captionExtras,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    spec,
    constraints,
    caption,
    confidence,
    source: enriched ? "kb_enriched" : spec ? "regex" : "empty",
    matchedSkills,
    matchedPatterns,
  };
}
