// ===== Geometry Workspace =====
import { useState } from "react";
import { solveGeometry } from "@/engine/geometry/engine";
import {
  GeometryProblem,
  GeometrySolveResult,
  Triangle,
} from "@/engine/geometry/types";
import { GeometryDiagram } from "./GeometryDiagram";
import { EngineNav } from "./EngineNav";
import { LatexRenderer } from "./LatexRenderer";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_PROBLEMS: { label: string; problem: GeometryProblem }[] = [
  {
    label: "ABC قائم في A — AB=6, AC=8",
    problem: {
      type: "triangle",
      triangle: {
        vertices: ["A", "B", "C"],
        rightAngleAt: "A",
        sides: { AB: 6, AC: 8 },
      },
      questions: [
        { type: "find_side" },
        { type: "area" },
        { type: "perimeter" },
        { type: "circumscribed_circle" },
        { type: "point_on_circle" },
      ],
    },
  },
  {
    label: "EFG قائم في E — EF=5, EG=12",
    problem: {
      type: "triangle",
      triangle: {
        vertices: ["E", "F", "G"],
        rightAngleAt: "E",
        sides: { EF: 5, EG: 12 },
      },
      questions: [
        { type: "find_side" },
        { type: "area" },
        { type: "perimeter" },
        { type: "circumscribed_circle" },
      ],
    },
  },
  {
    label: "PQR قائم في Q — PQ=3, PR=5",
    problem: {
      type: "triangle",
      triangle: {
        vertices: ["P", "Q", "R"],
        rightAngleAt: "Q",
        sides: { PQ: 3, PR: 5 },
      },
      questions: [
        { type: "find_side" },
        { type: "area" },
        { type: "perimeter" },
      ],
    },
  },
];

export function GeometryWorkspace() {
  const [result, setResult] = useState<GeometrySolveResult | null>(null);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  // Custom input state
  const [v1, setV1] = useState("A");
  const [v2, setV2] = useState("B");
  const [v3, setV3] = useState("C");
  const [rightAt, setRightAt] = useState("A");
  const [side1Label, setSide1Label] = useState("AB");
  const [side1Val, setSide1Val] = useState("6");
  const [side2Label, setSide2Label] = useState("AC");
  const [side2Val, setSide2Val] = useState("8");

  const handlePreset = (index: number) => {
    setActivePreset(index);
    const r = solveGeometry(PRESET_PROBLEMS[index].problem);
    setResult(r);
  };

  const handleCustom = () => {
    setActivePreset(null);
    const sides: Record<string, number> = {};
    if (side1Label && side1Val) sides[side1Label] = parseFloat(side1Val);
    if (side2Label && side2Val) sides[side2Label] = parseFloat(side2Val);

    const tri: Triangle = {
      vertices: [v1, v2, v3],
      rightAngleAt: rightAt,
      sides,
    };

    const problem: GeometryProblem = {
      type: "triangle",
      triangle: tri,
      questions: [
        { type: "find_side" },
        { type: "area" },
        { type: "perimeter" },
        { type: "circumscribed_circle" },
        { type: "point_on_circle" },
      ],
    };

    const r = solveGeometry(problem);
    setResult(r);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono overflow-hidden">
      <EngineNav />
      <div className="flex flex-1 overflow-hidden">
      {/* Left - Problem Input */}
      <div className="w-72 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
            محرك الهندسة
          </h2>
          <p className="text-[11px] text-geometry">Geometry Engine</p>
        </div>

        {/* Presets */}
        <div className="p-4 border-b border-border">
          <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
            تمارين جاهزة
          </h3>
          <div className="space-y-2">
            {PRESET_PROBLEMS.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePreset(i)}
                className={`w-full text-left p-2 rounded-sm text-[12px] transition-colors btn-press border ${
                  activePreset === i
                    ? "border-geometry bg-geometry/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-geometry/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
            إدخال يدوي
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "رأس 1", value: v1, set: setV1 },
                { label: "رأس 2", value: v2, set: setV2 },
                { label: "رأس 3", value: v3, set: setV3 },
              ].map((v) => (
                <div key={v.label}>
                  <label className="text-[10px] text-muted-foreground">{v.label}</label>
                  <input
                    value={v.value}
                    onChange={(e) => v.set(e.target.value.toUpperCase())}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-geometry"
                    maxLength={2}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground">الزاوية القائمة في</label>
              <input
                value={rightAt}
                onChange={(e) => setRightAt(e.target.value.toUpperCase())}
                className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-geometry"
                maxLength={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">ضلع 1</label>
                <input
                  value={side1Label}
                  onChange={(e) => setSide1Label(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-geometry"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">القيمة</label>
                <input
                  value={side1Val}
                  onChange={(e) => setSide1Val(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-geometry"
                  type="number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">ضلع 2</label>
                <input
                  value={side2Label}
                  onChange={(e) => setSide2Label(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-geometry"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">القيمة</label>
                <input
                  value={side2Val}
                  onChange={(e) => setSide2Val(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-geometry"
                  type="number"
                />
              </div>
            </div>

            <button
              onClick={handleCustom}
              className="w-full px-4 py-2 bg-geometry text-background text-[13px] font-mono rounded-sm hover:brightness-110 transition-all btn-press shadow-hard"
            >
              حل ⏎
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
          QED v0.1 — Geometry Engine
        </div>
      </div>

      {/* Center - Steps */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground">
            خطوات الحل
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {result.steps.map((step, i) => (
                  <motion.div
                    key={step.index}
                    className="border-b border-border p-6 hover:bg-muted/30 transition-colors border-l-4 domain-geometry"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.2, bounce: 0, delay: i * 0.08 }}
                  >
                    <div className="absolute top-2 right-3 text-[11px] text-muted-foreground font-mono relative">
                      خطوة {step.index + 1}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono bg-geometry/10 text-geometry border border-geometry/20">
                        {step.ruleId}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {step.ruleName}
                      </span>
                    </div>

                    <p className="text-[13px] text-foreground mb-3" dir="rtl">
                      {step.description}
                    </p>

                    <div className="space-y-2 bg-background/50 border border-border rounded-sm p-4">
                      <div className="text-[13px]">
                        <LatexRenderer latex={step.formula} displayMode />
                      </div>
                      <div className="text-[13px]">
                        <LatexRenderer latex={step.substitution} displayMode />
                      </div>
                      <div className="text-[16px] text-geometry font-semibold">
                        <LatexRenderer latex={step.result} displayMode />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Summary */}
                <div className="p-6 bg-card/50 border-b border-border">
                  <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                    ملخص النتائج
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(result.computedValues).map(([key, val]) => (
                      <div
                        key={key}
                        className="bg-background border border-border rounded-sm p-3"
                      >
                        <div className="text-[11px] text-muted-foreground">{key}</div>
                        <div className="text-[18px] text-geometry font-semibold">
                          {typeof val === "number"
                            ? Number.isInteger(val) ? val : val.toFixed(2)
                            : val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full blueprint-grid">
                <div className="text-center p-8">
                  <h1 className="text-[24px] text-foreground mb-2">محرك الهندسة</h1>
                  <p className="text-[13px] text-muted-foreground max-w-md" dir="rtl">
                    اختر تمريناً جاهزاً أو أدخل بيانات مثلث قائم يدوياً.
                    <br />
                    كل خطوة محسوبة حتمياً. بدون ذكاء اصطناعي.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right - Diagram */}
      <div className="w-96 border-l border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground">
            المخطط الهندسي
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <GeometryDiagram diagram={result.diagram} />
              <div className="mt-4 text-[11px] text-muted-foreground space-y-1">
                <p>• النقاط الخضراء = رؤوس المثلث</p>
                <p>• الخط المتقطع = الدائرة المحيطة</p>
                <p>• النقطة البرتقالية = مركز الدائرة</p>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center hatched-empty p-8 rounded-sm border border-dashed border-border">
                <p className="text-[11px] text-muted-foreground">
                  حل تمريناً لعرض المخطط
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
