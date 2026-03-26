// ===== Rule Engine =====
// Applies transformation rules to AST nodes, recording each step

import { ASTNode, Rule, RuleApplication, Step } from "../types";
import { cloneAST, astEqual } from "../ast-utils";
import { algebraRules } from "./algebra-rules";

export { algebraRules };

/** Apply a single rule recursively (bottom-up) to an AST */
function applyRuleOnce(node: ASTNode, rule: Rule): { result: ASTNode; applied: boolean } {
  let newNode = cloneAST(node);

  // First, recurse into children
  if (newNode.type === "binaryOp") {
    const leftResult = applyRuleOnce(newNode.left, rule);
    const rightResult = applyRuleOnce(newNode.right, rule);
    if (leftResult.applied || rightResult.applied) {
      newNode = { ...newNode, left: leftResult.result, right: rightResult.result };
      return { result: newNode, applied: true };
    }
  } else if (newNode.type === "unaryOp") {
    const result = applyRuleOnce(newNode.operand, rule);
    if (result.applied) {
      return { result: { ...newNode, operand: result.result }, applied: true };
    }
  } else if (newNode.type === "functionCall") {
    let changed = false;
    const newArgs = newNode.args.map(arg => {
      const r = applyRuleOnce(arg, rule);
      if (r.applied) changed = true;
      return r.result;
    });
    if (changed) {
      return { result: { ...newNode, args: newArgs }, applied: true };
    }
  }

  // Then try the rule on this node
  const transformed = rule.apply(newNode);
  if (transformed && !astEqual(newNode, transformed)) {
    return { result: transformed, applied: true };
  }

  return { result: newNode, applied: false };
}

/** Apply a set of rules repeatedly until no more rules apply (fixpoint) */
export function applyRules(
  ast: ASTNode,
  rules: Rule[],
  maxIterations: number = 50
): { result: ASTNode; steps: Step[] } {
  const steps: Step[] = [];
  let current = cloneAST(ast);
  let iteration = 0;

  while (iteration < maxIterations) {
    let anyApplied = false;

    for (const rule of rules) {
      const before = cloneAST(current);
      const { result, applied } = applyRuleOnce(current, rule);

      if (applied) {
        const ruleApp: RuleApplication = {
          ruleId: rule.id,
          ruleName: rule.name,
          before,
          after: cloneAST(result),
          description: rule.description,
        };
        steps.push({
          index: steps.length,
          rule: ruleApp,
          expression: cloneAST(result),
        });
        current = result;
        anyApplied = true;
        break; // restart rule loop after each application
      }
    }

    if (!anyApplied) break;
    iteration++;
  }

  return { result: current, steps };
}
