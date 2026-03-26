// ===== Geometry Engine =====
// Deterministic solver for geometry problems (right triangles)

import {
  GeometryProblem,
  GeometrySolveResult,
  GeometryStep,
  Triangle,
  Point2D,
  DiagramSpec,
} from "./types";

// ---- Helpers ----

function sideKey(a: string, b: string): string {
  return [a, b].sort().join("");
}

function getSide(tri: Triangle, a: string, b: string): number | undefined {
  return tri.sides[sideKey(a, b)] ?? tri.sides[a + b] ?? tri.sides[b + a];
}

// ---- Rules ----

function solveRightTriangleSide(
  tri: Triangle,
  computed: Record<string, number>
): GeometryStep | null {
  if (!tri.rightAngleAt) return null;
  const [A, B, C] = tri.vertices;
  const right = tri.rightAngleAt;

  // Identify legs and hypotenuse
  const otherVertices = [A, B, C].filter((v) => v !== right);
  const leg1Key = sideKey(right, otherVertices[0]);
  const leg2Key = sideKey(right, otherVertices[1]);
  const hypKey = sideKey(otherVertices[0], otherVertices[1]);

  const leg1 = computed[leg1Key] ?? getSide(tri, right, otherVertices[0]);
  const leg2 = computed[leg2Key] ?? getSide(tri, right, otherVertices[1]);
  const hyp = computed[hypKey] ?? getSide(tri, otherVertices[0], otherVertices[1]);

  if (leg1 != null) computed[leg1Key] = leg1;
  if (leg2 != null) computed[leg2Key] = leg2;
  if (hyp != null) computed[hypKey] = hyp;

  // Find missing side
  if (leg1 != null && leg2 != null && hyp == null) {
    const result = Math.sqrt(leg1 * leg1 + leg2 * leg2);
    computed[hypKey] = result;
    return {
      index: 0,
      ruleId: "pythagorean_theorem",
      ruleName: "نظرية فيثاغورس",
      description: `في المثلث ${A}${B}${C} القائم في ${right}، نطبق نظرية فيثاغورس`,
      formula: `${hypKey}^2 = ${leg1Key}^2 + ${leg2Key}^2`,
      substitution: `${hypKey}^2 = ${leg1}^2 + ${leg2}^2 = ${leg1 * leg1} + ${leg2 * leg2} = ${leg1 * leg1 + leg2 * leg2}`,
      result: `${hypKey} = \\sqrt{${leg1 * leg1 + leg2 * leg2}} = ${result}`,
      numericResult: result,
    };
  }

  if (leg1 != null && hyp != null && leg2 == null) {
    const result = Math.sqrt(hyp * hyp - leg1 * leg1);
    computed[leg2Key] = result;
    return {
      index: 0,
      ruleId: "pythagorean_theorem_inv",
      ruleName: "نظرية فيثاغورس (عكسي)",
      description: `نحسب الضلع المجهول باستعمال فيثاغورس`,
      formula: `${leg2Key}^2 = ${hypKey}^2 - ${leg1Key}^2`,
      substitution: `${leg2Key}^2 = ${hyp}^2 - ${leg1}^2 = ${hyp * hyp - leg1 * leg1}`,
      result: `${leg2Key} = \\sqrt{${hyp * hyp - leg1 * leg1}} = ${result}`,
      numericResult: result,
    };
  }

  if (leg2 != null && hyp != null && leg1 == null) {
    const result = Math.sqrt(hyp * hyp - leg2 * leg2);
    computed[leg1Key] = result;
    return {
      index: 0,
      ruleId: "pythagorean_theorem_inv",
      ruleName: "نظرية فيثاغورس (عكسي)",
      description: `نحسب الضلع المجهول باستعمال فيثاغورس`,
      formula: `${leg1Key}^2 = ${hypKey}^2 - ${leg2Key}^2`,
      substitution: `${leg1Key}^2 = ${hyp}^2 - ${leg2}^2 = ${hyp * hyp - leg2 * leg2}`,
      result: `${leg1Key} = \\sqrt{${hyp * hyp - leg2 * leg2}} = ${result}`,
      numericResult: result,
    };
  }

  return null;
}

function computeArea(
  tri: Triangle,
  computed: Record<string, number>
): GeometryStep | null {
  if (!tri.rightAngleAt) return null;
  const right = tri.rightAngleAt;
  const others = tri.vertices.filter((v) => v !== right);
  const leg1Key = sideKey(right, others[0]);
  const leg2Key = sideKey(right, others[1]);
  const leg1 = computed[leg1Key];
  const leg2 = computed[leg2Key];

  if (leg1 == null || leg2 == null) return null;

  const area = (leg1 * leg2) / 2;
  computed["area"] = area;

  return {
    index: 0,
    ruleId: "triangle_area",
    ruleName: "مساحة المثلث القائم",
    description: `المساحة = (القاعدة × الارتفاع) / 2`,
    formula: `S = \\frac{${leg1Key} \\times ${leg2Key}}{2}`,
    substitution: `S = \\frac{${leg1} \\times ${leg2}}{2} = \\frac{${leg1 * leg2}}{2}`,
    result: `S = ${area} \\text{ cm}^2`,
    numericResult: area,
  };
}

function computePerimeter(
  tri: Triangle,
  computed: Record<string, number>
): GeometryStep | null {
  const [A, B, C] = tri.vertices;
  const ab = computed[sideKey(A, B)];
  const ac = computed[sideKey(A, C)];
  const bc = computed[sideKey(B, C)];

  if (ab == null || ac == null || bc == null) return null;

  const perimeter = ab + ac + bc;
  computed["perimeter"] = perimeter;

  return {
    index: 0,
    ruleId: "triangle_perimeter",
    ruleName: "محيط المثلث",
    description: `المحيط = مجموع الأضلاع`,
    formula: `P = ${sideKey(A, B)} + ${sideKey(A, C)} + ${sideKey(B, C)}`,
    substitution: `P = ${ab} + ${ac} + ${bc}`,
    result: `P = ${perimeter} \\text{ cm}`,
    numericResult: perimeter,
  };
}

function computeCircumscribedCircle(
  tri: Triangle,
  computed: Record<string, number>
): GeometryStep | null {
  if (!tri.rightAngleAt) return null;
  const others = tri.vertices.filter((v) => v !== tri.rightAngleAt);
  const hypKey = sideKey(others[0], others[1]);
  const hyp = computed[hypKey];
  if (hyp == null) return null;

  const radius = hyp / 2;
  computed["circumRadius"] = radius;

  return {
    index: 0,
    ruleId: "circumscribed_circle_right",
    ruleName: "الدائرة المحيطة بمثلث قائم",
    description: `في المثلث القائم، مركز الدائرة المحيطة هو منتصف الوتر ونصف قطرها يساوي نصف الوتر`,
    formula: `R = \\frac{${hypKey}}{2}`,
    substitution: `R = \\frac{${hyp}}{2}`,
    result: `R = ${radius} \\text{ cm}`,
    numericResult: radius,
  };
}

function checkPointOnCircle(
  tri: Triangle,
  computed: Record<string, number>
): GeometryStep | null {
  if (!tri.rightAngleAt) return null;
  const radius = computed["circumRadius"];
  if (radius == null) return null;

  const right = tri.rightAngleAt;
  const others = tri.vertices.filter((v) => v !== right);
  const hypKey = sideKey(others[0], others[1]);
  const hyp = computed[hypKey];

  return {
    index: 0,
    ruleId: "point_on_circumscribed",
    ruleName: "النقطة على الدائرة المحيطة",
    description: `${right} رأس الزاوية القائمة، وبما أن الدائرة المحيطة قطرها هو الوتر ${hypKey}، فإن ${right} تنتمي إلى الدائرة`,
    formula: `${right} \\in \\mathcal{C} \\iff ${right}\\text{ رأس الزاوية القائمة}`,
    substitution: `\\text{الزاوية } \\widehat{${right}} = 90°`,
    result: `\\text{نعم، } ${right} \\text{ تنتمي إلى الدائرة المحيطة (زاوية محيطية تحصر نصف دائرة)}`,
  };
}

// ---- Diagram Builder ----

function buildDiagram(
  tri: Triangle,
  computed: Record<string, number>
): DiagramSpec {
  const [A, B, C] = tri.vertices;
  const right = tri.rightAngleAt || A;

  // Place right angle vertex at origin
  const leg1Key = sideKey(right, tri.vertices.find((v) => v !== right)!);
  const leg2Key = sideKey(
    right,
    tri.vertices.filter((v) => v !== right)[1]
  );
  const leg1 = computed[leg1Key] || 0;
  const leg2 = computed[leg2Key] || 0;

  const others = tri.vertices.filter((v) => v !== right);

  const points: Point2D[] = [
    { label: right, x: 50, y: 250 },
    { label: others[0], x: 50 + leg1 * 25, y: 250 },
    { label: others[1], x: 50, y: 250 - leg2 * 25 },
  ];

  const segments = [
    { from: right, to: others[0], label: `${leg1}` },
    { from: right, to: others[1], label: `${leg2}` },
    {
      from: others[0],
      to: others[1],
      label: `${computed[sideKey(others[0], others[1])]?.toFixed(1) || "?"}`,
    },
  ];

  const circles: DiagramSpec["circles"] = [];
  if (computed["circumRadius"]) {
    const midX = (points[1].x + points[2].x) / 2;
    const midY = (points[1].y + points[2].y) / 2;
    circles.push({
      center: { label: "O", x: midX, y: midY },
      radius: computed["circumRadius"] * 25,
    });
  }

  const labels: DiagramSpec["labels"] = [
    { point: right, text: right, position: "below" as const },
    { point: others[0], text: others[0], position: "right" as const },
    { point: others[1], text: others[1], position: "above" as const },
  ];

  return { points, segments, circles, labels };
}

// ---- Main Solver ----

export function solveGeometry(problem: GeometryProblem): GeometrySolveResult {
  const computed: Record<string, number> = {};
  const steps: GeometryStep[] = [];
  const tri = problem.triangle;

  // Copy known sides
  for (const [key, val] of Object.entries(tri.sides)) {
    computed[key] = val;
  }

  // Run solvers in order
  const solvers = [
    solveRightTriangleSide,
    computeArea,
    computePerimeter,
    computeCircumscribedCircle,
    checkPointOnCircle,
  ];

  for (const solver of solvers) {
    const step = solver(tri, computed);
    if (step) {
      step.index = steps.length;
      steps.push(step);
    }
  }

  const diagram = buildDiagram(tri, computed);

  return { problem, steps, computedValues: computed, diagram };
}

// ── Circle Solver ──────────────────────────────────────────────────────────
export interface CircleInput { radius?: number; diameter?: number; circumference?: number; area?: number; }
export interface CircleResult { radius: number; diameter: number; circumference: number; area: number; steps: GeometryStep[]; }

function geoStep(i: number, name: string, desc: string, formula: string, sub: string, res: string, num?: number): GeometryStep {
  return { index: i, ruleId: name, ruleName: name, description: desc, formula, substitution: sub, result: res, numericResult: num };
}

export function solveCircle(input: CircleInput): CircleResult {
  let r: number;
  const steps: GeometryStep[] = [];
  let idx = 0;
  if (input.radius != null) { r = input.radius; }
  else if (input.diameter != null) { r = input.diameter / 2; steps.push(geoStep(idx++, "r=d/2", "نصف القطر = القطر / 2", "r = d/2", `r = ${input.diameter}/2`, `${r}`, r)); }
  else if (input.circumference != null) { r = input.circumference / (2 * Math.PI); steps.push(geoStep(idx++, "r=C/2π", "نصف القطر من المحيط", "r = C/(2π)", `r = ${input.circumference}/(2π)`, `${r.toFixed(4)}`, r)); }
  else if (input.area != null) { r = Math.sqrt(input.area / Math.PI); steps.push(geoStep(idx++, "r=√(A/π)", "نصف القطر من المساحة", "r = √(A/π)", `r = √(${input.area}/π)`, `${r.toFixed(4)}`, r)); }
  else { r = 1; }
  const d = 2 * r, C = 2 * Math.PI * r, A = Math.PI * r * r;
  steps.push(geoStep(idx++, "d=2r", "القطر", "d = 2r", `d = 2×${r}`, `${d}`, d));
  steps.push(geoStep(idx++, "C=2πr", "المحيط", "C = 2πr", `C = 2π×${r}`, `${C.toFixed(4)}`, C));
  steps.push(geoStep(idx++, "A=πr²", "المساحة", "A = πr²", `A = π×${r}²`, `${A.toFixed(4)}`, A));
  return { radius: r, diameter: d, circumference: C, area: A, steps };
}

// ── Rectangle Solver ───────────────────────────────────────────────────────
export interface RectInput { width?: number; height?: number; area?: number; perimeter?: number; }
export interface RectResult { width: number; height: number; area: number; perimeter: number; diagonal: number; steps: GeometryStep[]; }

export function solveRectangle(input: RectInput): RectResult {
  let w = input.width ?? 0, h = input.height ?? 0;
  const steps: GeometryStep[] = [];
  let idx = 0;
  if (w && h) { /* both given */ }
  else if (input.area && w) { h = input.area / w; steps.push(geoStep(idx++, "h=A/w", "الطول من المساحة", "h = A/w", `h = ${input.area}/${w}`, `${h}`, h)); }
  else if (input.area && h) { w = input.area / h; steps.push(geoStep(idx++, "w=A/h", "العرض من المساحة", "w = A/h", `w = ${input.area}/${h}`, `${w}`, w)); }
  const A = w * h, P = 2 * (w + h), diag = Math.sqrt(w * w + h * h);
  steps.push(geoStep(idx++, "A=w×h", "المساحة", "A = w×h", `A = ${w}×${h}`, `${A}`, A));
  steps.push(geoStep(idx++, "P=2(w+h)", "المحيط", "P = 2(w+h)", `P = 2(${w}+${h})`, `${P}`, P));
  steps.push(geoStep(idx++, "d=√(w²+h²)", "القطر", "d = √(w²+h²)", `d = √(${w}²+${h}²)`, `${diag.toFixed(4)}`, diag));
  return { width: w, height: h, area: A, perimeter: P, diagonal: diag, steps };
}
