// ===== Probability Workspace =====
// Local probability engine + Gemini explanation + probability tree SVG.

import { useState, useCallback, useRef, useEffect } from "react";
import { solveProbability } from "@/engine/probability-engine";
import { explainProbability } from "@/engine/ai-layer";
import { ProbabilityResult, TreeNode } from "@/engine/types";
import { EngineNav } from "./EngineNav";
import { LatexRenderer } from "./LatexRenderer";
import { motion, AnimatePresence } from "framer-motion";

const EXAMPLES = [
  { label: "2 pièces", value: "Lancer 2 pièces équilibrées. Calculer toutes les probabilités." },
  { label: "1 dé", value: "Lancer un dé équilibré. P(pair), P(>4), P(premier)." },
  { label: "2 dés", value: "Lancer deux dés équilibrés. P(somme=7), P(doublet), P(somme≥10)." },
  { label: "Urne", value: "Sac: 3 boules rouges, 2 bleues, 5 vertes. Tirer 1 boule." },
];

export function ProbabilityWorkspace() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ProbabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const solve = useCallback(() => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = solveProbability(input);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في الحل");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const fetchAI = useCallback(async () => {
    if (!result) return;
    setAiLoading(true);
    try {
      const explanation = await explainProbability(result, "fr");
      setResult(prev => prev ? { ...prev, aiExplanation: explanation } : prev);
    } catch (e) {
      setResult(prev => prev ? { ...prev, aiExplanation: `Erreur: ${e instanceof Error ? e.message : "inconnu"}` } : prev);
    } finally {
      setAiLoading(false);
    }
  }, [result]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono overflow-hidden">
      <EngineNav />
      <div className="flex flex-1 overflow-hidden">
        {/* Left */}
        <div className="w-[380px] border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              مسألة الاحتمالات
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") solve(); }}
              placeholder="صِف التجربة العشوائية..."
              className="w-full bg-background border border-border rounded-sm p-3 text-[13px] resize-none h-24 focus:outline-none focus:border-secondary/50 placeholder:text-muted-foreground"
              dir="auto"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => setInput(ex.value)}
                  className="text-[11px] px-2 py-1 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-secondary/50 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <button
              onClick={solve}
              disabled={loading || !input.trim()}
              className="mt-3 w-full py-2.5 bg-secondary text-black text-[13px] font-semibold rounded-sm hover:bg-secondary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "حساب..." : "احسب الاحتمالات →"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="text-[12px] text-destructive border border-destructive/30 rounded-sm p-3 mb-4">{error}</div>
            )}
            {result && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Sample space */}
                  <div className="mb-3 p-3 bg-background border border-border rounded-sm">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">فضاء العينة</div>
                    <div className="text-[12px] text-secondary">
                      |Ω| = {result.totalOutcomes}
                    </div>
                    {result.sampleSpace.length <= 16 && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {"{"}{ result.sampleSpace.join(", ")}
                        {"}"}
                      </div>
                    )}
                  </div>

                  {/* Events */}
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">الأحداث</div>
                  {result.events.map((ev, i) => (
                    <motion.div
                      key={ev.name}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center justify-between p-2.5 border border-border rounded-sm mb-1.5 bg-background"
                    >
                      <span className="text-[12px] text-secondary">{ev.nameAr}</span>
                      <div className="text-right">
                        <div className="text-[13px] font-bold text-foreground">
                          {(ev.probability * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          <LatexRenderer latex={ev.fraction} displayMode={false} />
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Steps */}
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 mt-4">الخطوات</div>
                  {result.steps.map(step => (
                    <div key={step.index} className="border border-border rounded-sm p-3 mb-2">
                      <div className="text-[11px] text-secondary font-semibold mb-1.5">{step.nameAr}</div>
                      <div className="bg-background rounded-sm p-2 overflow-x-auto mb-1">
                        <LatexRenderer latex={step.formula} displayMode={true} />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{step.explanation}</div>
                    </div>
                  ))}

                  {!result.aiExplanation && (
                    <button
                      onClick={fetchAI}
                      disabled={aiLoading}
                      className="w-full mt-2 py-2 border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-secondary/50 rounded-sm transition-colors"
                    >
                      {aiLoading ? "NIM analyse..." : "✦ Explication Gemini AI →"}
                    </button>
                  )}
                  {result.aiExplanation && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 p-3 border border-secondary/30 rounded-sm bg-secondary/5"
                    >
                      <div className="text-[10px] text-secondary uppercase tracking-widest mb-1.5">✦ Gemini AI</div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{result.aiExplanation}</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
            {!result && !error && (
              <div className="text-center text-muted-foreground text-[13px] pt-12 leading-loose">
                صِف تجربة عشوائية<br />
                <span className="text-[11px]">يُولَّد شجرة الاحتمال تلقائياً</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Probability Tree */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4 flex-shrink-0">
            شجرة الاحتمال — Arbre de Probabilité
          </div>
          {result ? (
            <div className="flex-1 min-h-0 bg-card border border-border rounded-sm overflow-auto">
              <ProbabilityTreeSVG tree={result.tree} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-5xl opacity-10 mb-4">⬡</div>
                <p className="text-[13px]">الشجرة تظهر بعد الحل</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tree SVG ────────────────────────────────────────────────────────────────

function collectNodes(node: TreeNode): TreeNode[] {
  const all: TreeNode[] = [node];
  for (const c of node.children) all.push(...collectNodes(c));
  return all;
}

function collectEdges(node: TreeNode): [TreeNode, TreeNode][] {
  const edges: [TreeNode, TreeNode][] = [];
  for (const c of node.children) {
    edges.push([node, c]);
    edges.push(...collectEdges(c));
  }
  return edges;
}

function countLeaves(node: TreeNode): number {
  if (!node.children.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

function assignSlots(node: TreeNode, pos: { v: number }) {
  if (!node.children.length) { (node as any)._slot = pos.v++; return; }
  for (const c of node.children) assignSlots(c, pos);
  const slots = node.children.map(c => (c as any)._slot);
  (node as any)._slot = (slots[0] + slots[slots.length - 1]) / 2;
}

function ProbabilityTreeSVG({ tree }: { tree: TreeNode }) {
  const treeCopy = JSON.parse(JSON.stringify(tree));
  const pos = { v: 0 };
  assignSlots(treeCopy, pos);

  const all = collectNodes(treeCopy);
  const edges = collectEdges(treeCopy);
  const maxDepth = Math.max(...all.map(n => n.depth));
  const leaves = pos.v || 1;

  const LW = 140;
  const SH = 50;
  const PAD = 60;
  const W = Math.max(600, (maxDepth + 1) * LW + PAD * 2);
  const H = Math.max(300, leaves * SH + PAD * 2);

  const gx = (n: any) => PAD + n.depth * LW;
  const gy = (n: any) => PAD + n._slot * SH + SH / 2;
  const R = 18;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: "Geist Mono, monospace" }}>
      {edges.map(([parent, child], i) => {
        const x1 = gx(parent) + R, y1 = gy(parent);
        const x2 = gx(child) - R, y2 = gy(child);
        const mx = (x1 + x2) / 2;
        return (
          <g key={i}>
            <path
              d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
              fill="none"
              stroke="hsl(240 3.7% 22%)"
              strokeWidth={1.5}
            />
            <text
              x={mx}
              y={(y1 + y2) / 2 - 6}
              textAnchor="middle"
              fill="hsl(31.6 100% 50%)"
              fontSize={10}
              fontWeight={600}
            >
              {child.fractionLabel}
            </text>
          </g>
        );
      })}

      {all.map((n: any, i) => {
        const x = gx(n), y = gy(n);
        const isLeaf = !n.children.length;
        const isRoot = n.depth === 0;

        if (isLeaf && n.outcome) {
          return (
            <g key={i}>
              <rect
                x={x - 26} y={y - 13}
                width={52} height={26} rx={4}
                fill="hsl(142.1 70.6% 45.3% / 0.15)"
                stroke="hsl(142.1 70.6% 45.3%)"
                strokeWidth={1}
              />
              <text x={x} y={y + 4} textAnchor="middle" fill="hsl(142.1 70.6% 45.3%)" fontSize={11} fontWeight={600}>
                {n.outcome}
              </text>
              <text x={x} y={y + 20} textAnchor="middle" fill="hsl(240 5% 50%)" fontSize={9}>
                {(n.cumulativeProbability * 100).toFixed(1)}%
              </text>
            </g>
          );
        }

        return (
          <g key={i}>
            <circle
              cx={x} cy={y} r={isRoot ? R + 4 : R}
              fill={isRoot ? "hsl(217.2 91.2% 59.8% / 0.2)" : "hsl(240 10% 5%)"}
              stroke={isRoot ? "hsl(217.2 91.2% 59.8%)" : "hsl(240 3.7% 30%)"}
              strokeWidth={1.5}
            />
            <text
              x={x} y={y + 4}
              textAnchor="middle"
              fill={isRoot ? "hsl(217.2 91.2% 59.8%)" : "hsl(0 0% 98%)"}
              fontSize={n.label.length > 5 ? 9 : 12}
              fontWeight={600}
            >
              {n.label.slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
