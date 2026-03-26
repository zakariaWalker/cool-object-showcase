// ===== Functions Workspace =====
// Local symbolic differentiation + sign table + interactive graph.

import { useState, useCallback, useRef, useEffect } from "react";
import { analyzeFunction } from "@/engine/functions-engine";
import { FunctionAnalysis } from "@/engine/functions-engine";
import { EngineNav } from "./EngineNav";
import { LatexRenderer } from "./LatexRenderer";
import { motion, AnimatePresence } from "framer-motion";

const EXAMPLES = [
  { label: "x²−4", value: "x^2 - 4" },
  { label: "x³−3x", value: "x^3 - 3*x" },
  { label: "2x²+5x−3", value: "2*x^2 + 5*x - 3" },
  { label: "sin(x)", value: "sin(x)" },
  { label: "x²+2x+1", value: "x^2 + 2*x + 1" },
];

export function FunctionsWorkspace() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<FunctionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const solve = useCallback(() => {
    if (!input.trim()) return;
    setError(null);
    try {
      const res = analyzeFunction(input);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التحليل");
    }
  }, [input]);

  // Draw graph on canvas
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth * devicePixelRatio;
    const H = canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "hsl(240 10% 5%)";
    ctx.fillRect(0, 0, w, h);

    const xRange = 8, yRange = 8;
    const toX = (x: number) => (x / xRange + 0.5) * w;
    const toY = (y: number) => (1 - (y / yRange + 0.5)) * h;

    // Grid
    ctx.strokeStyle = "hsl(240 3.7% 15.9%)";
    ctx.lineWidth = 0.5;
    for (let x = -xRange; x <= xRange; x++) {
      ctx.beginPath(); ctx.moveTo(toX(x), 0); ctx.lineTo(toX(x), h); ctx.stroke();
    }
    for (let y = -yRange; y <= yRange; y++) {
      ctx.beginPath(); ctx.moveTo(0, toY(y)); ctx.lineTo(w, toY(y)); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "hsl(240 3.7% 30%)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(w, toY(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), h); ctx.stroke();

    // Evaluate function (must use Function — intentional, sandboxed numeric eval)
    const evalFn = (x: number): number => {
      try {
        const expr = result.expr
          .replace(/\^/g, "**")
          .replace(/sin/g, "Math.sin")
          .replace(/cos/g, "Math.cos")
          .replace(/tan/g, "Math.tan")
          .replace(/sqrt/g, "Math.sqrt")
          .replace(/ln/g, "Math.log")
          .replace(/exp/g, "Math.exp");
        return new Function("x", `"use strict"; try { return ${expr}; } catch(e) { return NaN; }`)(x);
      } catch { return NaN; }
    };

    // f(x) — purple
    ctx.strokeStyle = "hsl(217.2 91.2% 59.8%)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= w; i++) {
      const x = (i / w - 0.5) * xRange * 2;
      const y = evalFn(x);
      if (!isFinite(y) || Math.abs(y) > yRange * 2) { first = true; continue; }
      if (first) { ctx.moveTo(i, toY(y)); first = false; }
      else ctx.lineTo(i, toY(y));
    }
    ctx.stroke();

    // Critical points
    ctx.fillStyle = "hsl(31.6 100% 50%)";
    for (const cp of result.criticalPoints) {
      const y = evalFn(cp);
      if (!isFinite(y)) continue;
      ctx.beginPath();
      ctx.arc(toX(cp), toY(y), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Roots
    ctx.fillStyle = "hsl(142.1 70.6% 45.3%)";
    for (const root of result.roots) {
      const rx = parseFloat(root.replace("x = ", ""));
      if (!isNaN(rx)) {
        ctx.beginPath();
        ctx.arc(toX(rx), toY(0), 4, 0, Math.PI * 2);
        ctx.fill();
      }
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
              الدالة f(x)
            </div>
            <div className="flex gap-2 mb-2">
              <span className="text-muted-foreground text-[13px] self-center">f(x) =</span>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && solve()}
                placeholder="x^2 - 4"
                className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-[13px] focus:outline-none focus:border-purple-400/50 placeholder:text-muted-foreground"
                dir="ltr"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => setInput(ex.value)}
                  className="text-[11px] px-2 py-1 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-purple-400/50 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <button
              onClick={solve}
              disabled={!input.trim()}
              className="mt-3 w-full py-2.5 bg-purple-600 text-white text-[13px] font-semibold rounded-sm hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              تحليل الدالة →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="text-[12px] text-red-400 border border-red-400/30 rounded-sm p-3 mb-4">{error}</div>
            )}
            {result && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                  {/* Expression & derivative */}
                  <div className="mb-3 p-3 bg-background border border-border rounded-sm">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">الدالة</div>
                    <LatexRenderer latex={`f(x) = ${result.latex}`} displayMode={true} />
                  </div>
                  <div className="mb-3 p-3 bg-background border border-purple-400/30 rounded-sm">
                    <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">المشتقة f'(x)</div>
                    <LatexRenderer latex={`f'(x) = ${result.derivativeLatex}`} displayMode={true} />
                  </div>

                  {/* Roots */}
                  {result.roots.length > 0 && (
                    <div className="mb-3 p-3 bg-background border border-geometry/30 rounded-sm">
                      <div className="text-[10px] text-geometry uppercase tracking-wider mb-1">الجذور (أصفار)</div>
                      {result.roots.map((r, i) => (
                        <div key={i} className="text-[13px] text-geometry">{r}</div>
                      ))}
                    </div>
                  )}

                  {/* Critical points */}
                  {result.criticalPoints.length > 0 && (
                    <div className="mb-3 p-3 bg-background border border-accent/30 rounded-sm">
                      <div className="text-[10px] text-accent uppercase tracking-wider mb-1">النقاط الحرجة f'(x)=0</div>
                      {result.criticalPoints.map((cp, i) => (
                        <div key={i} className="text-[13px] text-accent">x = {cp}</div>
                      ))}
                    </div>
                  )}

                  {/* Derivative steps */}
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 mt-4">خطوات الاشتقاق</div>
                  {result.derivativeSteps.map(step => (
                    <motion.div
                      key={step.index}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: step.index * 0.06 }}
                      className="border border-border rounded-sm p-3 mb-2"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] text-purple-400 font-semibold">{step.ruleAr}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mb-1">{step.explanation}</div>
                      <div className="bg-background rounded-sm p-1.5 overflow-x-auto">
                        <LatexRenderer latex={`(${step.before})' = ${step.after}`} displayMode={true} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
            {!result && !error && (
              <div className="text-center text-muted-foreground text-[13px] pt-12 leading-loose">
                أدخل دالة رياضية<br />
                <span className="text-[11px]">الاشتقاق الرمزي + الرسم البياني</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Graph */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4 flex-shrink-0">
            التمثيل البياني
            {result?.criticalPoints.length ? (
              <span className="ml-4 text-accent">● نقطة حرجة</span>
            ) : null}
            {result?.roots.length ? (
              <span className="ml-4 text-geometry">● جذر</span>
            ) : null}
          </div>
          <div className="flex-1 min-h-0 bg-card border border-border rounded-sm overflow-hidden">
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
