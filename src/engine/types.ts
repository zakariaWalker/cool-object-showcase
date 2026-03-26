// ===== AST Types =====

export type ASTNode =
  | NumberNode
  | VariableNode
  | BinaryOpNode
  | UnaryOpNode
  | FunctionCallNode;

export interface NumberNode { type: "number"; value: number; }
export interface VariableNode { type: "variable"; name: string; }
export interface BinaryOpNode {
  type: "binaryOp";
  op: "+" | "-" | "*" | "/" | "^";
  left: ASTNode;
  right: ASTNode;
}
export interface UnaryOpNode { type: "unaryOp"; op: "-"; operand: ASTNode; }
export interface FunctionCallNode { type: "functionCall"; name: string; args: ASTNode[]; }

// ===== Rule Engine =====

export interface Rule {
  id: string;
  name: string;
  description: string;
  domain: Domain;
  apply: (node: ASTNode) => ASTNode | null;
}

export interface RuleApplication {
  ruleId: string;
  ruleName: string;
  before: ASTNode;
  after: ASTNode;
  description: string;
}

export type Domain = "algebra" | "geometry" | "statistics" | "probability" | "functions";

export interface Step {
  index: number;
  rule: RuleApplication;
  expression: ASTNode;
}

export interface SolveResult {
  input: ASTNode;
  output: ASTNode;
  steps: Step[];
  domain: Domain;
}

// ===== Statistics Engine Types =====

export interface StatisticsStep {
  index: number;
  name: string;
  nameAr: string;
  formula: string;
  substitution: string;
  result: number | number[] | string;
  resultLabel: string;
  explanation: string;
}

export interface HistogramBin {
  min: number;
  max: number;
  count: number;
  frequency: number;
  label: string;
}

export interface StatisticsResult {
  domain: "statistics";
  data: number[];
  n: number;
  mean: number;
  median: number;
  mode: number[];
  variance: number;
  stdDev: number;
  range: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  bins: HistogramBin[];
  zScores: number[];
  steps: StatisticsStep[];
  aiExplanation?: string;
}

// ===== Probability Engine Types =====

export type ExperimentType =
  | "coin_flip"
  | "dice_roll"
  | "urn"
  | "compound_coin"
  | "compound_dice";

export interface ProbabilityEvent {
  name: string;
  nameAr: string;
  outcomes: string[];
  probability: number;
  fraction: string;
}

export interface TreeNode {
  label: string;
  probability: number;
  fractionLabel: string;
  cumulativeProbability: number;
  outcome?: string;
  children: TreeNode[];
  depth: number;
}

export interface ProbabilityStep {
  index: number;
  name: string;
  nameAr: string;
  formula: string;
  result: string;
  explanation: string;
}

export interface ProbabilityResult {
  domain: "probability";
  experimentType: ExperimentType;
  experimentDescription: string;
  sampleSpace: string[];
  totalOutcomes: number;
  events: ProbabilityEvent[];
  tree: TreeNode;
  steps: ProbabilityStep[];
  aiExplanation?: string;
}

// ===== Misconception Detector Types =====

export type MisconceptionType =
  | "sign_error"
  | "distribution_error"
  | "arithmetic_error"
  | "exponent_error"
  | "bracket_error"
  | "missing_term"
  | "correct"
  | "unknown";

export interface Misconception {
  type: MisconceptionType;
  labelAr: string;
  labelFr: string;
  description: string;
  hint: string;
  severity: "low" | "medium" | "high";
}

// ===== Progress Tracking =====

export interface ExerciseRecord {
  id: string;
  timestamp: number;
  domain: Domain;
  subdomain: string;
  input: string;
  correct: boolean;
  misconception?: MisconceptionType;
  nextReviewAt: number;
  interval: number;
  ease: number;
}

export interface ProgressState {
  records: ExerciseRecord[];
  streak: number;
  totalSolved: number;
  byDomain: Record<Domain, number>;
}

// ── Types added from engine-improved (Phase 23 merge) ──────────────────────
