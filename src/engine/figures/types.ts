// ===== Unified Figure Spec =====
// One JSON contract that can describe any geometric figure used in the curriculum
// (1AM solids → 3AS conics & function plots). Renderers consume this spec.

export type FigureKind =
  // 3D solids
  | "parallelepiped"     // متوازي مستطيلات (أو مكعّب إذا كل الأبعاد متساوية)
  | "cube"
  | "prism"              // موشور (قاعدة مثلثية افتراضياً)
  | "pyramid"            // هرم
  | "cone"               // مخروط
  | "cylinder"           // أسطوانة
  | "sphere"             // كرة
  // 2D plane geometry
  | "triangle"
  | "right_triangle"
  | "quadrilateral"      // عام
  | "rectangle"
  | "square"
  | "parallelogram"
  | "rhombus"
  | "trapezoid"
  | "circle"
  | "polygon"            // n-gon عام
  // Coordinate / functions
  | "axes"
  | "function_plot"
  | "point_set";

export interface FigureSpec {
  kind: FigureKind;
  /** Optional human-readable label like "ABCDEFGH" or "ABC" */
  label?: string;
  /** Named vertices (for solids/polygons). Keys are labels (A,B,C,...) */
  vertices?: Record<string, [number, number, number?]>;
  /** Edges referenced by vertex labels */
  edges?: Array<[string, string]>;
  /** Faces (lists of vertex labels in order) */
  faces?: Array<string[]>;
  /** Numeric dimensions, e.g. { length: 6, width: 4, height: 3, radius: 2 } */
  dims?: Record<string, number>;
  /** Centre point for circle/sphere/cone (in 2D or 3D) */
  center?: [number, number, number?];
  /** For function_plot: y = f(x) expression evaluated as JS, or a sampled curve */
  expression?: string;
  samples?: Array<[number, number]>;
  /** Coordinate range for axes / plots */
  range?: { xMin: number; xMax: number; yMin?: number; yMax?: number };
  /** Free-form annotations attached to the figure */
  annotations?: Array<{
    target: string;                // vertex/edge/face/point label
    text: string;
    kind?: "length" | "angle" | "label" | "note";
  }>;
}

/** What the current step wants to highlight on the figure. */
export interface FigureHighlights {
  vertices?: string[];   // ["A", "G"]
  edges?: string[];      // ["AB", "GH"]
  faces?: string[];      // ["ABCD"]
  angles?: string[];     // ["ABC"] (vertex letter in middle)
  /** Optional descriptive caption shown under the figure */
  caption?: string;
}
