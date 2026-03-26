// ===== Algebra Visual Deconstruction =====
// Renders algebra operations as geometric area models (rectangle model)
// e.g. 3(x+2) → rectangle with width 3 and height split into x and 2

import { ASTNode } from "@/engine/types";

interface AreaBlock {
  label: string;
  width: number;
  height: number;
  color: string;
  latex: string;
}

interface AreaModel {
  blocks: AreaBlock[];
  totalWidth: number;
  totalHeight: number;
  title: string;
  expression: string;
}

function nodeToString(node: ASTNode): string {
  switch (node.type) {
    case "number": return String(node.value);
    case "variable": return node.name;
    case "binaryOp":
      if (node.op === "*") return `${nodeToString(node.left)} \\times ${nodeToString(node.right)}`;
      if (node.op === "+") return `${nodeToString(node.left)} + ${nodeToString(node.right)}`;
      if (node.op === "-") return `${nodeToString(node.left)} - ${nodeToString(node.right)}`;
      return `${nodeToString(node.left)} ${node.op} ${nodeToString(node.right)}`;
    case "unaryOp": return `-${nodeToString(node.operand)}`;
    case "functionCall": return `${node.name}(${node.args.map(nodeToString).join(", ")})`;
  }
}

const COLORS = [
  "hsl(var(--primary) / 0.3)",
  "hsl(var(--accent) / 0.3)",
  "hsl(142 70% 45% / 0.3)",
  "hsl(38 92% 50% / 0.3)",
];

export function buildAreaModel(ast: ASTNode): AreaModel | null {
  // Pattern: a * (b + c) → area model
  if (ast.type === "binaryOp" && ast.op === "*") {
    const { left, right } = ast;

    // a * (b + c) or a * (b - c)
    if (right.type === "binaryOp" && (right.op === "+" || right.op === "-")) {
      const factor = left.type === "number" ? left.value : 3;
      const terms = flattenAddSub(right);

      const blocks: AreaBlock[] = terms.map((term, i) => ({
        label: nodeToString(term.node),
        width: factor,
        height: term.node.type === "number" ? term.node.value : 2,
        color: COLORS[i % COLORS.length],
        latex: `${nodeToString(left)} \\times ${term.sign === "-" ? "(-" : ""}${nodeToString(term.node)}${term.sign === "-" ? ")" : ""}`,
      }));

      return {
        blocks,
        totalWidth: factor,
        totalHeight: blocks.reduce((s, b) => s + b.height, 0),
        title: "نموذج المساحة",
        expression: nodeToString(ast),
      };
    }
  }

  // Pattern: (a + b) * c
  if (ast.type === "binaryOp" && ast.op === "*") {
    const { left, right } = ast;
    if (left.type === "binaryOp" && (left.op === "+" || left.op === "-")) {
      const factor = right.type === "number" ? right.value : 3;
      const terms = flattenAddSub(left);

      const blocks: AreaBlock[] = terms.map((term, i) => ({
        label: nodeToString(term.node),
        width: term.node.type === "number" ? term.node.value : 2,
        height: factor,
        color: COLORS[i % COLORS.length],
        latex: `${nodeToString(term.node)} \\times ${nodeToString(right)}`,
      }));

      return {
        blocks,
        totalWidth: blocks.reduce((s, b) => s + b.width, 0),
        totalHeight: factor,
        title: "نموذج المساحة",
        expression: nodeToString(ast),
      };
    }
  }

  // Pattern: sum of products: a(b+c) + d(e+f)
  if (ast.type === "binaryOp" && (ast.op === "+" || ast.op === "-")) {
    const leftModel = buildAreaModel(ast.left);
    const rightModel = buildAreaModel(ast.right);
    if (leftModel && rightModel) {
      return {
        blocks: [...leftModel.blocks, ...rightModel.blocks],
        totalWidth: Math.max(leftModel.totalWidth, rightModel.totalWidth),
        totalHeight: leftModel.totalHeight + rightModel.totalHeight + 1,
        title: "نموذج المساحة المركب",
        expression: nodeToString(ast),
      };
    }
  }

  return null;
}

interface TermWithSign {
  node: ASTNode;
  sign: "+" | "-";
}

function flattenAddSub(node: ASTNode): TermWithSign[] {
  if (node.type === "binaryOp" && node.op === "+") {
    return [...flattenAddSub(node.left), ...flattenAddSub(node.right)];
  }
  if (node.type === "binaryOp" && node.op === "-") {
    const rightTerms = flattenAddSub(node.right);
    return [
      ...flattenAddSub(node.left),
      ...rightTerms.map(t => ({ ...t, sign: (t.sign === "+" ? "-" : "+") as "+" | "-" })),
    ];
  }
  return [{ node, sign: "+" }];
}

// ===== SVG Area Model Component =====
import { LatexRenderer } from "./LatexRenderer";
import { motion } from "framer-motion";

interface AlgebraVisualProps {
  ast: ASTNode;
}

export function AlgebraVisual({ ast }: AlgebraVisualProps) {
  const model = buildAreaModel(ast);
  if (!model) return null;

  const padding = 40;
  const scale = 30;
  const svgWidth = 360;
  const svgHeight = model.totalHeight * scale + padding * 2 + 40;

  let yOffset = padding;

  return (
    <motion.div
      className="border border-border rounded-sm bg-background/50 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
        {model.title} — التمثيل الهندسي للجبر
      </div>
      <div className="text-[13px] mb-3">
        <LatexRenderer latex={model.expression} />
      </div>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-[360px]"
      >
        {/* Grid background */}
        <defs>
          <pattern id="areaGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width={svgWidth} height={svgHeight} fill="url(#areaGrid)" />

        {model.blocks.map((block, i) => {
          const w = block.width * scale;
          const h = block.height * scale;
          const x = padding;
          const y = yOffset;
          yOffset += h + 4;

          return (
            <g key={i}>
              {/* Block rectangle */}
              <motion.rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={block.color}
                stroke="hsl(var(--foreground))"
                strokeWidth="1.5"
                rx="2"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
                style={{ transformOrigin: `${x}px ${y + h / 2}px` }}
              />

              {/* Width label (top) */}
              {i === 0 && (
                <text
                  x={x + w / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="hsl(var(--primary))"
                  fontFamily="monospace"
                >
                  {block.width}
                </text>
              )}

              {/* Height label (right) */}
              <text
                x={x + w + 10}
                y={y + h / 2 + 4}
                fontSize="11"
                fill="hsl(var(--foreground))"
                fontFamily="monospace"
              >
                {block.label}
              </text>

              {/* Product label (center) */}
              <text
                x={x + w / 2}
                y={y + h / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fill="hsl(var(--foreground))"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {block.width}×{block.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {model.blocks.map((block, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="w-3 h-3 rounded-sm border border-foreground/20"
              style={{ backgroundColor: block.color }}
            />
            <span className="text-foreground font-mono">{block.latex.replace(/\\/g, "")}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
