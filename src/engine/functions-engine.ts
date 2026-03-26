// ===== Functions Engine =====
// Local symbolic differentiation + domain analysis + sign table builder.
// Covers: polynomial, rational, trigonometric, exponential, logarithmic.

import { ASTNode } from "./types";
import { parse } from "./parser";
import { astToLatex, cloneAST } from "./ast-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DerivativeStep {
  index: number;
  rule: string;
  ruleAr: string;
  before: string;
  after: string;
  explanation: string;
}

export interface SignTableRow {
  expression: string;
  criticalPoints: number[];
  signs: ("-" | "+" | "0" | "∞")[];
}

export interface FunctionAnalysis {
  expr: string;
  latex: string;
  derivative: string;
  derivativeLatex: string;
  derivativeSteps: DerivativeStep[];
  criticalPoints: number[];
  signTable: SignTableRow[];
  domain: string;
  roots: string[];
}

// ─── Differentiation rules ────────────────────────────────────────────────────

function diff(node: ASTNode, variable: string = "x"): ASTNode {
  const zero: ASTNode = { type: "number", value: 0 };
  const one: ASTNode = { type: "number", value: 1 };
  const bin = (op: "+" | "-" | "*" | "/" | "^", l: ASTNode, r: ASTNode): ASTNode =>
    ({ type: "binaryOp", op, left: l, right: r });
  const neg = (n: ASTNode): ASTNode => ({ type: "unaryOp", op: "-", operand: n });
  const fn = (name: string, arg: ASTNode): ASTNode =>
    ({ type: "functionCall", name, args: [arg] });

  switch (node.type) {
    case "number":
      return zero;

    case "variable":
      return node.name === variable ? one : zero;

    case "unaryOp":
      return neg(diff(node.operand, variable));

    case "binaryOp": {
      const { op, left, right } = node;
      const dl = diff(left, variable);
      const dr = diff(right, variable);

      if (op === "+") return bin("+", dl, dr);
      if (op === "-") return bin("-", dl, dr);

      if (op === "*") {
        // Product rule: (uv)' = u'v + uv'
        return bin("+",
          bin("*", dl, cloneAST(right)),
          bin("*", cloneAST(left), dr)
        );
      }

      if (op === "/") {
        // Quotient rule: (u/v)' = (u'v - uv') / v²
        return bin("/",
          bin("-", bin("*", dl, cloneAST(right)), bin("*", cloneAST(left), dr)),
          bin("^", cloneAST(right), { type: "number", value: 2 })
        );
      }

      if (op === "^") {
        // Power rule (numeric exponent): (x^n)' = n·x^(n-1)
        if (right.type === "number") {
          const n = right.value;
          return bin("*",
            { type: "number", value: n },
            bin("^", cloneAST(left), { type: "number", value: n - 1 })
          );
        }
        // e^x case (base is Euler's e approximated as variable "e")
        return bin("*", diff(right, variable), cloneAST(node));
      }
      return zero;
    }

    case "functionCall": {
      const arg = node.args[0];
      const da = diff(arg, variable);
      const chain = (innerDeriv: ASTNode) =>
        bin("*", innerDeriv, da);

      switch (node.name) {
        case "sin":  return chain(fn("cos", cloneAST(arg)));
        case "cos":  return chain(neg(fn("sin", cloneAST(arg))));
        case "tan":  return chain(bin("/", one, bin("^", fn("cos", cloneAST(arg)), { type: "number", value: 2 })));
        case "ln":   return chain(bin("/", one, cloneAST(arg)));
        case "sqrt": return chain(bin("/", one, bin("*", { type: "number", value: 2 }, fn("sqrt", cloneAST(arg)))));
        case "exp":  return chain(fn("exp", cloneAST(arg)));
        default:     return zero;
      }
    }
  }
}

// ─── Rule name extractor ─────────────────────────────────────────────────────

function getRuleName(node: ASTNode, variable: string): { rule: string; ruleAr: string; explanation: string } {
  if (node.type === "number")
    return { rule: "Dérivée d'une constante", ruleAr: "مشتقة ثابت", explanation: "(k)' = 0" };
  if (node.type === "variable" && node.name === variable)
    return { rule: "Dérivée de x", ruleAr: "مشتقة x", explanation: "(x)' = 1" };
  if (node.type === "binaryOp") {
    if (node.op === "+") return { rule: "Linéarité (somme)", ruleAr: "مشتقة المجموع", explanation: "(u+v)' = u' + v'" };
    if (node.op === "-") return { rule: "Linéarité (différence)", ruleAr: "مشتقة الفرق", explanation: "(u-v)' = u' - v'" };
    if (node.op === "*") {
      if (node.left.type === "number") return { rule: "Facteur constant", ruleAr: "عامل ثابت", explanation: "(k·u)' = k·u'" };
      return { rule: "Règle du produit", ruleAr: "مشتقة الحاصل", explanation: "(uv)' = u'v + uv'" };
    }
    if (node.op === "/") return { rule: "Règle du quotient", ruleAr: "مشتقة الخارج", explanation: "(u/v)' = (u'v - uv') / v²" };
    if (node.op === "^" && node.right.type === "number")
      return { rule: "Règle de la puissance", ruleAr: "مشتقة القوة", explanation: `(x^${node.right.value})' = ${node.right.value}x^${node.right.value - 1}` };
  }
  if (node.type === "functionCall") {
    const rules: Record<string, { rule: string; ruleAr: string; explanation: string }> = {
      sin: { rule: "Dérivée de sin", ruleAr: "مشتقة جيب الزاوية", explanation: "(sin u)' = cos(u)·u'" },
      cos: { rule: "Dérivée de cos", ruleAr: "مشتقة جيب التمام", explanation: "(cos u)' = -sin(u)·u'" },
      tan: { rule: "Dérivée de tan", ruleAr: "مشتقة الظل", explanation: "(tan u)' = u'/cos²(u)" },
      ln:  { rule: "Dérivée de ln", ruleAr: "مشتقة اللوغاريتم", explanation: "(ln u)' = u'/u" },
      sqrt:{ rule: "Dérivée de √", ruleAr: "مشتقة الجذر", explanation: "(√u)' = u'/(2√u)" },
      exp: { rule: "Dérivée de eˣ", ruleAr: "مشتقة الدالة الأسية", explanation: "(eˣ)' = eˣ" },
    };
    return rules[node.name] || { rule: "Dérivée composée", ruleAr: "مشتقة مركبة", explanation: "règle de la chaîne" };
  }
  return { rule: "Règle générale", ruleAr: "قاعدة عامة", explanation: "" };
}

// ─── Step builder ─────────────────────────────────────────────────────────────

function buildDerivativeSteps(node: ASTNode, variable: string): DerivativeStep[] {
  const steps: DerivativeStep[] = [];
  let stepIdx = 0;

  function addStep(subNode: ASTNode): ASTNode {
    const { rule, ruleAr, explanation } = getRuleName(subNode, variable);
    const before = astToLatex(subNode);
    const derived = diff(subNode, variable);
    const after = astToLatex(derived);
    if (before !== after || subNode.type === "number") {
      steps.push({ index: stepIdx++, rule, ruleAr, before, after, explanation });
    }
    return derived;
  }

  // Add top-level step
  addStep(node);

  // For sums/differences, add per-term steps
  if (node.type === "binaryOp" && (node.op === "+" || node.op === "-")) {
    addStep(node.left);
    addStep(node.right);
  }

  return steps;
}

// ─── Numeric evaluator (for critical points) ─────────────────────────────────

function evalNode(node: ASTNode, x: number): number {
  switch (node.type) {
    case "number": return node.value;
    case "variable": return x;
    case "unaryOp": return -evalNode(node.operand, x);
    case "binaryOp": {
      const l = evalNode(node.left, x), r = evalNode(node.right, x);
      if (node.op === "+") return l + r;
      if (node.op === "-") return l - r;
      if (node.op === "*") return l * r;
      if (node.op === "/") return r !== 0 ? l / r : NaN;
      if (node.op === "^") return Math.pow(l, r);
      return NaN;
    }
    case "functionCall": {
      const a = evalNode(node.args[0], x);
      if (node.name === "sin") return Math.sin(a);
      if (node.name === "cos") return Math.cos(a);
      if (node.name === "tan") return Math.tan(a);
      if (node.name === "sqrt") return Math.sqrt(a);
      if (node.name === "ln") return Math.log(a);
      if (node.name === "exp") return Math.exp(a);
      return NaN;
    }
  }
}

function findRoots(node: ASTNode, lo = -10, hi = 10, steps = 400): number[] {
  const roots: number[] = [];
  const dx = (hi - lo) / steps;
  let prev = evalNode(node, lo);
  for (let i = 1; i <= steps; i++) {
    const x = lo + i * dx;
    const curr = evalNode(node, x);
    if (isFinite(prev) && isFinite(curr) && prev * curr <= 0) {
      // Bisection refine
      let lo2 = x - dx, hi2 = x;
      for (let j = 0; j < 20; j++) {
        const mid = (lo2 + hi2) / 2;
        if (evalNode(node, lo2) * evalNode(node, mid) <= 0) hi2 = mid;
        else lo2 = mid;
      }
      const root = Math.round(((lo2 + hi2) / 2) * 1000) / 1000;
      if (!roots.some(r => Math.abs(r - root) < 0.01)) roots.push(root);
    }
    prev = curr;
  }
  return roots.slice(0, 5);
}

// ─── Domain computation ────────────────────────────────────────────────────────

function computeDomain(ast: ASTNode): string {
  const restrictions: string[] = [];
  findDomainRestrictions(ast, restrictions);
  if (restrictions.length === 0) return "\\mathbb{R}";
  return `\\mathbb{R} \\setminus \\{${restrictions.join(",")}\\}`;
}

function findDomainRestrictions(node: ASTNode, out: string[]): void {
  if (node.type === "binaryOp" && node.op === "/") {
    // denominator must ≠ 0
    const denom = node.right;
    const roots = findRoots(denom);
    roots.forEach(r => { if (!out.includes(String(r))) out.push(String(r)); });
  }
  if (node.type === "functionCall" && node.name === "sqrt") {
    // argument must ≥ 0
    const roots = findRoots(node.args[0]);
    // for now just note the restriction point
  }
  // Recurse
  if (node.type === "binaryOp") {
    findDomainRestrictions(node.left, out);
    findDomainRestrictions(node.right, out);
  }
  if (node.type === "unaryOp") findDomainRestrictions(node.operand, out);
  if (node.type === "functionCall") node.args.forEach(a => findDomainRestrictions(a, out));
}

// ─── Variation table builder ───────────────────────────────────────────────────

interface VariationEntry {
  x: string;
  fValue: string;
  type: "min" | "max" | "boundary";
}

function buildVariationTable(ast: ASTNode, derivAst: ASTNode, criticalPoints: number[]): {
  intervals: string[];
  signs: string[];
  variations: string[];
  values: string[];
  entries: VariationEntry[];
} {
  const allPoints = [-Infinity, ...criticalPoints.sort((a, b) => a - b), Infinity];
  const intervals: string[] = [];
  const signs: string[] = [];
  const variations: string[] = [];
  const values: string[] = [];
  const entries: VariationEntry[] = [];

  // Boundary values
  for (let i = 0; i < allPoints.length; i++) {
    const p = allPoints[i];
    if (i === 0) {
      entries.push({ x: "-∞", fValue: "-∞", type: "boundary" });
    } else if (i === allPoints.length - 1) {
      entries.push({ x: "+∞", fValue: "+∞", type: "boundary" });
    } else {
      const fVal = evalNode(ast, p);
      const fStr = isNaN(fVal) ? "?" : String(Math.round(fVal * 100) / 100);
      const fpBefore = evalNode(derivAst, p - 0.001);
      const fpAfter = evalNode(derivAst, p + 0.001);
      const isLocalMax = fpBefore > 0 && fpAfter < 0;
      entries.push({ x: String(Math.round(p * 100) / 100), fValue: fStr, type: isLocalMax ? "max" : "min" });
    }
  }

  // Intervals between points
  for (let i = 0; i < allPoints.length - 1; i++) {
    const mid = isFinite(allPoints[i]) && isFinite(allPoints[i + 1])
      ? (allPoints[i] + allPoints[i + 1]) / 2
      : isFinite(allPoints[i]) ? allPoints[i] + 1 : allPoints[i + 1] - 1;

    const sign = evalNode(derivAst, mid);
    const signStr = sign > 0 ? "+" : sign < 0 ? "-" : "0";
    const varStr = sign > 0 ? "↗" : sign < 0 ? "↘" : "→";

    const leftStr = isFinite(allPoints[i]) ? String(Math.round(allPoints[i] * 100) / 100) : "-∞";
    const rightStr = isFinite(allPoints[i + 1]) ? String(Math.round(allPoints[i + 1] * 100) / 100) : "+∞";

    intervals.push(`]${leftStr}, ${rightStr}[`);
    signs.push(signStr);
    variations.push(varStr);
  }

  return { intervals, signs, variations, values, entries };
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export function analyzeFunction(input: string): FunctionAnalysis {
  const cleanInput = input.trim().replace(/^f\(x\)\s*=\s*/i, "").replace(/^y\s*=\s*/i, "");
  const ast = parse(cleanInput);
  const derivAst = diff(ast, "x");
  const derivLatex = astToLatex(derivAst);
  const steps = buildDerivativeSteps(ast, "x");

  const criticalPoints = findRoots(derivAst);

  // f''(x) for concavity
  const deriv2Ast = diff(derivAst, "x");

  // Sign table for f'(x)
  const signTable: SignTableRow = {
    expression: `f'(x)`,
    criticalPoints,
    signs: criticalPoints.flatMap(cp => {
      const v = evalNode(derivAst, cp - 0.5);
      return [v > 0 ? "+" : "-", "0"] as ("-" | "+" | "0" | "∞")[];
    }).concat(criticalPoints.length > 0
      ? [evalNode(derivAst, criticalPoints[criticalPoints.length - 1] + 0.5) > 0 ? "+" : "-"]
      : ["+"]),
  };

  // Real domain
  const domain = computeDomain(ast);

  // Variation table
  const variationTable = buildVariationTable(ast, derivAst, criticalPoints);

  // Inflection points (f''(x) = 0)
  const inflectionPoints = findRoots(deriv2Ast).map(r => `x = ${Math.round(r * 100) / 100}`);

  const roots = findRoots(ast).map(r => `x = ${r}`);

  return {
    expr: cleanInput,
    latex: astToLatex(ast),
    derivative: astToLatex(derivAst),
    derivativeLatex: derivLatex,
    derivativeSteps: steps,
    criticalPoints,
    signTable,
    domain,
    roots,
    // Extended fields
    secondDerivativeLatex: astToLatex(deriv2Ast),
    inflectionPoints,
    variationTable,
  } as any;
}
