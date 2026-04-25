// ===== Step Focus Analyzer =====
// Reads a step's natural-language description and the FigureSpec, then decides
// which vertices/edges/faces/angles must be highlighted. Smart auto mode.

import type { FigureSpec, FigureHighlights } from "./types";

const VERTEX_TOKEN = /\b[A-HKLMNOPRSTUVWXYZ]\b/g;  // single uppercase Latin letters used as labels

/** Returns all 2-letter pairs in text that are valid edges in the spec. */
function findEdges(text: string, spec: FigureSpec): string[] {
  if (!spec.edges) return [];
  // Look for [AB], "AB", segment AB, etc. — any sequence of 2 uppercase letters
  const pairs = new Set<string>();
  const re = /\b([A-Z])\s*([A-Z])\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const a = m[1], b = m[2];
    if (a === b) continue;
    const exists = spec.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (exists) pairs.add([a, b].sort().join(""));
  }
  return Array.from(pairs);
}

/** Returns all 3- or 4-letter tokens in text that match a known face. */
function findFaces(text: string, spec: FigureSpec): string[] {
  if (!spec.faces) return [];
  const out = new Set<string>();
  const re = /\b([A-Z]{3,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const token = m[1];
    const sortedTok = token.split("").sort().join("");
    for (const face of spec.faces) {
      const sortedFace = [...face].sort().join("");
      if (sortedFace === sortedTok) out.add(face.join(""));
    }
  }
  return Array.from(out);
}

/** Returns all 3-letter tokens that look like an angle (vertex letter in the middle). */
function findAngles(text: string): string[] {
  const out = new Set<string>();
  // Arabic "الزاوية ABC" or just "زاوية ABC"
  const re = /(?:زاوية|angle|\^)\s*\(?\s*([A-Z])\s*([A-Z])\s*([A-Z])\s*\)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(`${m[1]}${m[2]}${m[3]}`);
  return Array.from(out);
}

export function analyzeStep(stepText: string, spec: FigureSpec): FigureHighlights {
  if (!stepText) return {};

  // 1. Direct vertex mentions
  const vertices = Array.from(new Set((stepText.match(VERTEX_TOKEN) || [])
    .filter((v) => spec.vertices && v in spec.vertices)));

  // 2. Edges
  const edges = findEdges(stepText, spec);

  // 3. Faces
  const faces = findFaces(stepText, spec);

  // 4. Angles
  const angles = findAngles(stepText);

  // 5. Topic-aware boost: if the step talks about "أحرف متوازية", highlight any edge group
  //    parallel to a mentioned edge (we leave actual parallelism to the renderer-level hint).

  return {
    vertices: vertices.length ? vertices : undefined,
    edges: edges.length ? edges : undefined,
    faces: faces.length ? faces : undefined,
    angles: angles.length ? angles : undefined,
  };
}
