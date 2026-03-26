// ===== Factoring Engine =====
// Inverse of expand. Strategies:
//   1. Common factor (GCF): 6x+4 → 2(3x+2)
//   2. Difference of squares: x²-9 → (x+3)(x-3)
//   3. Perfect square trinomial: x²+6x+9 → (x+3)²
//   4. Trinomial: x²+5x+6 → (x+2)(x+3)
//   5. Factor by grouping: ax+ay+bx+by → (a+b)(x+y)

import { parse } from "./parser";
import { ASTNode } from "./types";
import { astToString, astToLatex } from "./ast-utils";
import { simplify } from "./algebra-engine";

// ── Result types ─────────────────────────────────────────────────────────────

export interface FactorStep {
  strategy: string;
  strategyAr: string;
  description: string;
  latex: string;
}

export interface FactorResult {
  input: string;
  inputLatex: string;
  output: string;
  outputLatex: string;
  factored: boolean;
  steps: FactorStep[];
  factors: string[];
}

// ── GCD for integers ─────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

// ── Polynomial coefficient extraction ────────────────────────────────────────
// Extracts {a, b, c} from ax² + bx + c (single variable, degree ≤ 2)

interface PolyCoeffs {
  a: number; // coeff of x²
  b: number; // coeff of x
  c: number; // constant
  variable: string;
  valid: boolean;
}

function extractQuadraticCoeffs(input: string): PolyCoeffs {
  const empty: PolyCoeffs = { a: 0, b: 0, c: 0, variable: "x", valid: false };
  try {
    // Collect all terms by evaluating numerically at multiple points
    // Use symbolic coefficient extraction instead
    const ast = parse(input);
    return extractFromAST(ast) || empty;
  } catch {
    return empty;
  }
}

function extractFromAST(node: ASTNode, sign = 1): PolyCoeffs | null {
  // We'll walk the tree and collect coefficients for each power of the variable
  const vars = collectVariables(node);
  if (vars.size > 1) return null; // multivariate – not handled
  const variable = vars.size === 1 ? [...vars][0] : "x";

  try {
    // Evaluate at x=0,1,2 to extract coefficients via Lagrange
    const f0 = evalAt(node, variable, 0);
    const f1 = evalAt(node, variable, 1);
    const f2 = evalAt(node, variable, 2);

    if (f0 === null || f1 === null || f2 === null) return null;

    // For ax²+bx+c: f(0)=c, f(1)=a+b+c, f(2)=4a+2b+c
    const c = f0;
    const apc = f1 - f0;    // a+b
    const abpc = f2 - f0;   // 4a+2b

    // From: a+b = f1-c, 4a+2b = f2-c
    // 2(a+b) = 2a+2b, so 4a+2b - 2(a+b) = 2a => a = (f2-c-2(f1-c))/2
    const a = (abpc - 2 * apc) / 2;
    const b = apc - a;

    // Validate it's really at most degree 2
    const f3 = evalAt(node, variable, 3);
    if (f3 === null) return null;
    const predicted = a * 9 + b * 3 + c;
    if (Math.abs(predicted - f3) > 1e-9) return null; // degree > 2

    // Round to nearest integer if very close
    const ra = Math.round(a * 1e9) / 1e9;
    const rb = Math.round(b * 1e9) / 1e9;
    const rc = Math.round(c * 1e9) / 1e9;

    // Check they're all integers (rational factoring only)
    if (!Number.isInteger(ra) || !Number.isInteger(rb) || !Number.isInteger(rc)) {
      return { a: ra, b: rb, c: rc, variable, valid: true };
    }

    return { a: ra, b: rb, c: rc, variable, valid: true };
  } catch {
    return null;
  }
}

function collectVariables(node: ASTNode, out = new Set<string>()): Set<string> {
  switch (node.type) {
    case "variable": out.add(node.name); break;
    case "binaryOp": collectVariables(node.left, out); collectVariables(node.right, out); break;
    case "unaryOp": collectVariables(node.operand, out); break;
    case "functionCall": node.args.forEach(a => collectVariables(a, out)); break;
  }
  return out;
}

function evalAt(node: ASTNode, variable: string, value: number): number | null {
  switch (node.type) {
    case "number": return node.value;
    case "variable": return node.name === variable ? value : null;
    case "unaryOp": {
      const v = evalAt(node.operand, variable, value);
      return v === null ? null : -v;
    }
    case "binaryOp": {
      const l = evalAt(node.left, variable, value);
      const r = evalAt(node.right, variable, value);
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
      const args = node.args.map(a => evalAt(a, variable, value));
      if (args.some(a => a === null)) return null;
      const vals = args as number[];
      switch (node.name) {
        case "sqrt": return Math.sqrt(vals[0]);
        case "abs": return Math.abs(vals[0]);
        default: return null;
      }
    }
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatCoeff(n: number, isFirst = false): string {
  if (n === 1) return isFirst ? "" : "+";
  if (n === -1) return "-";
  if (n >= 0) return isFirst ? String(n) : `+${n}`;
  return String(n);
}

function formatPoly(a: number, b: number, c: number, v: string): string {
  let terms: string[] = [];
  if (a !== 0) terms.push(a === 1 ? `${v}^2` : a === -1 ? `-${v}^2` : `${a}${v}^2`);
  if (b !== 0) terms.push(b === 1 ? `+${v}` : b === -1 ? `-${v}` : b > 0 ? `+${b}${v}` : `${b}${v}`);
  if (c !== 0) terms.push(c > 0 ? `+${c}` : String(c));
  return terms.join("").replace(/^\+/, "") || "0";
}

function formatPolyLatex(a: number, b: number, c: number, v: string): string {
  let terms: string[] = [];
  if (a !== 0) terms.push(a === 1 ? `${v}^{2}` : a === -1 ? `-${v}^{2}` : `${a}${v}^{2}`);
  if (b !== 0) terms.push(b === 1 ? `+${v}` : b === -1 ? `-${v}` : b > 0 ? `+${b}${v}` : `${b}${v}`);
  if (c !== 0) terms.push(c > 0 ? `+${c}` : String(c));
  return terms.join("").replace(/^\+/, "") || "0";
}

// ── Strategy 1: GCF ──────────────────────────────────────────────────────────

function tryGCF(coeffs: PolyCoeffs, steps: FactorStep[]): string | null {
  const { a, b, c, variable } = coeffs;
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) return null;

  const nonZero = [a, b, c].filter(v => v !== 0);
  if (nonZero.length < 2) return null;

  const g = nonZero.reduce((acc, v) => gcd(acc, Math.abs(v)));
  if (g <= 1) return null;

  // Determine sign of GCF (positive)
  const na = a / g, nb = b / g, nc = c / g;

  const inner = formatPoly(na, nb, nc, variable);
  const result = `${g}(${inner})`;

  steps.push({
    strategy: "gcf",
    strategyAr: "العامل المشترك الأكبر",
    description: `استخرج العامل المشترك الأكبر ${g} من جميع الحدود`,
    latex: `${g}\\left(${formatPolyLatex(na, nb, nc, variable)}\\right)`,
  });

  return result;
}

// ── Strategy 2: Difference of squares ────────────────────────────────────────

function tryDifferenceOfSquares(coeffs: PolyCoeffs, steps: FactorStep[]): string | null {
  const { a, b, c, variable } = coeffs;
  if (b !== 0) return null;
  if (a <= 0 || c >= 0) return null; // need a>0, c<0

  const sqrtA = Math.sqrt(a);
  const sqrtC = Math.sqrt(-c);
  if (!Number.isInteger(sqrtA) || !Number.isInteger(sqrtC)) return null;

  // a*x² - c_abs → (√a·x + √c_abs)(√a·x - √c_abs)
  const p = sqrtA === 1 ? variable : `${sqrtA}${variable}`;
  const result = `(${p}+${sqrtC})(${p}-${sqrtC})`;

  steps.push({
    strategy: "difference_of_squares",
    strategyAr: "فرق بين مربعين",
    description: `${a}${variable}² - ${-c} = (${p})² - (${sqrtC})² = (${p}+${sqrtC})(${p}-${sqrtC})`,
    latex: `\\left(${sqrtA === 1 ? variable : `${sqrtA}${variable}`}+${sqrtC}\\right)\\left(${sqrtA === 1 ? variable : `${sqrtA}${variable}`}-${sqrtC}\\right)`,
  });

  return result;
}

// ── Strategy 3: Perfect square trinomial ─────────────────────────────────────

function tryPerfectSquare(coeffs: PolyCoeffs, steps: FactorStep[]): string | null {
  const { a, b, c, variable } = coeffs;
  if (a <= 0 || c <= 0) return null;

  const sqrtA = Math.sqrt(a);
  const sqrtC = Math.sqrt(c);
  if (!Number.isInteger(sqrtA) || !Number.isInteger(sqrtC)) return null;

  // (√a·x ± √c)² = a·x² ± 2√a·√c·x + c
  const expected_b = 2 * sqrtA * sqrtC;
  if (Math.abs(b) !== expected_b) return null;

  const sign = b > 0 ? "+" : "-";
  const inner = sqrtA === 1 ? `${variable}${sign}${sqrtC}` : `${sqrtA}${variable}${sign}${sqrtC}`;
  const result = `(${inner})^2`;

  steps.push({
    strategy: "perfect_square",
    strategyAr: "مربع كامل",
    description: `${formatPoly(a, b, c, variable)} = (${inner})²`,
    latex: `\\left(${sqrtA === 1 ? variable : `${sqrtA}${variable}`}${sign === "+" ? "+" : "-"}${sqrtC}\\right)^{2}`,
  });

  return result;
}

// ── Strategy 4: Trinomial factoring (a=1) ────────────────────────────────────

function tryTrinomial(coeffs: PolyCoeffs, steps: FactorStep[]): string | null {
  const { a, b, c, variable } = coeffs;
  if (a !== 1) return null;
  if (!Number.isInteger(b) || !Number.isInteger(c)) return null;

  // Find integers p, q such that p+q=b and p*q=c
  for (let p = -Math.abs(c); p <= Math.abs(c); p++) {
    if (p === 0) continue;
    if (c % p !== 0) continue;
    const q = c / p;
    if (p + q === b) {
      const s1 = p >= 0 ? `+${p}` : String(p);
      const s2 = q >= 0 ? `+${q}` : String(q);
      const f1 = `(${variable}${s1})`;
      const f2 = `(${variable}${s2})`;
      const result = `${f1}${f2}`;

      steps.push({
        strategy: "trinomial",
        strategyAr: "تحليل حدودية ثلاثية",
        description: `نبحث عن عددين حاصل جمعهما ${b} وحاصل ضربهما ${c}: ${p} و ${q}`,
        latex: `\\left(${variable}${p >= 0 ? "+" : ""}${p}\\right)\\left(${variable}${q >= 0 ? "+" : ""}${q}\\right)`,
      });

      return result;
    }
  }
  return null;
}

// ── Strategy 5: General quadratic (a≠1) with AC method ───────────────────────

function tryACMethod(coeffs: PolyCoeffs, steps: FactorStep[]): string | null {
  const { a, b, c, variable } = coeffs;
  if (a === 0 || a === 1) return null;
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) return null;

  const ac = a * c;
  // Find p, q: p+q=b, p*q=ac
  for (let p = -Math.abs(ac); p <= Math.abs(ac); p++) {
    if (p === 0) continue;
    if (ac % p !== 0) continue;
    const q = ac / p;
    if (p + q === b) {
      // ax² + px + qx + c  →  group
      // ax²+px = x(ax+p), qx+c = (q/a)*(ax+c/q)... use exact GCF grouping
      const g1 = gcd(Math.abs(a), Math.abs(p));
      const g2 = gcd(Math.abs(q), Math.abs(c));

      const t1_a = a / g1, t1_b = p / g1;  // g1*(t1_a*x + t1_b)*x
      const t2_a = q / g2, t2_b = c / g2;  // g2*(t2_a*x + t2_b)

      if (t1_a === t2_a && t1_b === t2_b) {
        const innerStr = t1_b >= 0 ? `${t1_a}${variable}+${t1_b}` : `${t1_a}${variable}${t1_b}`;
        const outer1 = g1 > 1 ? `${g1}${variable}` : variable;
        const outer2 = g2 > 1 ? String(g2) : (g2 === 1 ? "" : `-1`);
        const outerStr = (g1 !== 1 || g2 !== 1)
          ? `(${outer1}${g2 >= 0 ? "+" : ""}${g2 === 1 ? "" : g2})`
          : `(${variable}+1)`;

        steps.push({
          strategy: "ac_method",
          strategyAr: "طريقة التحليل بالتجميع",
          description: `${a}×${c}=${ac}. نكتب ${b}${variable} = ${p}${variable}+${q}${variable} ثم نجمّع`,
          latex: `\\left(${innerStr}\\right)\\left(${outerStr.replace(/[()]/g, "")}\\right)`,
        });

        // Use quadratic formula to get exact factors for display
        const disc = b * b - 4 * a * c;
        if (disc >= 0 && Number.isInteger(Math.sqrt(disc))) {
          const sqrtD = Math.sqrt(disc);
          const r1 = (-b + sqrtD) / (2 * a);
          const r2 = (-b - sqrtD) / (2 * a);
          if (Number.isInteger(r1) && Number.isInteger(r2)) {
            const s1 = -r1 >= 0 ? `+${-r1}` : String(-r1);
            const s2 = -r2 >= 0 ? `+${-r2}` : String(-r2);
            const result = a !== 1 ? `${a}(${variable}${s1})(${variable}${s2})` : `(${variable}${s1})(${variable}${s2})`;
            steps[steps.length - 1].latex = a !== 1
              ? `${a}\\left(${variable}${r1 <= 0 ? "+" : ""}${-r1}\\right)\\left(${variable}${r2 <= 0 ? "+" : ""}${-r2}\\right)`
              : `\\left(${variable}${r1 <= 0 ? "+" : ""}${-r1}\\right)\\left(${variable}${r2 <= 0 ? "+" : ""}${-r2}\\right)`;
            return result;
          }
        }
        return `${a}(${variable}+${p / a})(${variable}+${q / a})`;
      }
      break;
    }
  }
  return null;
}

// ── Linear factoring ──────────────────────────────────────────────────────────

function tryLinear(coeffs: PolyCoeffs, steps: FactorStep[]): string | null {
  const { a, b, c, variable } = coeffs;
  if (a !== 0) return null; // not linear
  if (b === 0) return null;
  if (!Number.isInteger(b) || !Number.isInteger(c)) return null;

  const g = gcd(Math.abs(b), Math.abs(c));
  if (g > 1) {
    const nb = b / g, nc = c / g;
    const inner = nc >= 0
      ? `${nb === 1 ? "" : nb}${variable}+${nc}`
      : `${nb === 1 ? "" : nb}${variable}${nc}`;
    steps.push({
      strategy: "gcf_linear",
      strategyAr: "عامل مشترك (خطي)",
      description: `استخرج ${g} من ${b}${variable}${c >= 0 ? "+" : ""}${c}`,
      latex: `${g}\\left(${inner}\\right)`,
    });
    return `${g}(${inner})`;
  }
  return null;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function factor(input: string): FactorResult {
  const steps: FactorStep[] = [];
  let inputLatex = input;

  try {
    const ast = parse(input);
    inputLatex = astToLatex(ast);
  } catch { /* use raw string */ }

  const coeffs = extractQuadraticCoeffs(input);

  if (!coeffs.valid) {
    return {
      input, inputLatex, output: input, outputLatex: inputLatex,
      factored: false, steps: [], factors: [input],
    };
  }

  // Try each strategy in order
  let result: string | null = null;

  // Try GCF first, it may simplify for deeper factoring
  const gcfResult = tryGCF(coeffs, steps);
  if (gcfResult) {
    result = gcfResult;
    // After extracting GCF, try factoring the inner trinomial
    const gcfMatch = gcfResult.match(/^(\d+)\((.+)\)$/);
    if (gcfMatch) {
      const innerCoeffs = extractQuadraticCoeffs(gcfMatch[2]);
      if (innerCoeffs.valid && innerCoeffs.a !== 0) {
        const innerResult = tryDifferenceOfSquares(innerCoeffs, steps)
          || tryPerfectSquare(innerCoeffs, steps)
          || tryTrinomial(innerCoeffs, steps)
          || tryACMethod(innerCoeffs, steps);
        if (innerResult) {
          result = `${gcfMatch[1]}${innerResult}`;
        }
      }
    }
  }

  if (!result) {
    result = tryDifferenceOfSquares(coeffs, steps)
      || tryPerfectSquare(coeffs, steps)
      || tryTrinomial(coeffs, steps)
      || tryACMethod(coeffs, steps)
      || tryLinear(coeffs, steps);
  }

  if (!result) {
    return {
      input, inputLatex, output: input, outputLatex: inputLatex,
      factored: false, steps: [], factors: [input],
    };
  }

  // Extract list of factors from result string
  const factors = result
    .split(/(?<=\))(?=[\(0-9])/)
    .filter(f => f.trim().length > 0);

  // Build latex for final result
  const outputLatex = steps.length > 0
    ? steps[steps.length - 1].latex
    : result;

  return {
    input, inputLatex, output: result, outputLatex,
    factored: true, steps, factors,
  };
}
