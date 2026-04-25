// ===== Default Figure Spec Factory =====
// Generates a sensible default FigureSpec from an exercise's type / pattern / text
// when no manual figure has been authored in kb_figures.

import type { FigureSpec, FigureKind } from "./types";

interface ExerciseLike {
  type?: string | null;
  chapter?: string | null;
  text?: string | null;
}

const KIND_KEYWORDS: Array<{ kind: FigureKind; patterns: RegExp }> = [
  { kind: "parallelepiped", patterns: /متوازي\s*المستطيل|parallelepip|parallélépip|cuboid|rectangular box/i },
  { kind: "cube",           patterns: /\bمكعّ?ب\b|\bcube\b/i },
  { kind: "prism",          patterns: /موشور|prism|prisme/i },
  { kind: "pyramid",        patterns: /هرم|pyramid|pyramide/i },
  { kind: "cone",           patterns: /مخروط|\bcone\b|\bcône\b/i },
  { kind: "cylinder",       patterns: /أسطوان|cylinder|cylindre/i },
  { kind: "sphere",         patterns: /\bكرة\b|sphere|sphère/i },
  { kind: "right_triangle", patterns: /مثلث\s*قائم|right\s*triangle|triangle\s*rectangle/i },
  { kind: "triangle",       patterns: /مثلث|triangle/i },
  { kind: "rectangle",      patterns: /مستطيل|rectangle/i },
  { kind: "square",         patterns: /\bمربّ?ع\b|\bsquare\b|\bcarré\b/i },
  { kind: "rhombus",        patterns: /معيّن|rhombus|losange/i },
  { kind: "parallelogram",  patterns: /متوازي\s*أضلاع|parallelogram|parallélogramme/i },
  { kind: "trapezoid",      patterns: /شبه\s*منحرف|trapezoid|trapèze/i },
  { kind: "circle",         patterns: /دائرة|circle|cercle/i },
  { kind: "function_plot",  patterns: /دالة|منحنى|function|courbe/i },
];

export function detectFigureKind(ex: ExerciseLike): FigureKind | null {
  const blob = `${ex.type || ""} ${ex.chapter || ""} ${ex.text || ""}`;
  for (const { kind, patterns } of KIND_KEYWORDS) {
    if (patterns.test(blob)) return kind;
  }
  // The KB sometimes mis-labels solids as "parallelogram" (the seeded data does)
  if ((ex.type || "").toLowerCase() === "parallelogram" && /مجسّ?م|أوجه|أحرف|رؤوس/.test(ex.text || "")) {
    return "parallelepiped";
  }
  return null;
}

export function defaultFigureSpec(kind: FigureKind): FigureSpec {
  switch (kind) {
    case "parallelepiped":
      return {
        kind,
        label: "ABCDEFGH",
        vertices: {
          A: [0, 0, 0], B: [4, 0, 0], C: [4, 0, 3], D: [0, 0, 3],
          E: [0, 2, 0], F: [4, 2, 0], G: [4, 2, 3], H: [0, 2, 3],
        },
        edges: [
          ["A","B"],["B","C"],["C","D"],["D","A"],
          ["E","F"],["F","G"],["G","H"],["H","E"],
          ["A","E"],["B","F"],["C","G"],["D","H"],
        ],
        faces: [
          ["A","B","C","D"], ["E","F","G","H"],
          ["A","B","F","E"], ["B","C","G","F"],
          ["C","D","H","G"], ["D","A","E","H"],
        ],
        dims: { length: 4, width: 2, height: 3 },
      };

    case "cube":
      return {
        ...defaultFigureSpec("parallelepiped"),
        kind: "cube",
        dims: { length: 3, width: 3, height: 3 },
        vertices: {
          A: [0,0,0], B: [3,0,0], C: [3,0,3], D: [0,0,3],
          E: [0,3,0], F: [3,3,0], G: [3,3,3], H: [0,3,3],
        },
      };

    case "prism":
      return {
        kind,
        label: "ABCDEF",
        vertices: {
          A: [0,0,0], B: [4,0,0], C: [2,0,3],
          D: [0,2,0], E: [4,2,0], F: [2,2,3],
        },
        edges: [
          ["A","B"],["B","C"],["C","A"],
          ["D","E"],["E","F"],["F","D"],
          ["A","D"],["B","E"],["C","F"],
        ],
        faces: [["A","B","C"],["D","E","F"],["A","B","E","D"],["B","C","F","E"],["C","A","D","F"]],
      };

    case "pyramid":
      return {
        kind,
        label: "SABCD",
        vertices: {
          A: [0,0,0], B: [4,0,0], C: [4,0,4], D: [0,0,4],
          S: [2,4,2],
        },
        edges: [
          ["A","B"],["B","C"],["C","D"],["D","A"],
          ["S","A"],["S","B"],["S","C"],["S","D"],
        ],
        faces: [["A","B","C","D"],["S","A","B"],["S","B","C"],["S","C","D"],["S","D","A"]],
      };

    case "cone":
      return { kind, dims: { radius: 2, height: 4 }, center: [0,0,0] };

    case "cylinder":
      return { kind, dims: { radius: 2, height: 4 }, center: [0,0,0] };

    case "sphere":
      return { kind, dims: { radius: 2 }, center: [0,0,0] };

    case "right_triangle":
      return {
        kind,
        label: "ABC",
        vertices: { A: [0,0], B: [4,0], C: [0,3] },
        edges: [["A","B"],["B","C"],["C","A"]],
      };

    case "triangle":
      return {
        kind,
        label: "ABC",
        vertices: { A: [0,0], B: [4,0], C: [1.5,3] },
        edges: [["A","B"],["B","C"],["C","A"]],
      };

    case "rectangle":
      return {
        kind,
        label: "ABCD",
        vertices: { A: [0,0], B: [4,0], C: [4,2], D: [0,2] },
        edges: [["A","B"],["B","C"],["C","D"],["D","A"]],
      };

    case "square":
      return {
        kind,
        label: "ABCD",
        vertices: { A: [0,0], B: [3,0], C: [3,3], D: [0,3] },
        edges: [["A","B"],["B","C"],["C","D"],["D","A"]],
      };

    case "rhombus":
      return {
        kind,
        label: "ABCD",
        vertices: { A: [2,0], B: [4,2], C: [2,4], D: [0,2] },
        edges: [["A","B"],["B","C"],["C","D"],["D","A"]],
      };

    case "parallelogram":
      return {
        kind,
        label: "ABCD",
        vertices: { A: [0,0], B: [4,0], C: [5,2], D: [1,2] },
        edges: [["A","B"],["B","C"],["C","D"],["D","A"]],
      };

    case "trapezoid":
      return {
        kind,
        label: "ABCD",
        vertices: { A: [0,0], B: [5,0], C: [4,2], D: [1,2] },
        edges: [["A","B"],["B","C"],["C","D"],["D","A"]],
      };

    case "circle":
      return { kind, center: [0,0], dims: { radius: 2 } };

    case "function_plot":
      return {
        kind,
        expression: "x*x",
        range: { xMin: -4, xMax: 4, yMin: -2, yMax: 8 },
      };

    case "axes":
      return { kind, range: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 } };

    default:
      return { kind: "axes" };
  }
}
