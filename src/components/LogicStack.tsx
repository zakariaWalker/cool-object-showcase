import { Step } from "@/engine/types";
import { astToLatex } from "@/engine/ast-utils";
import { LatexRenderer } from "./LatexRenderer";
import { motion } from "framer-motion";

interface LogicStackProps {
  steps: Step[];
}

const logicTransition = { type: "spring" as const, duration: 0.2, bounce: 0 };

export function LogicStack({ steps }: LogicStackProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-[13px]">
        No transformations applied yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <motion.div
          key={step.index}
          className="group relative border-b border-border bg-card p-6 hover:bg-muted/30 transition-colors border-l-4 domain-algebra"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...logicTransition, delay: i * 0.05 }}
          layout
        >
          {/* Step number */}
          <div className="absolute top-2 right-3 text-[11px] text-muted-foreground font-mono">
            step {step.index + 1}
          </div>

          {/* Rule name badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono bg-primary/10 text-primary border border-primary/20">
              {step.rule.ruleId}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {step.rule.ruleName}
            </span>
          </div>

          {/* Before → After */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="bg-background/50 border border-border rounded-sm p-3 text-center">
              <LatexRenderer latex={astToLatex(step.rule.before)} />
            </div>
            <span className="text-muted-foreground text-[18px]">→</span>
            <div className="bg-background/50 border border-border rounded-sm p-3 text-center">
              <LatexRenderer latex={astToLatex(step.rule.after)} />
            </div>
          </div>

          {/* Rule description */}
          <div className="mt-2 text-[11px] text-muted-foreground font-mono">
            {step.rule.description}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
