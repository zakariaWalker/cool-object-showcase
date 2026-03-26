// ===== AST Utilities =====
// Deep clone, equality check, pretty print, LaTeX render

import { ASTNode } from "./types";

export function cloneAST(node: ASTNode): ASTNode {
  return JSON.parse(JSON.stringify(node));
}

export function astEqual(a: ASTNode, b: ASTNode): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Convert AST to human-readable string */
export function astToString(node: ASTNode): string {
  switch (node.type) {
    case "number":
      return node.value < 0 ? `(${node.value})` : String(node.value);
    case "variable":
      return node.name;
    case "unaryOp":
      return `(-${astToString(node.operand)})`;
    case "binaryOp": {
      const l = astToString(node.left);
      const r = astToString(node.right);
      if (node.op === "^") return `${l}^${r}`;
      if (node.op === "*") {
        // Pretty: 3x instead of 3*x
        if (node.left.type === "number" && node.right.type === "variable") {
          return `${l}${r}`;
        }
        return `${l} * ${r}`;
      }
      return `${l} ${node.op} ${r}`;
    }
    case "functionCall":
      return `${node.name}(${node.args.map(astToString).join(", ")})`;
  }
}

/** Convert AST to LaTeX string */
export function astToLatex(node: ASTNode): string {
  switch (node.type) {
    case "number":
      return String(node.value);
    case "variable":
      return node.name;
    case "unaryOp":
      return `-${astToLatex(node.operand)}`;
    case "binaryOp": {
      const l = astToLatex(node.left);
      const r = astToLatex(node.right);
      switch (node.op) {
        case "+": return `${l} + ${r}`;
        case "-": return `${l} - ${r}`;
        case "*": {
          // Smart multiplication rendering
          if (node.left.type === "number" && node.right.type === "variable") {
            return `${l}${r}`;
          }
          if (node.left.type === "number" && node.right.type === "binaryOp") {
            return `${l}(${r})`;
          }
          return `${l} \\cdot ${r}`;
        }
        case "/": return `\\frac{${l}}{${r}}`;
        case "^": return `${needsParens(node.left) ? `(${l})` : l}^{${r}}`;
      }
    }
    case "functionCall": {
      const funcMap: Record<string, string> = {
        sin: "\\sin", cos: "\\cos", tan: "\\tan",
        sqrt: "\\sqrt", ln: "\\ln", log: "\\log", exp: "\\exp",
      };
      const name = funcMap[node.name] || node.name;
      if (node.name === "sqrt") {
        return `${name}{${node.args.map(astToLatex).join(", ")}}`;
      }
      return `${name}\\left(${node.args.map(astToLatex).join(", ")}\\right)`;
    }
  }
}

function needsParens(node: ASTNode): boolean {
  return node.type === "binaryOp" && (node.op === "+" || node.op === "-");
}
