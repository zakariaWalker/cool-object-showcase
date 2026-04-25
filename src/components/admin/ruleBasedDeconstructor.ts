// ===== Rule-Based Deconstructor =====
// Instant, deterministic, AI-free exercise deconstruction.
// Matches an exercise's `type` against the pattern catalog (kb_patterns)
// and reuses the pattern's pre-defined steps + concepts.
//
// Speed: ~1ms per exercise (in-memory, no network).
// Coverage: any exercise whose `type` has at least one matching pattern.

import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";

// Synonym map — collapse near-duplicate types so e.g. "geometry_construction"
// can match an exercise tagged "geometry".
const TYPE_ALIASES: Record<string, string[]> = {
  // exercise type → list of pattern types to consider (in priority order)
  expand: ["algebra", "advanced_algebra", "equations"],
  factor: ["algebra", "advanced_algebra"],
  simplify: ["algebra", "fractions", "arithmetic"],
  compute: ["arithmetic", "fractions", "number_sets"],
  solve_equation: ["equations", "systems", "algebra"],
  solve_inequality: ["equations", "algebra", "advanced_algebra"],
  functions: ["functions", "calculus", "graphical_representation"],
  geometry: ["geometry", "geometry_construction", "triangle_circle", "angles", "transformations"],
  prove: ["geometry", "triangle_circle", "logic_and_proof", "geometry_construction"],
  statistics: ["statistics", "graphical_representation"],
  probability: ["probability"],
  trigonometry: ["trigonometry", "triangle_circle"],
  vectors: ["vectors", "analytic_geometry"],
  sequences: ["sequences"],
  // fallback for unclassified
  other: [
    "general", "arithmetic", "algebra", "geometry", "statistics",
    "functions", "equations", "fractions", "number_sets",
  ],
};

// Lightweight keyword scoring for picking the best pattern within a type bucket.
// More keyword matches between the pattern's concepts/name/steps and the
// exercise text → higher score → better template.
function scorePattern(exerciseText: string, pattern: Pattern): number {
  const text = exerciseText.toLowerCase();
  let score = 0;

  // 1) concept hits (most signal)
  for (const c of pattern.concepts || []) {
    if (c && text.includes(c.toLowerCase())) score += 3;
  }
  // 2) name tokens
  for (const tok of (pattern.name || "").toLowerCase().split(/[\s\-_،,]+/)) {
    if (tok.length >= 3 && text.includes(tok)) score += 2;
  }
  // 3) step verbs (lower weight — they're often generic)
  for (const s of pattern.steps || []) {
    const firstWord = s.toLowerCase().split(/\s+/)[0];
    if (firstWord && firstWord.length >= 3 && text.includes(firstWord)) score += 1;
  }
  // 4) tie-breaker: prefer patterns that already have rich steps (3+)
  score += Math.min((pattern.steps || []).length, 6) * 0.1;

  return score;
}

// Pick the best matching pattern for an exercise. Returns null if no candidate.
export function pickBestPattern(
  exercise: Exercise,
  patterns: Pattern[]
): Pattern | null {
  if (!patterns.length) return null;

  const exType = (exercise.type || "other").toLowerCase();
  const candidateTypes = TYPE_ALIASES[exType] || [exType];

  // Build candidate pool: patterns whose type is in the alias list
  // (preserve alias order so primary type wins ties).
  const pool: { pat: Pattern; typeRank: number }[] = [];
  candidateTypes.forEach((t, rank) => {
    patterns
      .filter(p => (p.type || "").toLowerCase() === t)
      .forEach(p => pool.push({ pat: p, typeRank: rank }));
  });

  // Fallback: if no type-based candidate, allow any pattern (last-resort).
  if (pool.length === 0) {
    patterns.forEach(p => pool.push({ pat: p, typeRank: 99 }));
  }

  // Score and rank
  const ranked = pool
    .map(({ pat, typeRank }) => ({
      pat,
      score: scorePattern(exercise.text || "", pat) - typeRank * 0.5,
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.pat || null;
}

export interface RuleBasedResult {
  exerciseId: string;
  deconstruction: Deconstruction | null;
  reason?: string; // why no deconstruction was created
}

// Build a deterministic Deconstruction object from an exercise + chosen pattern.
export function buildDeconstruction(
  exercise: Exercise,
  pattern: Pattern
): Deconstruction {
  return {
    id: crypto.randomUUID(),
    exerciseId: exercise.id,
    patternId: pattern.id,
    steps: [...(pattern.steps || [])],
    needs: [...(pattern.concepts || [])],
    notes: `تفكيك تلقائي مبني على نمط "${pattern.name}" (بدون ذكاء اصطناعي)`,
    countryCode: exercise.countryCode || "DZ",
    createdAt: new Date().toISOString(),
  };
}

// Bulk deconstruct a list of exercises. Skips exercises that already have one
// when `existingExerciseIds` is provided.
export function ruleBasedDeconstruct(
  exercises: Exercise[],
  patterns: Pattern[],
  existingExerciseIds?: Set<string>
): RuleBasedResult[] {
  return exercises.map(ex => {
    if (existingExerciseIds?.has(ex.id)) {
      return { exerciseId: ex.id, deconstruction: null, reason: "already_deconstructed" };
    }
    const pat = pickBestPattern(ex, patterns);
    if (!pat) {
      return { exerciseId: ex.id, deconstruction: null, reason: "no_pattern_match" };
    }
    return { exerciseId: ex.id, deconstruction: buildDeconstruction(ex, pat) };
  });
}
