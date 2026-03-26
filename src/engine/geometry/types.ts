// ===== Geometry Types =====

export interface Point2D {
  label: string;
  x: number;
  y: number;
}

export interface Segment {
  from: string; // point label
  to: string;
  length?: number;
}

export interface Triangle {
  vertices: [string, string, string]; // labels
  rightAngleAt?: string; // label of the vertex with right angle
  sides: Record<string, number>; // e.g. "AB": 6
}

export interface Circle {
  center: Point2D;
  radius: number;
  label?: string;
}

export interface GeometryProblem {
  type: "triangle";
  triangle: Triangle;
  questions: GeometryQuestion[];
}

export type GeometryQuestionType =
  | "find_side"         // Pythagorean
  | "area"
  | "perimeter"
  | "circumscribed_circle"
  | "point_on_circle"
  | "find_segment";

export interface GeometryQuestion {
  type: GeometryQuestionType;
  params?: Record<string, unknown>;
}

export interface GeometryStep {
  index: number;
  ruleName: string;
  ruleId: string;
  description: string;
  formula: string;       // LaTeX formula
  substitution: string;  // LaTeX with values
  result: string;        // LaTeX result
  numericResult?: number;
}

export interface GeometrySolveResult {
  problem: GeometryProblem;
  steps: GeometryStep[];
  computedValues: Record<string, number>;
  diagram: DiagramSpec;
}

export interface DiagramSpec {
  points: Point2D[];
  segments: { from: string; to: string; label?: string }[];
  circles: { center: Point2D; radius: number; label?: string }[];
  labels: { point: string; text: string; position: "above" | "below" | "left" | "right" }[];
}
