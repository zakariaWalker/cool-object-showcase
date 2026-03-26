import { ASTNode } from "@/engine/types";
import { motion } from "framer-motion";

interface ASTViewerProps {
  node: ASTNode;
  depth?: number;
}

const logicTransition = { type: "spring" as const, duration: 0.2, bounce: 0 };

function nodeLabel(node: ASTNode): string {
  switch (node.type) {
    case "number": return String(node.value);
    case "variable": return node.name;
    case "binaryOp": return node.op;
    case "unaryOp": return node.op;
    case "functionCall": return node.name;
  }
}

function nodeColor(node: ASTNode): string {
  switch (node.type) {
    case "number": return "bg-accent/10 text-accent border-accent/20";
    case "variable": return "bg-primary/10 text-primary border-primary/20";
    case "binaryOp": return "bg-secondary/10 text-secondary border-secondary/20";
    case "unaryOp": return "bg-destructive/10 text-destructive border-destructive/20";
    case "functionCall": return "bg-primary/10 text-primary border-primary/20";
  }
}

function getChildren(node: ASTNode): ASTNode[] {
  switch (node.type) {
    case "number":
    case "variable":
      return [];
    case "binaryOp":
      return [node.left, node.right];
    case "unaryOp":
      return [node.operand];
    case "functionCall":
      return node.args;
  }
}

export function ASTViewer({ node, depth = 0 }: ASTViewerProps) {
  const children = getChildren(node);
  const staggerDelay = depth * 0.02;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...logicTransition, delay: staggerDelay }}
    >
      <div className="flex items-start gap-1">
        {depth > 0 && (
          <div className="flex flex-col items-center mr-1 mt-1">
            <div className="w-px h-2 bg-border" />
            <div className="w-2 h-px bg-border" />
          </div>
        )}
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[13px] font-mono border ${nodeColor(node)}`}
        >
          {nodeLabel(node)}
        </span>
      </div>
      {children.length > 0 && (
        <div className="ml-4 border-l border-border pl-0">
          {children.map((child, i) => (
            <ASTViewer key={`${depth}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
