import { useState, useCallback } from "react";
import { parse } from "@/engine/parser";
import { expand, simplify } from "@/engine/algebra-engine";
import { astToLatex } from "@/engine/ast-utils";
import { ASTNode, SolveResult, Domain } from "@/engine/types";
import { CommandBar } from "./CommandBar";
import { LogicStack } from "./LogicStack";
import { ASTViewer } from "./ASTViewer";
import { LatexRenderer } from "./LatexRenderer";
import { EngineNav } from "./EngineNav";
import { motion, AnimatePresence } from "framer-motion";

type Operation = "expand" | "simplify";

interface HistoryEntry {
  input: string;
  operation: Operation;
  result: SolveResult;
}

const DOMAIN_LABELS: Record<Domain, { label: string; color: string }> = {
  algebra: { label: "Algebra", color: "text-primary" },
  geometry: { label: "Geometry", color: "text-secondary" },
  statistics: { label: "Statistics", color: "text-accent" },
  probability: { label: "Probability", color: "text-secondary" },
  functions: { label: "Functions", color: "text-functions" },
};

export function Workspace() {
  const [currentAST, setCurrentAST] = useState<ASTNode | null>(null);
  const [currentResult, setCurrentResult] = useState<SolveResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeDomain] = useState<Domain>("algebra");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((input: string, operation: Operation) => {
    setError(null);
    try {
      const ast = parse(input);
      setCurrentAST(ast);

      let result: SolveResult;
      switch (operation) {
        case "expand":
          result = expand(ast);
          break;
        case "simplify":
          result = simplify(ast);
          break;
      }

      setCurrentResult(result);
      setHistory(prev => [{ input, operation, result }, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse error");
      setCurrentAST(null);
      setCurrentResult(null);
    }
  }, []);

    return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono overflow-hidden">
      <EngineNav />
      <div className="flex flex-1 overflow-hidden">
      {/* Left Sidebar - Domain & History */}
      <div className="w-60 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Engine</h2>
          <div className="space-y-1">
            {(Object.entries(DOMAIN_LABELS) as [Domain, { label: string; color: string }][]).map(([domain, { label, color }]) => (
              <button
                key={domain}
                className={`w-full text-left px-3 py-2 rounded-sm text-[13px] transition-colors btn-press ${
                  activeDomain === domain
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  domain === "algebra" ? "bg-primary" :
                  domain === "geometry" ? "bg-secondary" :
                  domain === "statistics" ? "bg-accent" :
                  "bg-functions"
                }`} />
                <span className={activeDomain === domain ? color : ""}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">History</h2>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentAST(entry.result.input);
                  setCurrentResult(entry.result);
                  setError(null);
                }}
                className="w-full text-left p-2 rounded-sm text-[11px] text-muted-foreground hover:bg-muted/50 transition-colors border border-border truncate btn-press"
              >
                <span className="text-primary">{entry.operation}</span>: {entry.input}
              </button>
            ))}
            {history.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No history yet.</p>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
          QED v0.1 — Deterministic CAS
        </div>
      </div>

      {/* Center - Command Bar + Logic Stack */}
      <div className="flex-1 flex flex-col min-w-0">
        <CommandBar onSubmit={handleSubmit} error={error} />

        <div className="flex-1 overflow-y-auto">
          {currentResult ? (
            <div>
              {/* Result header */}
              <div className="border-b border-border p-6 bg-card/50">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Result</div>
                <div className="text-[24px]">
                  <LatexRenderer latex={astToLatex(currentResult.output)} displayMode />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {currentResult.steps.length} rule{currentResult.steps.length !== 1 ? "s" : ""} applied
                </div>
              </div>

              {/* Logic Stack */}
              <LogicStack steps={currentResult.steps} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full blueprint-grid">
              <div className="text-center p-8">
                <h1 className="text-[24px] text-foreground mb-2">Deterministic Computation Engine</h1>
                <p className="text-[13px] text-muted-foreground max-w-md">
                  Type a mathematical expression in the command bar above.
                  Every step is traced. No AI. No magic. Pure logic.
                </p>
                <div className="mt-6 space-y-1 text-[11px] text-muted-foreground">
                  <p>Try: <code className="px-1.5 py-0.5 bg-muted rounded-sm">3(x+2) + 5(3x-4)</code></p>
                  <p>Try: <code className="px-1.5 py-0.5 bg-muted rounded-sm">2^3 + 4*0</code></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right - AST Inspector */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground">AST Inspector</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {currentAST ? (
              <motion.div
                key="ast"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-[11px] text-muted-foreground mb-3">Input AST</div>
                <ASTViewer node={currentAST} />

                {currentResult && (
                  <>
                    <div className="my-4 border-t border-border" />
                    <div className="text-[11px] text-muted-foreground mb-3">Output AST</div>
                    <ASTViewer node={currentResult.output} />
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="flex items-center justify-center h-full"
              >
                <div className="text-center hatched-empty p-8 rounded-sm border border-dashed border-border">
                  <p className="text-[11px] text-muted-foreground">
                    Parse an expression to inspect its AST
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  );
}
