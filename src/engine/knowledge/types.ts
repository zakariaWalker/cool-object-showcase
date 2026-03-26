// ===== Math Knowledge Base Types =====
// Evolving knowledge system that learns from analyzed exercises

export interface KnowledgeBase {
  version: number;
  createdAt: string;
  updatedAt: string;
  stats: KBStats;
  patterns: MathPattern[];
  entities: MathEntity[];
  relations: EntityRelation[];
  schemas: DeconstructionSchema[];
  exerciseFingerprints: string[]; // hashes of already-analyzed exercises
  learningGaps: KnowledgeGap[];
}

export interface KBStats {
  totalExercisesAnalyzed: number;
  totalPatterns: number;
  totalEntities: number;
  totalSchemas: number;
  domainDistribution: Record<string, number>;
  subdomainDistribution: Record<string, number>;
  totalGaps: number;
  lastAnalyzedAt: string | null;
}

export interface ExpressionFingerprint {
  signature: string;        // existing canonical form e.g. N*(V+N)@d1
  hasParenProduct: boolean; // number/var directly before ( → expand signal
  hasLikeTerms: boolean;    // same variable appears 2+ times → collect signal
  hasEquality: boolean;     // = present → solve signal
  degree: number;           // max exponent of any variable (0,1,2,3+)
  variableCount: number;    // distinct variables (1=univariate, 2=system)
  operatorDensity: number;  // operator count / expression length, 0–1
  nestingDepth: number;     // max parenthesis nesting level
}

// ===== Patterns =====
// Recurring structural patterns found across exercises

export interface MathPattern {
  id: string;
  type: PatternType;
  signature: string;        // canonical form e.g. "N*V+N" or "N(V+N)+N(V+N)"
  description: string;
  frequency: number;         // how many times seen
  confidence: number;        // 0-1, grows with frequency
  domains: string[];
  subdomains: string[];
  examples: string[];        // up to 5 example expressions
  firstSeen: string;
  lastSeen: string;
  decomposition: string[];   // how this pattern breaks down
  solveStrategy: string[];   // ordered steps to solve
  fingerprint?: ExpressionFingerprint;
  taskOutcomes: Record<string, number>;   // e.g. { expand: 23, simplify: 4 }
  taskConfidence: Record<string, number>; // e.g. { expand: 0.85, simplify: 0.14 }
}

export type PatternType =
  | "expression_structure"   // e.g. a(b+c), a*b+c*d
  | "equation_form"          // e.g. ax+b=c, ax²+bx+c=0
  | "operation_sequence"     // e.g. multiply-then-add, distribute-then-collect
  | "word_problem_template"  // e.g. "had X, bought Y, gave Z"
  | "geometric_config"       // e.g. right triangle with two sides given
  | "table_structure";       // e.g. frequency table, value-count pairs

// ===== Entities =====
// Mathematical concepts/objects identified across exercises

export interface MathEntity {
  id: string;
  type: EntityType;
  name: string;               // canonical name
  aliases: string[];           // names in ar/fr/en
  frequency: number;
  properties: Record<string, string>;
  relatedPatterns: string[];   // pattern IDs
  domains: string[];
}

export type EntityType =
  | "operation"      // +, -, ×, ÷, ^
  | "concept"        // distributivity, factoring, pythagorean
  | "object"         // triangle, equation, expression, table
  | "property"       // right angle, commutative, associative
  | "strategy"       // expand, simplify, solve, compute
  | "unit"           // cm, m², dj (dinars)
  | "constraint";    // "right angle at A", "x > 0"

// ===== Relations =====
// Links between entities (concept map)

export interface EntityRelation {
  id: string;
  fromEntity: string;  // entity ID
  toEntity: string;
  type: RelationType;
  strength: number;     // 0-1, how often they co-occur
  frequency: number;
}

export type RelationType =
  | "requires"        // "solving equation" requires "isolating variable"
  | "produces"        // "expand" produces "simplified expression"
  | "co_occurs"       // often seen together
  | "is_a"            // "right triangle" is_a "triangle"
  | "part_of"         // "hypotenuse" part_of "right triangle"
  | "inverse_of"      // "expand" inverse_of "factor"
  | "precedes";       // "distribute" precedes "collect like terms"

// ===== Deconstruction Schemas =====
// Learned templates for breaking down exercise types

export interface DeconstructionSchema {
  id: string;
  name: string;
  description: string;
  domain: string;
  subdomain: string;
  frequency: number;
  confidence: number;
  trigger: SchemaTrigger;
  steps: SchemaStep[];
  expectedInputs: string[];
  expectedOutputs: string[];
  examples: string[];
}

export interface SchemaTrigger {
  keywords: string[];          // trigger words
  patterns: string[];          // pattern IDs that trigger this
  entityPresence: string[];    // required entities
  minMatch: number;            // how many triggers needed (0-1 ratio)
}

export interface SchemaStep {
  order: number;
  action: string;         // e.g. "identify_terms", "apply_distributive", "compute"
  description: string;
  inputFrom: string;      // "source" | step reference
  outputTo: string;
  ruleHint: string;       // which engine rule to apply
}

export interface KnowledgeGap {
  id: string;
  signature: string;
  frequency: number;
  sourceExercise: string;
  detectedEntities: string[];
  missingRuleType?: string;
  firstEncountered?: string;
  lastEncountered: string;
  resolved?: boolean;
}
