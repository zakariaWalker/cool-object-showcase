// ===== Algebra Rules (SOTA v2) =====
// Added: identités remarquables, factoring detection, like-term collection, neg-distribution

import { ASTNode, Rule } from "../types";

const num = (v: number): ASTNode => ({ type: "number", value: v });
const binOp = (op: "+" | "-" | "*" | "/" | "^", left: ASTNode, right: ASTNode): ASTNode => ({
  type: "binaryOp", op, left, right,
});
const varNode = (name: string): ASTNode => ({ type: "variable", name });

// ─── Structural helpers ───────────────────────────────────────────────────────

function isNum(n: ASTNode, v?: number): n is { type: "number"; value: number } {
  return n.type === "number" && (v === undefined || n.value === v);
}

function isSameVar(a: ASTNode, b: ASTNode): boolean {
  return a.type === "variable" && b.type === "variable" && a.name === b.name;
}

function getCoeff(node: ASTNode): { coeff: number; base: ASTNode } | null {
  // Returns coefficient and base for terms like 3x, -2x, x
  if (node.type === "variable") return { coeff: 1, base: node };
  if (node.type === "unaryOp" && node.operand.type === "variable") return { coeff: -1, base: node.operand };
  if (node.type === "binaryOp" && node.op === "*") {
    if (isNum(node.left) && node.right.type === "variable")
      return { coeff: node.left.value, base: node.right };
    if (isNum(node.right) && node.left.type === "variable")
      return { coeff: node.right.value, base: node.left };
  }
  return null;
}

function deepEqual(a: ASTNode, b: ASTNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const algebraRules: Rule[] = [

  // ═══════════════════════════════════════════════════════════
  // 1. IDENTITÉS REMARQUABLES (checked FIRST — highest priority)
  // ═══════════════════════════════════════════════════════════

  {
    id: "identity_sq_sum",
    name: "Carré d'une somme",
    description: "(a+b)² → a² + 2ab + b²",
    domain: "algebra",
    apply: (node) => {
      // Match (a+b)^2
      if (node.type !== "binaryOp" || node.op !== "^") return null;
      if (!isNum(node.right, 2)) return null;
      if (node.left.type !== "binaryOp" || node.left.op !== "+") return null;
      const a = node.left.left, b = node.left.right;
      return binOp("+",
        binOp("+",
          binOp("^", a, num(2)),
          binOp("*", binOp("*", num(2), a), b)
        ),
        binOp("^", b, num(2))
      );
    },
  },

  {
    id: "identity_sq_diff",
    name: "Carré d'une différence",
    description: "(a-b)² → a² - 2ab + b²",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "^") return null;
      if (!isNum(node.right, 2)) return null;
      if (node.left.type !== "binaryOp" || node.left.op !== "-") return null;
      const a = node.left.left, b = node.left.right;
      return binOp("-",
        binOp("+",
          binOp("^", a, num(2)),
          binOp("^", b, num(2))
        ),
        binOp("*", binOp("*", num(2), a), b)
      );
    },
  },

  {
    id: "identity_diff_sq",
    name: "Différence de carrés",
    description: "(a+b)(a-b) → a² - b²",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      const L = node.left, R = node.right;
      if (L.type !== "binaryOp" || R.type !== "binaryOp") return null;
      // (a+b)(a-b) or (a-b)(a+b)
      const isSum = (n: ASTNode) => n.type === "binaryOp" && n.op === "+";
      const isDiff = (n: ASTNode) => n.type === "binaryOp" && n.op === "-";
      let sum: ASTNode | null = null, diff: ASTNode | null = null;
      if (isSum(L) && isDiff(R)) { sum = L; diff = R; }
      else if (isDiff(L) && isSum(R)) { sum = R; diff = L; }
      if (!sum || !diff) return null;
      const s = sum as any, d = diff as any;
      if (deepEqual(s.left, d.left) && deepEqual(s.right, d.right)) {
        return binOp("-", binOp("^", s.left, num(2)), binOp("^", s.right, num(2)));
      }
      return null;
    },
  },

  {
    id: "identity_product_binomials",
    name: "Produit de deux binômes",
    description: "(a+b)(c+d) → ac + ad + bc + bd",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      const L = node.left, R = node.right;
      const isAddSub = (n: ASTNode) =>
        n.type === "binaryOp" && (n.op === "+" || n.op === "-");
      if (!isAddSub(L) || !isAddSub(R)) return null;
      const l = L as any, r = R as any;
      const ac = binOp("*", l.left, r.left);
      const ad = l.op === "+" && r.op === "+"
        ? binOp("+", ac, binOp("*", l.left, r.right))
        : binOp(l.op === "-" ? "-" : "+", ac, binOp("*", l.left, r.right));
      const bc = binOp("*", l.right, r.left);
      const bd = binOp("*", l.right, r.right);
      // Build (ac ± ad) ± (bc ± bd)
      const left = l.op === "+"
        ? binOp(r.op === "+" ? "+" : "-", binOp("*", l.left, r.left), binOp("*", l.left, r.right))
        : binOp(r.op === "+" ? "-" : "+", binOp("*", l.left, r.left), binOp("*", l.left, r.right));
      const right = l.op === "+"
        ? binOp(r.op === "+" ? "+" : "-", binOp("*", l.right, r.left), binOp("*", l.right, r.right))
        : binOp(r.op === "+" ? "-" : "+", binOp("*", l.right, r.left), binOp("*", l.right, r.right));
      return binOp("+", left, right);
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 2. DISTRIBUTION
  // ═══════════════════════════════════════════════════════════

  {
    id: "distribute_mul_add",
    name: "Distributivité (addition)",
    description: "a(b + c) → ab + ac",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      if (node.right.type === "binaryOp" && node.right.op === "+") {
        return binOp("+",
          binOp("*", node.left, node.right.left),
          binOp("*", node.left, node.right.right)
        );
      }
      if (node.left.type === "binaryOp" && node.left.op === "+") {
        return binOp("+",
          binOp("*", node.left.left, node.right),
          binOp("*", node.left.right, node.right)
        );
      }
      return null;
    },
  },

  {
    id: "distribute_mul_sub",
    name: "Distributivité (soustraction)",
    description: "a(b - c) → ab - ac",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      if (node.right.type === "binaryOp" && node.right.op === "-") {
        return binOp("-",
          binOp("*", node.left, node.right.left),
          binOp("*", node.left, node.right.right)
        );
      }
      if (node.left.type === "binaryOp" && node.left.op === "-") {
        return binOp("-",
          binOp("*", node.left.left, node.right),
          binOp("*", node.left.right, node.right)
        );
      }
      return null;
    },
  },

  {
    id: "distribute_neg",
    name: "Distribution du signe négatif",
    description: "-(a + b) → -a - b",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "unaryOp") return null;
      const op = node.operand;
      if (op.type === "binaryOp" && op.op === "+") {
        return binOp("-",
          { type: "unaryOp", op: "-", operand: op.left },
          op.right
        );
      }
      if (op.type === "binaryOp" && op.op === "-") {
        return binOp("+",
          { type: "unaryOp", op: "-", operand: op.left },
          op.right
        );
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 3. LIKE-TERM COLLECTION
  // ═══════════════════════════════════════════════════════════

  {
    id: "collect_like_terms",
    name: "Réduction des termes semblables",
    description: "ax + bx → (a+b)x",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp") return null;
      if (node.op !== "+" && node.op !== "-") return null;
      const left = getCoeff(node.left);
      const right = getCoeff(node.right);
      if (!left || !right) return null;
      if (!deepEqual(left.base, right.base)) return null;
      const newCoeff = node.op === "+" ? left.coeff + right.coeff : left.coeff - right.coeff;
      if (newCoeff === 0) return num(0);
      if (newCoeff === 1) return left.base;
      if (newCoeff === -1) return { type: "unaryOp", op: "-", operand: left.base };
      return binOp("*", num(newCoeff), left.base);
    },
  },

  {
    id: "collect_constants",
    name: "Regroupement des constantes",
    description: "n + (m + x) → (n+m) + x",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "+") return null;
      // (a + b) + c where a, b are numbers
      if (node.left.type === "binaryOp" && (node.left.op === "+" || node.left.op === "-")) {
        if (isNum(node.left.left) && isNum(node.right)) {
          const combined = node.left.op === "+"
            ? node.left.left.value + node.right.value
            : node.left.left.value - node.right.value;
          return binOp("+", num(combined), node.left.right);
        }
        if (isNum(node.left.right) && isNum(node.right)) {
          const combined = node.left.op === "+"
            ? node.left.right.value + node.right.value
            : -node.left.right.value + node.right.value;
          return binOp(node.left.op, node.left.left, num(combined));
        }
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 4. ARITHMETIC FOLDING
  // ═══════════════════════════════════════════════════════════

  {
    id: "fold_add",
    name: "Calcul (addition)",
    description: "n + m → résultat",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "+") return null;
      if (isNum(node.left) && isNum(node.right))
        return num(node.left.value + node.right.value);
      return null;
    },
  },
  {
    id: "fold_sub",
    name: "Calcul (soustraction)",
    description: "n - m → résultat",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "-") return null;
      if (isNum(node.left) && isNum(node.right))
        return num(node.left.value - node.right.value);
      return null;
    },
  },
  {
    id: "fold_mul",
    name: "Calcul (multiplication)",
    description: "n × m → résultat",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      if (isNum(node.left) && isNum(node.right))
        return num(node.left.value * node.right.value);
      return null;
    },
  },
  {
    id: "fold_div",
    name: "Calcul (division)",
    description: "n / m → résultat",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "/") return null;
      if (isNum(node.left) && isNum(node.right) && node.right.value !== 0) {
        const r = node.left.value / node.right.value;
        if (Number.isInteger(r)) return num(r);
      }
      return null;
    },
  },
  {
    id: "fold_pow",
    name: "Calcul (puissance)",
    description: "n^m → résultat",
    domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "^") return null;
      if (isNum(node.left) && isNum(node.right))
        return num(Math.pow(node.left.value, node.right.value));
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════
  // 5. IDENTITY SIMPLIFICATIONS
  // ═══════════════════════════════════════════════════════════

  { id: "mul_by_one", name: "Élément neutre ×", description: "a × 1 → a", domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      if (isNum(node.left, 1)) return node.right;
      if (isNum(node.right, 1)) return node.left;
      return null;
    },
  },
  { id: "mul_by_zero", name: "Multiplication par 0", description: "a × 0 → 0", domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "*") return null;
      if (isNum(node.left, 0) || isNum(node.right, 0)) return num(0);
      return null;
    },
  },
  { id: "add_zero", name: "Élément neutre +", description: "a + 0 → a", domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "+") return null;
      if (isNum(node.left, 0)) return node.right;
      if (isNum(node.right, 0)) return node.left;
      return null;
    },
  },
  { id: "sub_zero", name: "Soustraction de zéro", description: "a - 0 → a", domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "-") return null;
      if (isNum(node.right, 0)) return node.left;
      return null;
    },
  },
  { id: "pow_one", name: "Exposant 1", description: "a^1 → a", domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "^") return null;
      if (isNum(node.right, 1)) return node.left;
      return null;
    },
  },
  { id: "pow_zero", name: "Exposant 0", description: "a^0 → 1", domain: "algebra",
    apply: (node) => {
      if (node.type !== "binaryOp" || node.op !== "^") return null;
      if (isNum(node.right, 0)) return num(1);
      return null;
    },
  },
  { id: "double_neg", name: "Double négation", description: "-(-a) → a", domain: "algebra",
    apply: (node) => {
      if (node.type !== "unaryOp") return null;
      if (node.operand.type === "unaryOp") return node.operand.operand;
      return null;
    },
  },
  { id: "neg_num", name: "Négation numérique", description: "-n → résultat", domain: "algebra",
    apply: (node) => {
      if (node.type !== "unaryOp") return null;
      if (node.operand.type === "number") return num(-node.operand.value);
      return null;
    },
  },
];
