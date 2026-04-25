// ===== Construction Verification =====
// Reads a step's natural-language text and returns a list of geometric
// constraints to verify against the student's construction.

export type ConstraintKind =
  | "perpendicular"   // line/segment AB ⟂ CD
  | "parallel"        // line/segment AB ∥ CD
  | "on_circle"       // point P lies on circle C
  | "midpoint"        // M is midpoint of [AB]
  | "diameter"        // [AB] is a diameter of circle C
  | "chord"           // [AB] is a chord of circle C
  | "intersection"    // P is intersection of two lines
  | "create_segment"  // segment between two named points exists
  | "create_line"     // line through two named points exists
  | "create_point"    // a point with given label exists
  | "create_circle";  // a circle exists (optionally with center/radius)

export interface Constraint {
  kind: ConstraintKind;
  /** Free-form labels referenced (e.g. ["A","B"] for segment AB). */
  labels?: string[];
  /** Optional supporting object label (circle name, etc.). */
  context?: string;
  /** Human description shown to the student. */
  description: string;
}

const NAMED_OBJECT = /\(\s*([A-Z][A-Z0-9]?)\s*\)/g;
const TWO_LETTER_PAIR = /\(?([A-Z])\s*([A-Z])\)?/g;

function extractPairs(text: string): string[][] {
  const pairs: string[][] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = /\(?\b([A-Z])\s*([A-Z])\b\)?/g;
  while ((m = re.exec(text))) {
    if (m[1] === m[2]) continue;
    const key = m[1] + m[2];
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([m[1], m[2]]);
  }
  return pairs;
}

function extractSinglePoints(text: string): string[] {
  const out = new Set<string>();
  const re = /\bالنقطة\s+([A-Z])\b|\bpoint\s+([A-Z])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1] || m[2]);
  return Array.from(out);
}

/**
 * Parse a step description and return the geometric constraints it implies.
 * Returns an empty array when nothing can be inferred.
 */
export function inferConstraints(stepText: string): Constraint[] {
  if (!stepText) return [];
  const out: Constraint[] = [];
  const text = stepText;

  // PERPENDICULAR — "العمودي على", "متعامدين", "perpendiculaire"
  if (/عمودي|متعامد|perpendicul/i.test(text)) {
    const pairs = extractPairs(text);
    if (pairs.length >= 2) {
      out.push({
        kind: "perpendicular",
        labels: [...pairs[0], ...pairs[1]],
        description: `(${pairs[0].join("")}) ⟂ (${pairs[1].join("")})`,
      });
    } else if (pairs.length === 1) {
      out.push({
        kind: "create_line",
        labels: pairs[0],
        description: `ارسم المستقيم العمودي (${pairs[0].join("")})`,
      });
    }
  }

  // PARALLEL — "موازي", "يوازي", "∥", "parallèle"
  if (/يواز[يى]|موازي|متوازي(?!\s*مستطيل|\s*أضلاع)|∥|\\\|\\\||parallèle|parallel/i.test(text)) {
    const pairs = extractPairs(text);
    if (pairs.length >= 2) {
      out.push({
        kind: "parallel",
        labels: [...pairs[0], ...pairs[1]],
        description: `(${pairs[0].join("")}) ∥ (${pairs[1].join("")})`,
      });
    }
  }

  // CHORD — "ارسم الوتر AB"
  const chordMatch = text.match(/الوتر\s*\(?\s*([A-Z])\s*([A-Z])\s*\)?/);
  if (chordMatch) {
    out.push({
      kind: "chord",
      labels: [chordMatch[1], chordMatch[2]],
      description: `الوتر [${chordMatch[1]}${chordMatch[2]}]`,
    });
  }

  // DIAMETER — "القطر AB" / "القطرين AB و CD"
  const diameterMatches = Array.from(text.matchAll(/(?:القطر(?:ين)?|قطر)\s*\(?\s*([A-Z])\s*([A-Z])\s*\)?/g));
  for (const m of diameterMatches) {
    out.push({
      kind: "diameter",
      labels: [m[1], m[2]],
      description: `القطر [${m[1]}${m[2]}]`,
    });
  }

  // SEGMENT generic — "الـقطعة AB" / "[AB]"
  const segMatches = Array.from(text.matchAll(/\[\s*([A-Z])\s*([A-Z])\s*\]/g));
  for (const m of segMatches) {
    if (out.some((c) => c.labels?.[0] === m[1] && c.labels?.[1] === m[2])) continue;
    out.push({
      kind: "create_segment",
      labels: [m[1], m[2]],
      description: `القطعة [${m[1]}${m[2]}]`,
    });
  }

  // EXPLICIT POINT — "في النقطة A"
  const pts = extractSinglePoints(text);
  for (const p of pts) {
    if (!out.some((c) => c.labels?.includes(p))) {
      out.push({
        kind: "create_point",
        labels: [p],
        description: `النقطة ${p}`,
      });
    }
  }

  return out;
}
