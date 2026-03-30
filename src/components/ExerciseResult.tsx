// ===== Exercise Result Display (SOTA v2) =====
// Adds: MisconceptionPanel per algebra result, probability domain support.

import { motion } from "framer-motion";
import { ParsedExercise, cleanMathText } from "@/engine/exercise-parser";
import { Domain, SolveResult, StatisticsResult, ProbabilityResult } from "@/engine/types";
import { GeometrySolveResult } from "@/engine/geometry/types";
import { astToLatex } from "@/engine/ast-utils";
import { LatexRenderer } from "./LatexRenderer";
import { LogicStack } from "./LogicStack";
import { KBDeconstructionView } from "./KBDeconstructionView";
import { GeometryDiagram } from "./GeometryDiagram";
import { AlgebraVisual } from "./AlgebraVisual";
import { MisconceptionPanel } from "./MisconceptionPanel";
import { Link } from "react-router-dom";
import { FunctionAnalysis } from "@/engine/functions-engine";
import { KnowledgeGapVisual } from "./KnowledgeGapVisual";
import { KnowledgeBase } from "@/engine/knowledge/types";
import { MathExerciseRenderer } from "./MathExerciseRenderer";
import { ExerciseReportButton } from "./ExerciseReportButton";

interface ExerciseResultProps {
  exercise: ParsedExercise;
  algebraResults: SolveResult[];
  geometryResult: GeometrySolveResult | null;
  statisticsResult?: StatisticsResult | null;
  probabilityResult?: ProbabilityResult | null;
  functionsResult?: FunctionAnalysis | null;
  kb?: KnowledgeBase;
  onJumpToKB?: (gapId: string) => void;
  onTrainGap?: (gapId: string) => void;
  exerciseId?: string;
}

const DOMAIN_CONFIG: Record<Domain, {
  labelAr: string; label: string;
  borderClass: string; badgeClass: string;
}> = {
  algebra:     { labelAr: "جبر",     label: "Algebra",     borderClass: "border-l-primary",  badgeClass: "bg-primary/10 text-primary border-primary/20" },
  geometry:    { labelAr: "هندسة",   label: "Geometry",    borderClass: "border-l-geometry", badgeClass: "bg-geometry/10 text-geometry border-geometry/20" },
  statistics:  { labelAr: "إحصاء",   label: "Statistics",  borderClass: "border-l-accent",   badgeClass: "bg-accent/10 text-accent border-accent/20" },
  probability: { labelAr: "احتمال",  label: "Probability", borderClass: "border-l-secondary",badgeClass: "bg-secondary/10 text-secondary border-secondary/20" },
  functions:   { labelAr: "دوال",    label: "Functions",   borderClass: "border-l-primary",badgeClass: "bg-primary/10 text-primary border-primary/20" },
};

export function ExerciseResult({ 
  exercise, algebraResults, geometryResult,
  statisticsResult, probabilityResult, functionsResult,
  kb,
  onJumpToKB,
  onTrainGap,
  exerciseId,
}: ExerciseResultProps) {
  const domain = exercise.classification.domain;
  const config = DOMAIN_CONFIG[domain] ?? DOMAIN_CONFIG.algebra;
  const table = exercise.semanticObjects.table;

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        className={`border-b border-border p-6 bg-card/50 border-l-4 ${config.borderClass}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">تحليل التمرين</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-sm border ${config.badgeClass}`}>
            {config.labelAr} — {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground">{exercise.classification.subdomain}</span>
          <span className="text-[10px] text-muted-foreground/50">
            {exercise.source.language === "ar" ? "عربي" : exercise.source.language === "fr" ? "Français" : "English"}
          </span>
          {(exerciseId || (exercise as any).id || (exercise as any).url) && (
            <div className="ml-auto">
              <ExerciseReportButton exerciseId={exerciseId || (exercise as any).id || (exercise as any).url || "unknown"} />
            </div>
          )}
        </div>
        <div className="bg-background border border-border rounded-sm p-4 text-[13px] text-foreground leading-relaxed" dir="auto">
          <MathExerciseRenderer text={exercise.source.text} />
        </div>
      </motion.div>

      {/* KB Deconstruction — pattern-based breakdown */}
      {exerciseId && (
        <KBDeconstructionView exerciseId={exerciseId} exerciseText={exercise.source.text} />
      )}

      {/* Detected Table */}
      {table && (
        <motion.div
          className="border-b border-border p-6"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        >
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">جدول مكتشف</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] font-mono">
              <thead>
                <tr>
                  {table.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left border border-border bg-muted/50 text-foreground text-[11px] font-semibold" dir="auto">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-muted/20 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-3 py-2 border border-border ${typeof cell === "number" ? "text-primary font-semibold" : "text-foreground"}`} dir="auto">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {domain === "statistics" && table.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-primary/5">
                    <td className="px-3 py-2 border border-border text-[11px] text-muted-foreground font-semibold" dir="auto">المجموع</td>
                    {table.headers.slice(1).map((_, ci) => {
                      const sum = table.rows.reduce((s, row) => {
                        const val = row[ci + 1];
                        return s + (typeof val === "number" ? val : 0);
                      }, 0);
                      return <td key={ci} className="px-3 py-2 border border-border text-primary font-bold">{sum || "—"}</td>;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </motion.div>
      )}

      {/* Detected questions */}
      {exercise.rawQuestions.length > 0 && (
        <motion.div
          className="border-b border-border p-6"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
            الأسئلة المكتشفة ({exercise.rawQuestions.length})
          </div>
          <div className="space-y-3">
            {exercise.rawQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px]">
                <span className="text-primary font-mono text-[11px] mt-0.5 shrink-0">Q{i + 1}</span>
                <span className="text-foreground" dir="auto">
                   <MathExerciseRenderer text={q} />
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Extracted objects */}
      <motion.div
        className="border-b border-border p-6"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      >
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">الكائنات الرياضية</div>
        <div className="grid grid-cols-2 gap-3">
          {exercise.semanticObjects.expressions.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-sm p-3">
              <div className="text-[10px] text-muted-foreground mb-2">عبارات</div>
              {exercise.semanticObjects.expressions.map((expr, i) => (
                <div key={i} className="text-[13px] font-mono text-foreground py-0.5">{expr}</div>
              ))}
            </div>
          )}
          {exercise.semanticObjects.equations.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-sm p-3">
              <div className="text-[10px] text-muted-foreground mb-2">معادلات</div>
              {exercise.semanticObjects.equations.map((eq, i) => (
                <div key={i} className="text-[13px] font-mono text-foreground py-0.5">{eq}</div>
              ))}
            </div>
          )}
          {exercise.semanticObjects.variables.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-sm p-3">
              <div className="text-[10px] text-muted-foreground mb-2">متغيرات</div>
              <div className="flex gap-2 flex-wrap">
                {exercise.semanticObjects.variables.map((v, i) => (
                  <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[13px] font-mono rounded-sm border border-primary/20">{v}</span>
                ))}
              </div>
            </div>
          )}
          {exercise.semanticObjects.geometry && (
            <div className="bg-muted/30 border border-border rounded-sm p-3">
              <div className="text-[10px] text-muted-foreground mb-2">شكل هندسي</div>
              <div className="text-[13px] text-foreground">
                {exercise.semanticObjects.geometry.shape === "triangle" ? "مثلث" : exercise.semanticObjects.geometry.shape}
                {" "}{exercise.semanticObjects.geometry.vertices.join("")}
                {exercise.semanticObjects.geometry.rightAngleAt && (
                  <span className="text-muted-foreground"> — قائم في {exercise.semanticObjects.geometry.rightAngleAt}</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {Object.entries(exercise.semanticObjects.geometry.sides).map(([k, v]) => (
                  <div key={k} className="text-[12px] font-mono text-muted-foreground">{k} = {v} cm</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tasks */}
      <motion.div
        className="border-b border-border p-6"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      >
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">المهام</div>
        <div className="flex flex-wrap gap-2">
          {exercise.intent.tasks.map((task, i) => (
            <span key={i} className={`px-3 py-1 text-[12px] font-mono rounded-sm border ${config.badgeClass}`}>{task}</span>
          ))}
        </div>
      </motion.div>

      {/* ── Algebra Results + Misconception Panel ── */}
      {algebraResults.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="border-b border-border p-6 bg-card/50">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">نتائج الجبر</div>
          </div>
          {algebraResults.map((result, i) => {
            const correctLatex = astToLatex(result.output);
            return (
              <div key={i} className="border-b border-border">
                <div className="p-6 bg-card/30">
                  <div className="text-[11px] text-muted-foreground mb-2">العبارة {i + 1}</div>
                  <div className="text-[20px] mb-1">
                    <LatexRenderer latex={astToLatex(result.input)} displayMode />
                  </div>
                  <div className="text-[24px] text-primary">
                    <LatexRenderer latex={correctLatex} displayMode />
                  </div>

                  {/* Misconception detector for this result */}
                  <MisconceptionPanel correctAnswer={correctLatex} domain="algebra" />
                </div>
                <div className="px-6 pb-4">
                  <AlgebraVisual ast={result.input} />
                </div>
                <LogicStack steps={result.steps} />
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── Statistics Results ── */}
      {statisticsResult && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="border-b border-border p-6 bg-card/50">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">نتائج الإحصاء</div>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
             {[
               { label: "المتوسط", val: statisticsResult.mean },
               { label: "الوسيط", val: statisticsResult.median },
               { label: "المنوال", val: statisticsResult.mode.join(", ") },
               { label: "المدى", val: statisticsResult.range },
               { label: "الانحراف المعياري", val: statisticsResult.stdDev?.toFixed(2) },
               { label: "التباين", val: statisticsResult.variance?.toFixed(2) },
             ].filter(i => i.val !== undefined).map((stat, i) => (
               <div key={i} className="bg-background border border-border rounded-sm p-3">
                 <div className="text-[10px] text-muted-foreground mb-1">{stat.label}</div>
                 <div className="text-[18px] font-bold text-accent">{stat.val}</div>
               </div>
             ))}
          </div>
        </motion.div>
      )}

      {/* ── Probability Results ── */}
      {probabilityResult && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="border-b border-border p-6 bg-card/50">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">نتائج الاحتمال</div>
          </div>
          <div className="p-6 space-y-4">
            {probabilityResult.events.map((p, i) => (
              <div key={i} className="bg-background border border-border rounded-sm p-4">
                <div className="text-[13px] text-foreground mb-2" dir="rtl">{p.nameAr || p.name}</div>
                <div className="flex items-center gap-3">
                  <div className="text-[20px] font-bold text-secondary">
                    <LatexRenderer latex={p.fraction} />
                  </div>
                  <div className="text-[14px] text-muted-foreground">≈ {(p.probability * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Functions Results ── */}
      {functionsResult && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="border-b border-border p-6 bg-card/50">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">نتائج الدوال</div>
          </div>
          <div className="p-6 space-y-6">
            {/* f(x) */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-2">الدالة</div>
              <div className="text-[24px] text-primary">
                <LatexRenderer latex={`f(x) = ${functionsResult.latex}`} displayMode />
              </div>
            </div>
            {/* Domain */}
            {(functionsResult as any).domain && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-2">مجال التعريف</div>
                <div className="text-[16px] text-primary font-mono">
                  <LatexRenderer latex={`D_f = ${(functionsResult as any).domain}`} displayMode />
                </div>
              </div>
            )}
            {/* f'(x) */}
            <div>
              <div className="text-[10px] text-muted-foreground mb-2">المشتقة f'(x)</div>
              <div className="text-[20px] text-primary">
                <LatexRenderer latex={`f'(x) = ${functionsResult.derivativeLatex}`} displayMode />
              </div>
            </div>
            {/* f''(x) */}
            {(functionsResult as any).secondDerivativeLatex && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-2">المشتقة الثانية f''(x)</div>
                <div className="text-[16px] text-primary">
                  <LatexRenderer latex={`f''(x) = ${(functionsResult as any).secondDerivativeLatex}`} displayMode />
                </div>
              </div>
            )}
            {/* Variation table */}
            {(functionsResult as any).variationTable && (functionsResult as any).variationTable.entries?.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-3">جدول التغيرات</div>
                <div className="overflow-x-auto">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, direction: "ltr" }}>
                    <thead>
                      <tr>
                        <td style={{ padding: "6px 10px", border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))", fontWeight: 700 }}>x</td>
                        {(functionsResult as any).variationTable.entries.map((e: any, i: number) => (
                          <td key={i} style={{ padding: "6px 10px", border: "1px solid hsl(var(--border))", textAlign: "center", fontWeight: e.type !== "boundary" ? 700 : 400, color: e.type === "max" ? "#E11D48" : e.type === "min" ? "#059669" : "inherit" }}>
                            {e.x}
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "6px 10px", border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))", fontWeight: 700 }}>f'(x)</td>
                        {(functionsResult as any).variationTable.intervals?.map((interval: string, i: number) => (
                          <td key={`sign-${i}`} colSpan={1} style={{ padding: "6px 10px", border: "1px solid hsl(var(--border))", textAlign: "center", color: (functionsResult as any).variationTable.signs[i] === "+" ? "#059669" : "#DC2626", fontWeight: 800, fontSize: 16 }}>
                            {(functionsResult as any).variationTable.signs[i]}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 10px", border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))", fontWeight: 700 }}>f(x)</td>
                        {(functionsResult as any).variationTable.entries.map((e: any, i: number) => (
                          <td key={i} style={{ padding: "10px 10px", border: "1px solid hsl(var(--border))", textAlign: "center", fontWeight: e.type !== "boundary" ? 700 : 400, color: e.type === "max" ? "#E11D48" : e.type === "min" ? "#059669" : "#6b7280", fontSize: e.type !== "boundary" ? 15 : 12 }}>
                            {e.type === "max" ? "▲ " : e.type === "min" ? "▼ " : ""}{e.fValue}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Critical points */}
            {functionsResult.criticalPoints.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-2">النقاط الحرجة (f'(x)=0)</div>
                <div className="flex gap-2 flex-wrap">
                  {functionsResult.criticalPoints.map((cp, i) => (
                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded text-[13px] font-mono">x = {cp}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Inflection points */}
            {(functionsResult as any).inflectionPoints?.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-2">نقاط الانعطاف (f''(x)=0)</div>
                <div className="flex gap-2 flex-wrap">
                  {(functionsResult as any).inflectionPoints.map((ip: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded text-[13px] font-mono">{ip}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Roots */}
            {functionsResult.roots.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-2">الأصفار</div>
                <div className="flex gap-2 flex-wrap">
                  {functionsResult.roots.map((r, i) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded-sm text-[13px] font-mono">{r}</span>
                  ))}
                </div>
              </div>
            )}
            <LogicStack steps={functionsResult.derivativeSteps.map((s, i) => ({
               index: s.index,
               rule: {
                 ruleId: s.rule,
                 ruleName: s.ruleAr,
                 before: { type: "variable" as const, name: s.before },
                 after: { type: "variable" as const, name: s.after },
                 description: s.explanation,
               },
               expression: { type: "variable" as const, name: s.after },
            }))} />
          </div>
        </motion.div>
      )}

      {/* ── Geometry Results ── */}
      {geometryResult && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="border-b border-border p-6 bg-card/50">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">نتائج الهندسة</div>
          </div>
          {geometryResult.steps.map((step, i) => (
            <motion.div
              key={step.index}
              className="border-b border-border p-6 hover:bg-muted/30 transition-colors border-l-4 border-l-geometry"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] text-muted-foreground font-mono">خطوة {step.index + 1}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-mono bg-geometry/10 text-geometry border border-geometry/20">
                  {step.ruleId}
                </span>
                <span className="text-[13px] text-muted-foreground">{step.ruleName}</span>
              </div>
              <p className="text-[13px] text-foreground mb-3" dir="rtl">{step.description}</p>
              <div className="space-y-2 bg-background/50 border border-border rounded-sm p-4">
                <div className="text-[13px]"><LatexRenderer latex={step.formula} displayMode /></div>
                <div className="text-[13px]"><LatexRenderer latex={step.substitution} displayMode /></div>
                <div className="text-[16px] text-geometry font-semibold"><LatexRenderer latex={step.result} displayMode /></div>
              </div>
            </motion.div>
          ))}
          <div className="p-6 border-b border-border">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">المخطط</div>
            <GeometryDiagram diagram={geometryResult.diagram} />
          </div>
          <div className="p-6 bg-card/50">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">ملخص النتائج</div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(geometryResult.computedValues).map(([key, val]) => (
                <div key={key} className="bg-background border border-border rounded-sm p-3">
                  <div className="text-[11px] text-muted-foreground mb-0.5">{key}</div>
                  <div className="text-[18px] text-geometry font-semibold">
                    {typeof val === "number" ? (Number.isInteger(val) ? val : val.toFixed(2)) : val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* No engine results */}
      {algebraResults.length === 0 && !geometryResult && (
        <motion.div className="p-6 bg-card/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">حالة المحرك</div>
          <div className="text-[13px] text-muted-foreground" dir="rtl">
            التمرين مصنّف كـ <span className="text-foreground">{config.labelAr}</span>.
            يمكن حله من الصفحة المخصصة له.
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {[
              { label: "جبر →", path: "/algebra" },
              { label: "هندسة →", path: "/geometry" },
              { label: "إحصاء →", path: "/statistics" },
              { label: "احتمال →", path: "/probability" },
              { label: "دوال →", path: "/functions" },
            ].map(({ label, path }) => (
              <Link key={path} to={path}
                className="px-3 py-1.5 border border-border rounded-sm text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
