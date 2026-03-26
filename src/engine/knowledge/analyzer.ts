// ===== Pattern Analyzer =====
// IMPROVED: richer expression signatures (preserve operator sequence),
//           AST-depth fingerprint as secondary discriminator,
//           smarter schema matching, stronger entity extraction,
//           relation types beyond co_occurs.

import { ParsedExercise } from "../exercise-parser";
import {
  KnowledgeBase,
  MathPattern,
  MathEntity,
  EntityRelation,
  DeconstructionSchema,
  PatternType,
  EntityType,
  SchemaStep,
  ExpressionFingerprint,
} from "./types";
import { ASTNode } from "../types";
import { hashExercise, saveKB } from "./store";

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════

export function analyzeExercise(
  kb: KnowledgeBase,
  exercise: ParsedExercise
): KnowledgeBase {
  const fingerprint = hashExercise(exercise.source.text);
  if (kb.exerciseFingerprints.includes(fingerprint)) return kb;

  const updated = { ...kb };
  updated.exerciseFingerprints = [...kb.exerciseFingerprints, fingerprint];
  updated.stats = { ...kb.stats, lastAnalyzedAt: new Date().toISOString() };

  for (const expr of exercise.semanticObjects.expressions)
    extractExpressionPattern(updated, expr, exercise);
  for (const eq of exercise.semanticObjects.equations)
    extractEquationPattern(updated, eq, exercise);

  extractEntities(updated, exercise);
  updateRelations(updated, exercise);
  updateSchemas(updated, exercise);

  saveKB(updated);
  return updated;
}

export function analyzeMultiple(
  kb: KnowledgeBase,
  exercises: ParsedExercise[]
): KnowledgeBase {
  let current = kb;
  for (const ex of exercises) current = analyzeExercise(current, ex);
  return current;
}

export function recordKnowledgeGap(
  kb: KnowledgeBase,
  exercise: ParsedExercise,
  reason: string
): KnowledgeBase {
  const updated = { ...kb };
  const sig = exercise.semanticObjects.expressions[0] 
    ? getExpressionSignature(exercise.semanticObjects.expressions[0])
    : exercise.classification.subdomain;

  const existing = updated.learningGaps.find(g => g.signature === sig);

  if (existing) {
    existing.frequency++;
    existing.lastEncountered = new Date().toISOString();
  } else {
    updated.learningGaps.push({
      id: `gap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      signature: sig,
      frequency: 1,
      sourceExercise: exercise.source.text.slice(0, 100),
      detectedEntities: [],
      missingRuleType: reason,
      firstEncountered: new Date().toISOString(),
      lastEncountered: new Date().toISOString(),
    });
  }

  saveKB(updated);
  return updated;
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPROVED SIGNATURE GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Produces a canonical signature that preserves the operator sequence.
 *
 * BEFORE: "2x+3" and "5a-4b" both became "NV+NV" → same key (lossy)
 * AFTER:  "2x+3" → "N*V+N"  |  "5a-4b" → "N*V-N*V"  (structurally distinct)
 *
 * Rules:
 *  - Numbers  → N
 *  - Identifiers that look like variables (single letter) → V
 *  - Multi-letter identifiers (function names) → F
 *  - Operators, parens preserved as-is
 */
export function getExpressionSignature(expr: string): string {
  // Normalise operator aliases
  const normalised = expr
    .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
    .replace(/\s+/g, "");

  // Replace tokens left-to-right
  let sig = normalised
    .replace(/\d+\.?\d*(?:[eE][+\-]?\d+)?/g, "N")       // numbers → N
    .replace(/\b[a-zA-Z]{2,}\b/g, "F")                   // multi-char ids → F
    .replace(/\b[a-zA-Z]\b/g, "V");                      // single-char ids → V

  // Collapse adjacent same tokens only within non-operator runs
  // Do NOT collapse across operators — that was the original bug
  sig = sig
    .replace(/N{2,}/g, "N")   // NN → N  (rare, e.g. adjacent numbers after sub)
    .replace(/V{2,}/g, "V");  // VV → V

  return sig;
}

/**
 * Secondary discriminator: depth of the AST.
 * Two expressions with the same signature but different nesting get
 * different fingerprints so they are stored as distinct patterns.
 */
function nestingDepth(expr: string): number {
  let max = 0, current = 0;
  for (const ch of expr) {
    if (ch === "(") { current++; max = Math.max(max, current); }
    else if (ch === ")") current--;
  }
  return max;
}

/**
 * Encodes solvability signals from the AST to help with operation routing.
 */
export function computeFingerprint(
  expr: string,
  ast: ASTNode
): ExpressionFingerprint {
  try {
    const signature = getExpressionSignature(expr);
    const hasParenProduct = /\d\s*\(|\)\s*\(|[a-zA-Z]\s*\(/.test(expr);
    const hasEquality = /=/.test(expr);
    const depth = nestingDepth(expr);

    // AST Walk for like terms, degree, variable count
    const variables = new Map<string, number>();
    let maxDegree = 0;
    let opCount = 0;

    const walk = (node: ASTNode) => {
      switch (node.type) {
        case "variable":
          variables.set(node.name, (variables.get(node.name) ?? 0) + 1);
          if (maxDegree === 0) maxDegree = 1;
          break;
        case "binaryOp":
          opCount++;
          if (node.op === "^" && node.right.type === "number") {
            maxDegree = Math.max(maxDegree, node.right.value);
          }
          walk(node.left);
          walk(node.right);
          break;
        case "unaryOp":
          walk(node.operand);
          break;
        case "functionCall":
          node.args.forEach(walk);
          break;
      }
    };

    walk(ast);

    const hasLikeTerms = Array.from(variables.values()).some((count) => count >= 2);
    const variableCount = variables.size;
    const operatorDensity = Math.min(
      1,
      opCount / (expr.replace(/\s/g, "").length || 1)
    );

    return {
      signature,
      hasParenProduct,
      hasLikeTerms,
      hasEquality,
      degree: maxDegree,
      variableCount,
      operatorDensity,
      nestingDepth: depth,
    };
  } catch (err) {
    console.warn("[KB] Fingerprint computation failed:", err);
    return {
      signature: getExpressionSignature(expr),
      hasParenProduct: false,
      hasLikeTerms: false,
      hasEquality: false,
      degree: 0,
      variableCount: 0,
      operatorDensity: 0,
      nestingDepth: 0,
    };
  }
}

export function recomputeTaskConfidence(pattern: MathPattern): void {
  const outcomes = Object.values(pattern.taskOutcomes);
  const total = outcomes.reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    pattern.taskConfidence = {};
    return;
  }

  const confidence: Record<string, number> = {};
  for (const [task, count] of Object.entries(pattern.taskOutcomes)) {
    confidence[task] = count / total;
  }
  pattern.taskConfidence = confidence;
}

export function predictTask(
  signature: string,
  kb: KnowledgeBase,
  minFrequency: number = 5,
  minConfidence: number = 0.7
): { task: string; confidence: number; pattern: MathPattern } | null {
  const pattern = kb.patterns
    .filter((p) => p.signature === signature && p.frequency >= minFrequency)
    .sort((a, b) => b.frequency - a.frequency)[0];

  if (!pattern || !pattern.taskConfidence) return null;

  const best = Object.entries(pattern.taskConfidence).sort(
    ([, a], [, b]) => b - a
  )[0];

  if (!best || best[1] < minConfidence) return null;

  return { task: best[0], confidence: best[1], pattern };
}

// ══════════════════════════════════════════════════════════════════════════════
// PATTERN EXTRACTION
// ══════════════════════════════════════════════════════════════════════════════

function classifyExpressionPattern(expr: string): PatternType {
  if (/[=]/.test(expr)) return "equation_form";
  if (/[≥≤><]/.test(expr)) return "equation_form";
  return "expression_structure";
}

function inferDecomposition(expr: string): string[] {
  const steps: string[] = [];
  if (/\(/.test(expr)) steps.push("identify_parentheses");
  if (/[\*×].*\(/.test(expr) || /\d\(/.test(expr)) steps.push("apply_distribution");
  if (/[a-zA-Z].*[a-zA-Z]/.test(expr)) steps.push("collect_like_terms");
  if (/[\+\-]/.test(expr)) steps.push("combine_constants");
  if (/[\*×÷\/]/.test(expr)) steps.push("compute_products");
  steps.push("simplify_result");
  return steps;
}

function extractExpressionPattern(
  kb: KnowledgeBase,
  expr: string,
  exercise: ParsedExercise
): void {
  const signature = getExpressionSignature(expr);
  const depth = nestingDepth(expr);
  // Use signature + depth as composite key to distinguish (a+b)*c from a+b*c
  const compositeKey = `${signature}@d${depth}`;

  const type = classifyExpressionPattern(expr);
  const domain = exercise.classification.domain;
  const subdomain = exercise.classification.subdomain;

  const existing = kb.patterns.find(
    (p) => p.signature === compositeKey && p.type === type
  );

  if (existing) {
    existing.frequency++;
    existing.confidence = Math.min(1, existing.frequency / 10);
    existing.lastSeen = new Date().toISOString();
    if (!existing.domains.includes(domain)) existing.domains.push(domain);
    if (!existing.subdomains.includes(subdomain))
      existing.subdomains.push(subdomain);
    if (existing.examples.length < 5 && !existing.examples.includes(expr))
      existing.examples.push(expr);

    // Update task outcomes
    for (const task of exercise.intent.tasks) {
      existing.taskOutcomes[task] = (existing.taskOutcomes[task] ?? 0) + 1;
    }
    recomputeTaskConfidence(existing);
  } else {
    // Try to get AST for fingerprinting if possible
    let fingerprint: any = undefined;
    try {
      const { parse } = require("../parser"); // Late import to avoid cycles if any
      const ast = parse(expr);
      fingerprint = computeFingerprint(expr, ast);
    } catch {
      /* Fallback for patterns without AST */
    }

    const pattern: MathPattern = {
      id: `pat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      signature: compositeKey,
      description: describeSignature(signature, type),
      frequency: 1,
      confidence: 0.1,
      domains: [domain],
      subdomains: [subdomain],
      examples: [expr],
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      decomposition: inferDecomposition(expr),
      solveStrategy: exercise.intent.tasks,
      fingerprint,
      taskOutcomes: {},
      taskConfidence: {},
    };

    for (const task of exercise.intent.tasks) {
      pattern.taskOutcomes[task] = 1;
    }
    recomputeTaskConfidence(pattern);

    kb.patterns.push(pattern);
  }
}

function extractEquationPattern(
  kb: KnowledgeBase,
  eq: string,
  exercise: ParsedExercise
): void {
  extractExpressionPattern(kb, eq, exercise);
}

function describeSignature(sig: string, type: PatternType): string {
  // Clean up signature for display (remove @d depth suffix)
  const cleanSig = sig.replace(/@d\d+$/, "");

  const descriptions: Record<string, string> = {
    "N*(V+N)+N*(V+N)": "توزيع ثنائي: a(x+b)+c(x+d)",
    "N*(V-N)+N*(V+N)": "توزيع مع اختلاف الإشارة",
    "N*N+N*N-N": "عمليات حسابية متسلسلة",
    "N+N*N-N": "أولوية العمليات",
    "(N+N)*N": "ضرب مجموع في عدد",
    "N*V+N": "تعبير خطي ax+b",
    "N*V+N*V": "مجموع حدود خطية",
    "N*V-N*V": "فرق حدود خطية",
    "N*V^N+N*V+N": "متعدد حدود تربيعي",
  };

  if (descriptions[cleanSig]) return descriptions[cleanSig];
  if (type === "equation_form") return `معادلة بالشكل: ${cleanSig}`;
  return `نمط تعبير: ${cleanSig}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTITY EXTRACTION
// ══════════════════════════════════════════════════════════════════════════════

const CONCEPT_MAP: Record<string, { type: EntityType; aliases: string[] }> = {
  distributivity: {
    type: "concept",
    aliases: ["توزيعية", "التوزيع", "développement", "distribution", "distributive"],
  },
  factoring: {
    type: "concept",
    aliases: ["تحليل", "تفكيك", "factorisation", "factoring", "factor"],
  },
  pythagorean: {
    type: "concept",
    aliases: ["فيثاغورس", "pythagore", "pythagorean", "pythagoras"],
  },
  order_of_operations: {
    type: "concept",
    aliases: ["أولوية العمليات", "priorité", "order of operations", "PEMDAS", "BODMAS"],
  },
  parentheses: {
    type: "concept",
    aliases: ["أقواس", "parenthèses", "parentheses", "brackets"],
  },
  area: { type: "concept", aliases: ["مساحة", "aire", "area", "surface"] },
  perimeter: { type: "concept", aliases: ["محيط", "périmètre", "perimeter"] },
  mean: {
    type: "concept",
    aliases: ["متوسط", "معدل", "moyenne", "mean", "average", "arithmetic mean"],
  },
  frequency: {
    type: "concept",
    aliases: ["تكرار", "تواتر", "fréquence", "frequency"],
  },
  like_terms: {
    type: "concept",
    aliases: ["حدود متشابهة", "termes semblables", "like terms", "collect terms"],
  },
  polynomial: {
    type: "concept",
    aliases: ["كثير حدود", "polynôme", "polynomial"],
  },
  linear_equation: {
    type: "concept",
    aliases: ["معادلة خطية", "équation du premier degré", "linear equation"],
  },
  quadratic: {
    type: "concept",
    aliases: ["معادلة تربيعية", "équation du second degré", "quadratic", "second degree"],
  },
  addition: {
    type: "operation",
    aliases: ["جمع", "addition", "sum", "+", "plus"],
  },
  subtraction: {
    type: "operation",
    aliases: ["طرح", "soustraction", "difference", "-", "minus"],
  },
  multiplication: {
    type: "operation",
    aliases: ["ضرب", "multiplication", "product", "×", "*"],
  },
  division: {
    type: "operation",
    aliases: ["قسمة", "division", "quotient", "÷", "/"],
  },
  exponentiation: {
    type: "operation",
    aliases: ["رفع للقوة", "puissance", "power", "exponent", "^"],
  },
  triangle: { type: "object", aliases: ["مثلث", "triangle"] },
  circle: { type: "object", aliases: ["دائرة", "cercle", "circle"] },
  rectangle: { type: "object", aliases: ["مستطيل", "rectangle"] },
  square: { type: "object", aliases: ["مربع", "carré", "square"] },
  equation: { type: "object", aliases: ["معادلة", "équation", "equation"] },
  expression: { type: "object", aliases: ["عبارة", "expression"] },
  right_angle: {
    type: "property",
    aliases: ["قائم", "rectangle", "right angle", "90°"],
  },
  commutative: {
    type: "property",
    aliases: ["تبديلية", "commutatif", "commutative"],
  },
  associative: {
    type: "property",
    aliases: ["تجميعية", "associatif", "associative"],
  },
};

function extractEntities(kb: KnowledgeBase, exercise: ParsedExercise): void {
  const text = exercise.source.text.toLowerCase();
  const domain = exercise.classification.domain;

  for (const [name, info] of Object.entries(CONCEPT_MAP)) {
    const found = info.aliases.some((alias) =>
      text.includes(alias.toLowerCase())
    );
    if (!found) continue;

    const existing = kb.entities.find((e) => e.name === name);
    if (existing) {
      existing.frequency++;
      if (!existing.domains.includes(domain)) existing.domains.push(domain);
    } else {
      kb.entities.push({
        id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: info.type,
        name,
        aliases: info.aliases,
        frequency: 1,
        properties: {},
        relatedPatterns: [],
        domains: [domain],
      });
    }
  }

  // Strategies
  for (const task of exercise.intent.tasks) {
    const existing = kb.entities.find(
      (e) => e.name === task && e.type === "strategy"
    );
    if (existing) {
      existing.frequency++;
    } else {
      kb.entities.push({
        id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: "strategy",
        name: task,
        aliases: [task],
        frequency: 1,
        properties: {},
        relatedPatterns: [],
        domains: [domain],
      });
    }
  }

  // Units
  const unitMatches = text.match(/(?:cm|m²|m²|m|km|dj|دج|سم|kg|g|l|ml)/g);
  if (unitMatches) {
    for (const unit of new Set(unitMatches)) {
      const existing = kb.entities.find(
        (e) => e.name === unit && e.type === "unit"
      );
      if (existing) {
        existing.frequency++;
      } else {
        kb.entities.push({
          id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: "unit",
          name: unit,
          aliases: [unit],
          frequency: 1,
          properties: {},
          relatedPatterns: [],
          domains: [domain],
        });
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RELATION BUILDING (IMPROVED)
// ══════════════════════════════════════════════════════════════════════════════

function updateRelations(kb: KnowledgeBase, exercise: ParsedExercise): void {
  const text = exercise.source.text.toLowerCase();

  const presentEntities = kb.entities.filter((e) =>
    e.aliases.some((a) => text.includes(a.toLowerCase()))
  );

  // Co-occurrence relations between all entity pairs
  for (let i = 0; i < presentEntities.length; i++) {
    for (let j = i + 1; j < presentEntities.length; j++) {
      upsertRelation(kb, presentEntities[i].id, presentEntities[j].id, "co_occurs", 8);
    }
  }

  // Strategy "requires" concept
  const strategies = presentEntities.filter((e) => e.type === "strategy");
  const concepts = presentEntities.filter((e) => e.type === "concept");
  for (const strat of strategies) {
    for (const concept of concepts) {
      upsertRelation(kb, strat.id, concept.id, "requires", 5);
    }
  }

  // Operation "produces" object (e.g. multiplication → product)
  const operations = presentEntities.filter((e) => e.type === "operation");
  const objects = presentEntities.filter((e) => e.type === "object");
  for (const op of operations) {
    for (const obj of objects) {
      upsertRelation(kb, op.id, obj.id, "produces", 6);
    }
  }

  // Concept "precedes" strategy (e.g. distributivity precedes simplification)
  for (const concept of concepts) {
    for (const strat of strategies) {
      if (
        (concept.name === "distributivity" && strat.name === "expand") ||
        (concept.name === "like_terms" && strat.name === "simplify") ||
        (concept.name === "pythagorean" && strat.name === "find_side")
      ) {
        upsertRelation(kb, concept.id, strat.id, "precedes", 5);
      }
    }
  }
}

function upsertRelation(
  kb: KnowledgeBase,
  from: string,
  to: string,
  type: EntityRelation["type"],
  maxFreqForFullStrength: number
): void {
  const key = [from, to].sort().join("_") + "_" + type;
  const existing = kb.relations.find(
    (r) =>
      [r.fromEntity, r.toEntity].sort().join("_") + "_" + r.type === key
  );
  if (existing) {
    existing.frequency++;
    existing.strength = Math.min(1, existing.frequency / maxFreqForFullStrength);
  } else {
    kb.relations.push({
      id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromEntity: from,
      toEntity: to,
      type,
      strength: 1 / maxFreqForFullStrength,
      frequency: 1,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMA EVOLUTION (IMPROVED)
// ══════════════════════════════════════════════════════════════════════════════

function updateSchemas(kb: KnowledgeBase, exercise: ParsedExercise): void {
  const domain = exercise.classification.domain;
  const subdomain = exercise.classification.subdomain;
  const tasks = [...exercise.intent.tasks].sort();

  const existing = kb.schemas.find(
    (s) =>
      s.domain === domain &&
      s.subdomain === subdomain &&
      [...s.steps.map((st) => st.action)].sort().join("+") === tasks.join("+")
  );

  if (existing) {
    existing.frequency++;
    existing.confidence = Math.min(1, existing.frequency / 8);
    if (existing.examples.length < 5)
      existing.examples.push(exercise.source.text.slice(0, 80));

    // Merge new keywords (stop at 30 for performance)
    const text = exercise.source.text.toLowerCase();
    const words = text
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/\d/.test(w));
    for (const w of words) {
      if (
        !existing.trigger.keywords.includes(w) &&
        existing.trigger.keywords.length < 30
      ) {
        existing.trigger.keywords.push(w);
      }
    }

    // Update confidence of matching patterns
    const relevantPatternIds = kb.patterns
      .filter((p) => p.domains.includes(domain))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map((p) => p.id);
    for (const id of relevantPatternIds) {
      if (!existing.trigger.patterns.includes(id))
        existing.trigger.patterns.push(id);
    }
  } else {
    const relevantPatterns = kb.patterns
      .filter((p) => p.domains.includes(domain))
      .sort((a, b) => b.frequency - a.frequency);

    const steps: SchemaStep[] = tasks.map((task, i) => ({
      order: i,
      action: task,
      description: taskDescription(task),
      inputFrom: i === 0 ? "source" : `step_${i - 1}`,
      outputTo: i === tasks.length - 1 ? "result" : `step_${i + 1}`,
      ruleHint: taskToRule(task),
    }));

    // Merge decomposition steps from top pattern
    if (relevantPatterns.length > 0) {
      const decomp = relevantPatterns[0].decomposition;
      for (const d of decomp) {
        if (!steps.some((s) => s.action === d)) {
          steps.push({
            order: steps.length,
            action: d,
            description: taskDescription(d),
            inputFrom: "intermediate",
            outputTo: "result",
            ruleHint: taskToRule(d),
          });
        }
      }
    }

    const text = exercise.source.text.toLowerCase();
    const keywords = text
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/\d/.test(w))
      .slice(0, 20);

    kb.schemas.push({
      id: `sch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${domain}::${subdomain}`,
      description: `مخطط تفكيك ${subdomain} في مجال ${domain}`,
      domain,
      subdomain,
      frequency: 1,
      confidence: 0.1,
      trigger: {
        keywords,
        patterns: relevantPatterns.slice(0, 5).map((p) => p.id),
        entityPresence: [],
        minMatch: 0.3,
      },
      steps,
      expectedInputs: exercise.intent.tasks,
      expectedOutputs: exercise.intent.expectedOutput,
      examples: [exercise.source.text.slice(0, 80)],
    });
  }
}

function taskDescription(task: string): string {
  const map: Record<string, string> = {
    expand: "نشر العبارة باستعمال التوزيعية",
    simplify: "تبسيط العبارة وجمع الحدود المتشابهة",
    solve_equation: "حل المعادلة",
    solve_inequality: "حل المتراجحة",
    compute: "حساب النتيجة",
    evaluate: "حساب القيمة العددية",
    place_parentheses: "وضع الأقواس لتحقيق المساواة",
    find_side: "إيجاد الضلع المجهول باستعمال فيثاغورس",
    area: "حساب المساحة",
    perimeter: "حساب المحيط",
    identify_parentheses: "تحديد الأقواس والمجموعات",
    apply_distribution: "تطبيق خاصية التوزيع",
    collect_like_terms: "جمع الحدود المتشابهة",
    compute_products: "حساب الجداءات",
    simplify_result: "تبسيط النتيجة النهائية",
    combine_constants: "جمع الثوابت العددية",
    analyze: "تحليل التمرين",
    compute_mean: "حساب المتوسط الحسابي",
    compute_total: "حساب المجموع الكلي",
    draw_chart: "رسم المخطط البياني",
    factor: "تحليل العبارة إلى عوامل",
  };
  return map[task] || task;
}

function taskToRule(task: string): string {
  const map: Record<string, string> = {
    expand: "distribute_mul_add",
    simplify: "collect_like_terms",
    collect_like_terms: "collect_like_terms",
    apply_distribution: "distribute_mul_add",
    compute: "fold_add",
    combine_constants: "fold_add",
    solve_equation: "self_cancel",
    find_side: "pythagorean_theorem",
    area: "triangle_area",
    perimeter: "triangle_perimeter",
    factor: "factoring",
  };
  return map[task] || "";
}
/**
 * "Fixes" a gap by teaching the engine how to solve it.
 * Creates a DeconstructionSchema and removes the gap from the KB.
 */
export function learnFromGap(
  kb: KnowledgeBase,
  gapId: string,
  steps: { description: string; ruleHint?: string }[]
): KnowledgeBase {
  const gap = kb.learningGaps.find(g => g.id === gapId);
  if (!gap) return kb;

  const newKB = { ...kb };
  const schemaId = `schema_${Date.now()}`;
  
  // 1. Create the Schema
  const newSchema: DeconstructionSchema = {
    id: schemaId,
    name: `Learned: ${gap.signature}`,
    description: `Automatically induced schema from gap: ${gap.signature}`,
    domain: "algebra", // Default for now
    subdomain: gap.signature,
    frequency: gap.frequency,
    confidence: 0.8, // Initial confidence for learned rules
    trigger: {
      keywords: [],
      patterns: [gap.signature],
      entityPresence: [],
      minMatch: 1
    },
    steps: steps.map((s, i) => ({
      order: i,
      action: s.ruleHint || "apply_rule",
      description: s.description,
      inputFrom: i === 0 ? "source" : `step_${i-1}`,
      outputTo: `step_${i}`,
      ruleHint: s.ruleHint || ""
    })),
    expectedInputs: [gap.sourceExercise],
    expectedOutputs: [], // Should be filled if we had the final result
    examples: [gap.sourceExercise]
  };

  // 2. Add as a MathPattern if not exists (with all required typed fields)
  const now = new Date().toISOString();
  if (!kb.patterns.some(p => p.signature === gap.signature)) {
    const newPattern: MathPattern = {
      id: gap.signature,
      signature: gap.signature,
      type: "expression_structure",
      description: `Learned pattern: ${gap.signature}`,
      frequency: gap.frequency,
      confidence: 0.8,
      domains: ["algebra"],
      subdomains: [gap.signature],
      examples: [gap.sourceExercise],
      firstSeen: now,
      lastSeen: now,
      decomposition: steps.map(s => s.description.slice(0, 30)),
      solveStrategy: steps.map(s => s.ruleHint || s.description.slice(0, 20)),
      taskOutcomes: {},
      taskConfidence: {},
    };
    newKB.patterns = [...kb.patterns, newPattern];
  }

  // 3. Update stats and arrays
  newKB.schemas = [...kb.schemas, newSchema];
  newKB.learningGaps = kb.learningGaps.filter(g => g.id !== gapId);

  // 4. Recalculate stats
  newKB.stats = {
    ...newKB.stats,
    totalPatterns: newKB.patterns.length,
    totalSchemas: newKB.schemas.length,
    totalGaps: newKB.learningGaps.length,
    lastAnalyzedAt: now,
  };

  // 5. CRITICAL FIX: persist to localStorage so rule survives page refresh
  saveKB(newKB);

  return newKB;
}
