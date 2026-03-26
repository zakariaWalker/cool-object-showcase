// ===== Algebra Engine =====
// High-level operations: expand, simplify

import { parse } from "./parser";
import { ASTNode, SolveResult, Step } from "./types";
import { applyRules, algebraRules } from "./rules";
import { cloneAST, astToString } from "./ast-utils";
import { KnowledgeBase } from "./knowledge/types";
import { loadKB } from "./knowledge/store";
import { getExpressionSignature, predictTask } from "./knowledge/analyzer";

// Alias: safeParse wraps parse with error handling
function safeParse(input: string): ASTNode {
  try { return parse(input); } catch { return { type: "variable", name: input }; }
}

// Return all algebra rules as "simplification rules"
function simplificationRules() { return algebraRules; }

/** Expand an expression (distribute all products) */
export function expand(input: string | ASTNode): SolveResult {
  const ast = typeof input === "string" ? parse(input) : cloneAST(input);
  
  // Use distribution rules first, then fold constants
  const distributionRules = algebraRules.filter(r =>
    r.id.startsWith("distribute_") || r.id.startsWith("fold_") || r.id.startsWith("mul_by") || r.id === "add_zero" || r.id === "pow_one" || r.id === "pow_zero"
  );

  const { result, steps } = applyRules(ast, distributionRules);

  return {
    input: ast,
    output: result,
    steps,
    domain: "algebra",
  };
}

/** Simplify an expression (apply all algebra rules) */
export function simplify(input: string | ASTNode): SolveResult {
  const ast = typeof input === "string" ? parse(input) : cloneAST(input);
  const { result, steps } = applyRules(ast, algebraRules);

  return {
    input: ast,
    output: result,
    steps,
    domain: "algebra",
  };
}

// ── New exports from engine-improved (Phase 23 merge) ────────────────────────
// solveBySchema, detectMode, evaluate, solveLinear, solveQuadratic,
// solveSystem, solveInequality, AutoSolveResult, autoSolve

export function smartSimplify(input: string | ASTNode): SolveResult {
  const inputStr = typeof input === "string" ? input : astToString(input);
  const ast = typeof input === "string" ? safeParse(input) : cloneAST(input);

  let rules = [...simplificationRules()];

  try {
    const kb = loadKB();
    const lower = inputStr.toLowerCase();
    const matchingSchema = kb.schemas
      .filter(s => s.trigger.keywords.some(k => k.length > 3 && lower.includes(k)))
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (matchingSchema) {
      const hintIds = matchingSchema.steps.map(s => s.ruleHint).filter(Boolean);
      if (hintIds.length > 0) {
        const hinted = rules.filter(r => hintIds.includes(r.id));
        const rest = rules.filter(r => !hintIds.includes(r.id));
        rules = [...hinted, ...rest];
      }
    }
  } catch { /* KB unavailable */ }

  const { result, steps } = applyRules(ast, rules);
  return { input: ast, output: result, steps, domain: "algebra" };
}

// ── Solve by Learned Schema ──────────────────────────────────────────────────

export function solveBySchema(input: string, schema: any): SolveResult {
  const ast = safeParse(input);
  const steps: Step[] = [];
  let currentAst = ast;

  schema.steps.forEach((s: any, i: number) => {
    // For now, we simple represent each schema step as a step in the solve result
    // In a real system, we'd try to match the "action" to a rule or engine
    steps.push({
      index: i,
      expression: currentAst, // Ideally we'd show the transformation
      rule: {
        ruleId: `learned_${schema.id}_${i}`,
        ruleName: s.action,
        before: currentAst,
        after: currentAst, // We don't have a real evaluator for arbitrary actions yet
        description: s.description
      }
    });
  });

  return {
    input: ast,
    output: currentAst,
    steps,
    domain: "algebra",
  } as SolveResult;
}

// ── Detect mode (expand vs simplify heuristic) ────────────────────────────────

export type AlgebraMode = "expand" | "simplify" | "factor" | "evaluate" | "solve";

export interface DetectModeResult {
  mode: AlgebraMode;
  confidence: number;         // 0–1
  source: "task" | "kb" | "heuristic";
  patternSignature?: string;  // which KB signature matched, if any
  reasoning: string;          // human-readable explanation (Arabic/English)
}

/**
 * Infer the best operation for an expression or equation based on structure.
 * Returns "expand" if the expression has unexpanded products over sums,
 * "simplify" otherwise.
 */
export function detectMode(
  input: string,
  tasks: string[] = [],
  kb?: KnowledgeBase
): DetectModeResult {
  const isArabic = /[\u0600-\u06FF]/.test(input); // Basic Arabic detection

  // TIER 1 — Explicit task instruction (confidence 1.0, source "task")
  if (tasks.includes("expand")) {
    return {
      mode: "expand",
      confidence: 1.0,
      source: "task",
      reasoning: isArabic ? "مهمة صريحة في نص التمرين" : "Explicit task in text",
    };
  }
  if (tasks.includes("simplify")) {
    return {
      mode: "simplify",
      confidence: 1.0,
      source: "task",
      reasoning: isArabic ? "مهمة صريحة في نص التمرين" : "Explicit task in text",
    };
  }
  if (tasks.includes("factor") || tasks.includes("factorise")) {
    return {
      mode: "factor",
      confidence: 1.0,
      source: "task",
      reasoning: isArabic ? "مهمة صريحة في نص التمرين" : "Explicit task in text",
    };
  }
  if (tasks.includes("evaluate")) {
    return {
      mode: "evaluate",
      confidence: 1.0,
      source: "task",
      reasoning: isArabic ? "مهمة صريحة في نص التمرين" : "Explicit task in text",
    };
  }
  if (tasks.some((t) => t.includes("solve"))) {
    return {
      mode: "solve",
      confidence: 1.0,
      source: "task",
      reasoning: isArabic ? "مهمة صريحة في نص التمرين" : "Explicit task in text",
    };
  }

  // TIER 2 — KB prediction (source "kb")
  if (kb) {
    try {
      const signature = getExpressionSignature(input);
      const prediction = predictTask(signature, kb, 5, 0.7);

      if (prediction) {
        let mode: AlgebraMode | null = null;
        switch (prediction.task) {
          case "expand": mode = "expand"; break;
          case "simplify": mode = "simplify"; break;
          case "factor":
          case "factorise": mode = "factor"; break;
          case "solve_equation":
          case "solve_linear":
          case "solve_quadratic": mode = "solve"; break;
          case "evaluate": mode = "evaluate"; break;
        }

        if (mode) {
          const confidencePerc = Math.round(prediction.confidence * 100);
          return {
            mode,
            confidence: prediction.confidence,
            source: "kb",
            patternSignature: signature,
            reasoning: isArabic
              ? `قاعدة المعرفة: شوهد هذا النمط ${prediction.pattern.frequency} مرة، ${confidencePerc}% منها كانت "${prediction.task}"`
              : `Knowledge Base: pattern seen ${prediction.pattern.frequency} times, ${confidencePerc}% were "${prediction.task}"`,
          };
        }
      }
    } catch (err) {
      console.warn("[Algebra] KB detection failed:", err);
    }
  }

  // TIER 3 — Structural heuristic (confidence 0.5, source "heuristic")
  const hasUnexpandedProduct = /\d\s*\(|\)\s*\(|[a-zA-Z]\s*\(/.test(input);
  const mode = hasUnexpandedProduct ? "expand" : "simplify";

  return {
    mode,
    confidence: 0.5,
    source: "heuristic",
    reasoning: hasUnexpandedProduct
      ? isArabic ? "تخمين هيكلي: وجود ضرب قبل قوس" : "Structural heuristic: product before parentheses"
      : isArabic ? "تخمين هيكلي: لا ضرب قبل قوس" : "Structural heuristic: no product before parentheses",
  };
}

// ── Evaluate (numeric substitution) ──────────────────────────────────────────

export function evaluate(
  input: string | ASTNode,
  variables: Record<string, number>
): SolveResult {
  const ast = typeof input === "string" ? safeParse(input) : cloneAST(input);
  const substituted = substituteVars(ast, variables);
  return simplify(substituted);
}

function substituteVars(node: ASTNode, vars: Record<string, number>): ASTNode {
  switch (node.type) {
    case "number": return node;
    case "variable":
      return node.name in vars ? { type: "number", value: vars[node.name] } : node;
    case "unaryOp":
      return { ...node, operand: substituteVars(node.operand, vars) };
    case "binaryOp":
      return { ...node, left: substituteVars(node.left, vars), right: substituteVars(node.right, vars) };
    case "functionCall":
      return { ...node, args: node.args.map(a => substituteVars(a, vars)) };
  }
}

// ── Linear equation solver ────────────────────────────────────────────────────

export interface LinearSolution {
  variable: string;
  value: number | null;
  steps: string[];
  latex: string;
  consistent: boolean;
  infinite: boolean;
}

export function solveLinear(equation: string): LinearSolution | null {
  const parts = equation.split("=");
  if (parts.length !== 2) return null;

  try {
    const lhsAst = safeParse(parts[0].trim());
    const rhsAst = safeParse(parts[1].trim());

    const combined = simplify({ type: "binaryOp", op: "-", left: lhsAst, right: rhsAst });
    const coeffs = extractLinearCoeffs(combined.output);
    if (!coeffs) return null;

    const { a, b, variable } = coeffs;
    const steps: string[] = [
      `نرتب: (${parts[0].trim()}) − (${parts[1].trim()}) = 0`,
      `بعد التبسيط: ${a === 1 ? "" : a === -1 ? "-" : a}${variable} ${b >= 0 ? "+" : ""}${b} = 0`,
    ];
    let latex = "";

    if (a === 0 && b === 0) {
      steps.push("متطابقة: 0 = 0 → عدد لا نهائي من الحلول");
      return { variable, value: null, steps, latex: "\\infty \\text{ حلول}", consistent: true, infinite: true };
    }
    if (a === 0) {
      steps.push(`لا مجهول: ${b} ≠ 0 → لا يوجد حل`);
      return { variable, value: null, steps, latex: "\\emptyset", consistent: false, infinite: false };
    }

    const value = round(-b / a, 10);
    steps.push(`نقسم على ${a}: ${variable} = ${-b} ÷ ${a} = ${value}`);
    latex = `${variable} = \\frac{${-b}}{${a}} = ${value}`;
    return { variable, value, steps, latex, consistent: true, infinite: false };
  } catch {
    return null;
  }
}

// ── Quadratic solver ──────────────────────────────────────────────────────────

export interface QuadraticSolution {
  variable: string;
  discriminant: number;
  roots: { value: number | string; exact: string; latex: string }[];
  steps: string[];
  realRoots: boolean;
}

export function solveQuadratic(equation: string): QuadraticSolution | null {
  const parts = equation.split("=");
  if (parts.length !== 2) return null;

  try {
    const lhsAst = safeParse(parts[0].trim());
    const rhsAst = safeParse(parts[1].trim());
    const combined = simplify({ type: "binaryOp", op: "-", left: lhsAst, right: rhsAst });

    const coeffs = extractQuadraticCoeffs(combined.output);
    if (!coeffs || coeffs.a === 0) return null;

    const { a, b, c, variable } = coeffs;
    const disc = b * b - 4 * a * c;
    const steps: string[] = [
      `المعادلة: ${a}${variable}² ${b >= 0 ? "+" : ""}${b}${variable} ${c >= 0 ? "+" : ""}${c} = 0`,
      `المميز: Δ = b² - 4ac = ${b}² - 4×${a}×${c} = ${b * b} - ${4 * a * c} = ${disc}`,
    ];

    if (disc < 0) {
      steps.push(`Δ = ${disc} < 0 → لا توجد جذور حقيقية`);
      return { variable, discriminant: disc, roots: [], steps, realRoots: false };
    }

    if (disc === 0) {
      const x = round(-b / (2 * a), 10);
      steps.push(`Δ = 0 → جذر مزدوج: ${variable} = -b/(2a) = ${-b}/(${2 * a}) = ${x}`);
      return {
        variable, discriminant: disc,
        roots: [{ value: x, exact: `${x}`, latex: `${variable} = ${x}` }],
        steps, realRoots: true,
      };
    }

    const sqrtDisc = Math.sqrt(disc);
    const isExact = Number.isInteger(sqrtDisc);
    const sqrtStr = isExact ? String(sqrtDisc) : `\\sqrt{${disc}}`;

    const x1 = round((-b + sqrtDisc) / (2 * a), 10);
    const x2 = round((-b - sqrtDisc) / (2 * a), 10);

    steps.push(`Δ = ${disc} > 0 → جذران مختلفان`);
    steps.push(`${variable}₁ = (-${b} + ${isExact ? sqrtDisc : `√${disc}`}) / (2×${a}) = ${x1}`);
    steps.push(`${variable}₂ = (-${b} - ${isExact ? sqrtDisc : `√${disc}`}) / (2×${a}) = ${x2}`);

    return {
      variable, discriminant: disc,
      roots: [
        {
          value: x1,
          exact: isExact ? String(x1) : `(-${b}+√${disc})/${2 * a}`,
          latex: `${variable}_1 = \\frac{${-b}+${sqrtStr}}{${2 * a}} = ${x1}`,
        },
        {
          value: x2,
          exact: isExact ? String(x2) : `(-${b}-√${disc})/${2 * a}`,
          latex: `${variable}_2 = \\frac{${-b}-${sqrtStr}}{${2 * a}} = ${x2}`,
        },
      ],
      steps, realRoots: true,
    };
  } catch {
    return null;
  }
}

// ── Linear system solver (2×2) ────────────────────────────────────────────────

export interface SystemSolution {
  variables: [string, string];
  values: [number, number] | null;
  steps: string[];
  latex: string;
  consistent: boolean;
  infinite: boolean;
}

/**
 * Solve a 2×2 linear system using elimination (Gaussian).
 * Input: ["ax+by=c", "dx+ey=f"]
 */
export function solveSystem(equations: string[]): SystemSolution | null {
  if (equations.length !== 2) return null;

  try {
    // Parse each equation into { a, b, c } for ax + by = c
    const parsed = equations.map(eq => parseLinearEquation(eq));
    if (!parsed[0] || !parsed[1]) return null;

    const { a: a1, b: b1, c: c1, vars: v1 } = parsed[0];
    const { a: a2, b: b2, c: c2, vars: v2 } = parsed[1];

    // Ensure same variable order
    const allVars = [...new Set([...v1, ...v2])];
    if (allVars.length !== 2) return null;
    const [xVar, yVar] = allVars;

    const steps: string[] = [
      `الجملة: { ${equations[0]}`,
      `        { ${equations[1]}`,
      `نستخدم طريقة الحذف:`,
    ];

    // Multiply to eliminate xVar: a2*eq1 - a1*eq2
    const m1 = a2, m2 = a1;
    const na1 = a1 * m1 - a2 * m2; // should be 0
    const nb1 = b1 * m1 - b2 * m2;
    const nc1 = c1 * m1 - c2 * m2;

    steps.push(`نضرب المعادلة (1) في ${m1} والمعادلة (2) في ${m2} ونطرح:`);
    steps.push(`${nb1}${yVar} = ${nc1}`);

    if (nb1 === 0 && nc1 === 0) {
      return { variables: [xVar, yVar], values: null, steps, latex: "\\infty", consistent: true, infinite: true };
    }
    if (nb1 === 0) {
      return { variables: [xVar, yVar], values: null, steps, latex: "\\emptyset", consistent: false, infinite: false };
    }

    const yVal = round(nc1 / nb1, 10);
    steps.push(`${yVar} = ${nc1}/${nb1} = ${yVal}`);

    // Back-substitute to find xVar
    let xVal: number;
    if (a1 !== 0) {
      xVal = round((c1 - b1 * yVal) / a1, 10);
      steps.push(`بالتعويض في (1): ${a1}${xVar} = ${c1} - ${b1}×${yVal} = ${c1 - b1 * yVal}`);
      steps.push(`${xVar} = ${xVal}`);
    } else {
      xVal = round((c2 - b2 * yVal) / a2, 10);
      steps.push(`بالتعويض في (2): ${xVar} = ${xVal}`);
    }

    const latex = `${xVar} = ${xVal}, \\quad ${yVar} = ${yVal}`;
    return { variables: [xVar, yVar], values: [xVal, yVal], steps, latex, consistent: true, infinite: false };
  } catch {
    return null;
  }
}

// ── Inequality solver ─────────────────────────────────────────────────────────

export interface InequalitySolution {
  variable: string;
  direction: "<" | ">" | "<=" | ">=" | "=";
  value: number;
  setNotation: string;
  latex: string;
  steps: string[];
  flipped: boolean; // was direction flipped due to negative division?
}

export function solveInequality(inequation: string): InequalitySolution | null {
  // Detect operator
  const ops = ["<=", ">=", "<", ">"];
  let op: string | null = null;
  for (const o of ops) {
    if (inequation.includes(o)) { op = o; break; }
  }
  if (!op) return null;

  const parts = inequation.split(op);
  if (parts.length !== 2) return null;

  try {
    const lhsAst = safeParse(parts[0].trim());
    const rhsAst = safeParse(parts[1].trim());
    const combined = simplify({ type: "binaryOp", op: "-", left: lhsAst, right: rhsAst });
    const coeffs = extractLinearCoeffs(combined.output);
    if (!coeffs) return null;

    const { a, b, variable } = coeffs;
    // ax + b OP 0 → ax OP -b → x OP -b/a (flip if a < 0)
    if (a === 0) return null;

    const value = round(-b / a, 10);
    const flipped = a < 0;

    // Flip operator if dividing by negative
    const opMap: Record<string, "<" | ">" | "<=" | ">="> = {
      "<": "<", ">": ">", "<=": "<=", ">=": ">=",
    };
    const flippedOpMap: Record<string, "<" | ">" | "<=" | ">="> = {
      "<": ">", ">": "<", "<=": ">=", ">=": "<=",
    };

    const finalOp = flipped ? flippedOpMap[op] : opMap[op];

    const latexOp: Record<string, string> = { "<": "<", ">": ">", "<=": "\\leq", ">=": "\\geq" };

    const setNotation =
      finalOp === "<" ? `]-∞, ${value}[` :
      finalOp === "<=" ? `]-∞, ${value}]` :
      finalOp === ">" ? `]${value}, +∞[` :
      `[${value}, +∞[`;

    const steps = [
      `${inequation}`,
      `نطرح (${parts[1].trim()}) من كلا الطرفين: ${a}${variable} ${b >= 0 ? "+" : ""}${b} ${op} 0`,
      flipped
        ? `نقسم على ${a} (سالب) مع قلب الإشارة: ${variable} ${finalOp} ${value}`
        : `نقسم على ${a}: ${variable} ${finalOp} ${value}`,
    ];

    return {
      variable,
      direction: finalOp,
      value,
      setNotation,
      latex: `${variable} ${latexOp[finalOp]} ${value}`,
      steps,
      flipped,
    };
  } catch {
    return null;
  }
}

// ── autoSolve: unified entry point ────────────────────────────────────────────

export interface AutoSolveResult {
  mode: AlgebraMode;
  modeResult?: DetectModeResult;    // add this field
  algebraResult?: SolveResult;
  linearSolution?: LinearSolution;
  quadraticSolution?: QuadraticSolution;
  systemSolution?: SystemSolution;
  inequalitySolution?: InequalitySolution;
}

export function autoSolve(
  expressions: string[],
  equations: string[],
  inequalities: string[],
  tasks: string[],
  kb?: KnowledgeBase
): AutoSolveResult[] {
  const results: AutoSolveResult[] = [];

  // Process equations
  for (const eq of equations) {
    if (!eq.trim()) continue;

    // Try quadratic first
    const qSol = solveQuadratic(eq);
    if (qSol && qSol.discriminant !== undefined) {
      results.push({ mode: "solve", quadraticSolution: qSol });
      continue;
    }

    const linSol = solveLinear(eq);
    if (linSol) {
      results.push({ mode: "solve", linearSolution: linSol });
    }
  }

  // 2-equation system
  if (equations.length >= 2) {
    const sysSol = solveSystem(equations.slice(0, 2));
    if (sysSol) results.push({ mode: "solve", systemSolution: sysSol });
  }

  // Inequalities
  for (const ineq of inequalities) {
    if (!ineq.trim()) continue;
    const sol = solveInequality(ineq);
    if (sol) results.push({ mode: "solve", inequalitySolution: sol });
  }

  // Expressions: expand vs simplify
  for (const expr of expressions) {
    const cleaned = expr.replace(/=.*/g, "").trim();
    if (cleaned.length < 2) continue;
    try {
      const modeResult = detectMode(cleaned, tasks, kb);
      const mode = modeResult.mode;
      
      let res: AutoSolveResult | null = null;
      
      if (mode === "expand") {
        res = { mode: "expand", modeResult, algebraResult: expand(cleaned) };
      } else {
        res = { mode: "simplify", modeResult, algebraResult: smartSimplify(cleaned) };
      }

      // ── Learned Schema Fallback ──────────────────────────────────────────
      // If we got 0 interesting steps but there's a KB schema for this signature, use it!
      if (res.algebraResult && res.algebraResult.steps.length === 0 && kb) {
        const signature = getExpressionSignature(cleaned);
        const schema = kb.schemas.find(s => s.trigger.patterns.includes(signature) || s.subdomain === signature);
        if (schema) {
          res.algebraResult = solveBySchema(cleaned, schema);
          res.modeResult = {
            ...modeResult,
            source: "kb",
            reasoning: `تم الحل باستخدام قاعدة تعلمتها مسبقاً لهذا النمط (${signature})`
          };
        }
      }

      if (res) results.push(res);
    } catch (e) {
      console.warn("autoSolve expr error:", expr, e);
    }
  }

  return results;
}

// ── Coefficient extraction helpers ───────────────────────────────────────────

interface LinearCoeffs { a: number; b: number; variable: string; }
interface QuadCoeffs { a: number; b: number; c: number; variable: string; }

function extractLinearCoeffs(node: ASTNode): LinearCoeffs | null {
  const vars = collectVars(node);
  if (vars.size > 1) return null;
  const variable = vars.size === 1 ? [...vars][0] : "x";
  const a = coeffOf(node, variable, 1);
  const b = constantTerm(node, variable);
  if (a === null || b === null) return null;
  return { a, b, variable };
}

function extractQuadraticCoeffs(node: ASTNode): QuadCoeffs | null {
  const vars = collectVars(node);
  if (vars.size > 1) return null;
  const variable = vars.size === 1 ? [...vars][0] : "x";

  // Evaluate at 4 points to detect degree and get coefficients
  const f = (x: number) => evalNum(node, variable, x);
  const f0 = f(0), f1 = f(1), f2 = f(2), f3 = f(3);
  if (f0 === null || f1 === null || f2 === null || f3 === null) return null;

  const c = f0;
  const a = (f2 - 2 * f1 + f0) / 2;
  const b = f1 - f0 - a;

  // Verify degree ≤ 2
  const pred = a * 9 + b * 3 + c;
  if (Math.abs(pred - f3) > 1e-6) return null;

  return { a: round(a, 9), b: round(b, 9), c: round(c, 9), variable };
}

function collectVars(node: ASTNode, out = new Set<string>()): Set<string> {
  switch (node.type) {
    case "variable": out.add(node.name); break;
    case "binaryOp": collectVars(node.left, out); collectVars(node.right, out); break;
    case "unaryOp": collectVars(node.operand, out); break;
    case "functionCall": node.args.forEach(a => collectVars(a, out)); break;
  }
  return out;
}

function evalNum(node: ASTNode, variable: string, value: number): number | null {
  switch (node.type) {
    case "number": return node.value;
    case "variable": return node.name === variable ? value : null;
    case "unaryOp": {
      const v = evalNum(node.operand, variable, value);
      return v === null ? null : -v;
    }
    case "binaryOp": {
      const l = evalNum(node.left, variable, value);
      const r = evalNum(node.right, variable, value);
      if (l === null || r === null) return null;
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return r === 0 ? null : l / r;
        case "^": return Math.pow(l, r);
      }
    }
    case "functionCall": {
      const args = node.args.map(a => evalNum(a, variable, value));
      if (args.some(a => a === null)) return null;
      const vals = args as number[];
      const fn = Math[node.name as keyof Math] as (n: number) => number;
      return fn ? fn(vals[0]) : null;
    }
  }
}

function coeffOf(node: ASTNode, variable: string, degree: number): number | null {
  const v0 = evalNum(node, variable, 0);
  const v1 = evalNum(node, variable, 1);
  if (v0 === null || v1 === null) return null;
  return round(v1 - v0, 10);
}

function constantTerm(node: ASTNode, variable: string): number | null {
  return evalNum(node, variable, 0);
}

function parseLinearEquation(eq: string) {
  const parts = eq.split("=");
  if (parts.length !== 2) return null;
  try {
    const lhs = safeParse(parts[0]);
    const rhs = safeParse(parts[1]);
    const combined = simplify({ type: "binaryOp", op: "-", left: lhs, right: rhs });
    const vars = collectVars(combined.output);
    if (vars.size !== 2 && vars.size !== 1) return null;
    const allVars = [...vars];
    const [xVar, yVar] = allVars.length === 2 ? allVars : [allVars[0], ""];
    const a = coeffOf(combined.output, xVar, 1);
    const b = yVar ? coeffOf(combined.output, yVar, 1) : 0;
    const c = constantTerm(combined.output, xVar);
    if (a === null || b === null || c === null) return null;
    return { a, b: b ?? 0, c: -(c ?? 0), vars: allVars };
  } catch {
    return null;
  }
}

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
