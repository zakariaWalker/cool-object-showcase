// ===== Unified Exercise Workspace (SOTA v2) =====
// TMA mode  → TMAExerciseView  (mobile, raw API data + engine results, no duplication)
// Desktop   → 3-column workspace with ExerciseResult

import { useState, useCallback, useEffect } from "react";
import { ParsedExercise, parseExercise } from "@/engine/exercise-parser";
import { ImadrassaExercise } from "@/engine/dataset-types";
import { expand, simplify } from "@/engine/algebra-engine";
import { solveGeometry } from "@/engine/geometry/engine";
import { analyzeStatistics, parseDataset } from "@/engine/statistics-engine";
import { solveProbability } from "@/engine/probability-engine";
import { analyzeFunction } from "@/engine/functions-engine";
import { SolveResult, Domain, StatisticsResult, ProbabilityResult } from "@/engine/types";
import { GeometryProblem, GeometrySolveResult } from "@/engine/geometry/types";
import { FunctionAnalysis } from "@/engine/functions-engine";
import { recordExercise } from "@/engine/progress-store";
import { astToLatex } from "@/engine/ast-utils";
import { ExerciseInput } from "./ExerciseInput";
import { ExerciseResult } from "./ExerciseResult";
import { DatasetBrowser } from "./DatasetBrowser";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { EngineNav } from "./EngineNav";
import { ProgressSidebar } from "./ProgressSidebar";
import { TMAExerciseView } from "./TMAExerciseView";
import { FeatureTabs } from "./FeatureTabs";
import { FreeDeconstruct } from "./FreeDeconstruct";
import { AnimatePresence } from "framer-motion";
import { DynamicExerciseSuggestions } from "./DynamicExerciseSuggestions";
import { loadKB } from "@/engine/knowledge/store";
import { analyzeExercise, recordKnowledgeGap, learnFromGap } from "@/engine/knowledge/analyzer";
import { KnowledgeBase as KBType, KnowledgeGap } from "@/engine/knowledge/types";
import { autoSolve, AutoSolveResult } from "@/engine/algebra-engine";
import { factor, FactorResult } from "@/engine/factoring-engine";
import { SoundAura } from "./SoundAura";
import { ExerciseSound } from "./ExerciseSound";
import { GapFixWizard } from "./GapFixWizard";
import { KnowledgeBaseView } from "./KnowledgeBase";

interface SolvedExercise {
  exercise: ParsedExercise;
  algebraResults: SolveResult[];
  geometryResult: GeometrySolveResult | null;
  statisticsResult: StatisticsResult | null;
  probabilityResult: ProbabilityResult | null;
  functionsResult: FunctionAnalysis | null;
}

type InputMode = "text" | "dataset" | "library" | "knowledge" | "deconstruct";

interface ExerciseWorkspaceProps {
  preloadedExercise?: ImadrassaExercise | null;
  isTelegramMode?: boolean;
}

export function ExerciseWorkspace({
  preloadedExercise = null,
  isTelegramMode = false,
}: ExerciseWorkspaceProps) {
  const [currentExercise, setCurrentExercise] = useState<ImadrassaExercise | null>(preloadedExercise);
  const [solved, setSolved] = useState<SolvedExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("library");
  const [kb, setKB] = useState<KBType>(() => loadKB());
  const [highlightGapId, setHighlightGapId] = useState<string | null>(null);
  const [trainingGap, setTrainingGap] = useState<KnowledgeGap | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Sync state if prop changes (e.g. from Index/URL)
  useEffect(() => {
    if (preloadedExercise) setCurrentExercise(preloadedExercise);
  }, [preloadedExercise]);

  const handleJumpToGap = useCallback((gapId: string) => {
    setInputMode("knowledge");
    setHighlightGapId(gapId);
    setTimeout(() => setHighlightGapId(null), 5000);
  }, []);

  const handleTrainGap = useCallback((gapId: string) => {
    const gap = kb.learningGaps.find(g => g.id === gapId || g.signature === gapId);
    if (gap) setTrainingGap(gap);
  }, [kb.learningGaps]);

  const handleSolveGap = useCallback((steps: { description: string; ruleHint?: string }[]) => {
    if (!trainingGap) return;
    setKB(prev => learnFromGap(prev, trainingGap.id, steps));
    setTrainingGap(null);
  }, [trainingGap]);

  const solveExercise = useCallback(async (exercise: ParsedExercise, rawText?: string) => {
    setError(null);
    try {
      const algebraResults: SolveResult[] = [];
      let geometryResult: GeometrySolveResult | null = null;
      let statisticsResult: StatisticsResult | null = null;
      let probabilityResult: ProbabilityResult | null = null;
      let functionsResult: FunctionAnalysis | null = null;
      const domain = exercise.classification.domain;

      if (domain === "algebra") {
        // Use autoSolve — handles expand, simplify, linear, quadratic, system, inequality
        try {
          const src = rawText ?? exercise.source.text;
          const autoResults = autoSolve(
            exercise.semanticObjects.expressions,
            exercise.semanticObjects.equations,
            exercise.semanticObjects.inequalities ?? [],
            exercise.intent.tasks,
            kb
          );
          for (const ar of autoResults) {
            if (ar.algebraResult) algebraResults.push(ar.algebraResult);
            // Wrap linear solution as a SolveResult for display
            if (ar.linearSolution && ar.linearSolution.consistent && ar.linearSolution.value !== null) {
              algebraResults.push({
                input: { type: "variable", name: ar.linearSolution.variable } as any,
                output: { type: "number", value: ar.linearSolution.value } as any,
                steps: ar.linearSolution.steps.map((s, i) => ({
                  index: i, expression: { type: "variable", name: s } as any,
                  rule: { ruleId: "linear", ruleName: s, before: { type: "variable", name: s } as any, after: { type: "variable", name: s } as any, description: s }
                })),
                domain: "algebra",
              } as SolveResult);
            }
            if (ar.quadraticSolution && ar.quadraticSolution.realRoots) {
              for (const root of ar.quadraticSolution.roots) {
                algebraResults.push({
                  input: { type: "variable", name: ar.quadraticSolution.variable } as any,
                  output: { type: "number", value: typeof root.value === "number" ? root.value : 0 } as any,
                  steps: ar.quadraticSolution.steps.map((s, i) => ({
                    index: i, expression: { type: "variable", name: s } as any,
                    rule: { ruleId: "quadratic", ruleName: s, before: { type: "variable", name: s } as any, after: { type: "variable", name: s } as any, description: s }
                  })),
                  domain: "algebra",
                } as SolveResult);
              }
            }
          }
        } catch (e) { console.warn("[algebra autoSolve]", e); }
      }

      if (domain === "geometry" && exercise.semanticObjects.geometry) {
        const geo = exercise.semanticObjects.geometry;
        if (geo.shape === "triangle") {
          const problem: GeometryProblem = {
            type: "triangle",
            triangle: {
              vertices: geo.vertices as [string, string, string],
              rightAngleAt: geo.rightAngleAt,
              sides: geo.sides,
            },
            questions: exercise.intent.tasks
              .filter(t => ["find_side","area","perimeter","circumscribed_circle","point_on_circle"].includes(t))
              .map(t => ({ type: t as any })),
          };
          if (!problem.questions.length)
            problem.questions = [
              { type: "find_side" }, { type: "area" }, { type: "perimeter" },
              { type: "circumscribed_circle" }, { type: "point_on_circle" },
            ];
          geometryResult = solveGeometry(problem);
        } else if (geo.shape === "circle") {
          // Solve circle — extract radius/diameter from sides or text
          const src = rawText ?? exercise.source.text;
          const rMatch = src.match(/r\s*=\s*([\d.]+)/i) ?? src.match(/rayon\s*=?\s*([\d.]+)/i) ?? src.match(/نصف.*?=\s*([\d.]+)/);
          const dMatch = src.match(/d\s*=\s*([\d.]+)/i) ?? src.match(/diamètre\s*=?\s*([\d.]+)/i) ?? src.match(/قطر.*?=\s*([\d.]+)/);
          const cMatch = src.match(/C\s*=\s*([\d.]+)/i) ?? src.match(/محيط.*?=\s*([\d.]+)/);
          const aMatch = src.match(/aire\s*=\s*([\d.]+)/i) ?? src.match(/مساحة.*?=\s*([\d.]+)/);
          const { solveCircle } = await import("@/engine/geometry/engine");
          const circleResult = solveCircle({
            radius: rMatch ? parseFloat(rMatch[1]) : undefined,
            diameter: dMatch ? parseFloat(dMatch[1]) : undefined,
            circumference: cMatch ? parseFloat(cMatch[1]) : undefined,
            area: aMatch ? parseFloat(aMatch[1]) : undefined,
          });
          // Wrap as GeometrySolveResult for display
          geometryResult = {
            problem: { type: "triangle", triangle: { vertices: ["O","",""], rightAngleAt: undefined, sides: {} }, questions: [] },
            steps: circleResult.steps,
            computedValues: { r: circleResult.radius, d: circleResult.diameter, C: circleResult.circumference, A: circleResult.area },
            diagram: { points: [], segments: [], circles: [{ center: { label: "O", x: 0, y: 0 }, radius: circleResult.radius }], labels: [] },
          };
        } else if (geo.shape === "rectangle") {
          const src = rawText ?? exercise.source.text;
          const lMatch = src.match(/(?:longueur|L|طول).*?([\d.]+)/i);
          const wMatch = src.match(/(?:largeur|l|عرض).*?([\d.]+)/i);
          const aMatch = src.match(/(?:aire|مساحة).*?([\d.]+)/i);
          const { solveRectangle } = await import("@/engine/geometry/engine");
          const rectResult = solveRectangle({
            width: wMatch ? parseFloat(wMatch[1]) : undefined,
            height: lMatch ? parseFloat(lMatch[1]) : undefined,
            area: aMatch ? parseFloat(aMatch[1]) : undefined,
          });
          geometryResult = {
            problem: { type: "triangle", triangle: { vertices: ["A","B","C"], rightAngleAt: undefined, sides: {} }, questions: [] },
            steps: rectResult.steps,
            computedValues: { L: rectResult.height, l: rectResult.width, A: rectResult.area, P: rectResult.perimeter, d: rectResult.diagonal },
            diagram: { points: [], segments: [], circles: [], labels: [] },
          };
        }
      }

      // ── Statistics engine ─────────────────────────────────────────────────
      if (domain === "statistics") {
        try {
          const src = rawText ?? exercise.source.text;
          const nums = parseDataset(src);
          if (nums.length >= 2) {
            statisticsResult = analyzeStatistics(nums);
          }
        } catch (e) { console.warn("[stats engine]", e); }
      }

      // ── Probability engine ────────────────────────────────────────────────
      if (domain === "probability") {
        try {
          const src = rawText ?? exercise.source.text;
          probabilityResult = solveProbability(src);
        } catch (e) { console.warn("[prob engine]", e); }
      }

      // ── Functions engine ──────────────────────────────────────────────────
      if (domain === "functions") {
        try {
          const src = rawText ?? exercise.source.text;
          // Try to extract an expression of the form f(x)=... or y=...
          const exprMatch = src.match(/(?:f\s*\(\s*x\s*\)\s*=|y\s*=)\s*(.+)/i);
          const expr = exprMatch ? exprMatch[1].trim() : src.trim();
          if (expr.length >= 2) {
            functionsResult = analyzeFunction(expr);
          }
        } catch (e) { console.warn("[functions engine]", e); }
      }

      setSolved({ exercise, algebraResults, geometryResult, statisticsResult, probabilityResult, functionsResult });
      const success =
        algebraResults.length > 0 ||
        geometryResult !== null ||
        statisticsResult !== null ||
        probabilityResult !== null ||
        functionsResult !== null;
      recordExercise(
        domain as Domain,
        exercise.classification.subdomain,
        exercise.source.text,
        success,
      );
      // KB tracking — record gap if unsolved, analyze if solved
      if (!success) {
        setKB(prev => recordKnowledgeGap(prev, exercise, "unsupported_structure"));
      } else {
        setKB(prev => analyzeExercise(prev, exercise));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التحليل");
    }
  }, []);

  const handleParsed = useCallback(async (ex: ParsedExercise, raw?: string) => solveExercise(ex, raw), [solveExercise]);

  const handleDatasetExercise = useCallback((ex: ImadrassaExercise) => {
    setCurrentExercise(ex);
    // Deduplicate: If statement already contains first question, don't repeat questions
    const statement = ex.statement || "";
    const questionsText = ex.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    
    // If statement is just a summary and questions are the meat, or vice versa
    // We'll join them but ensure we don't double count if the statement IS the first question
    const text = statement.trim() === ex.questions[0]?.trim()
       ? questionsText
       : [statement, "", questionsText].filter(p => p.trim()).join("\n");

    import("@/engine/exercise-parser").then(({ parseExercise, detectTasks, cleanMathText }) => {
      // Pre-clean text for the solver (strips $, fixes x2 -> x^2)
      const cleaned = cleanMathText(text);
      const parsed = parseExercise(cleaned);

      // Override NLP domain detection with actual DB metadata if available
      const meta = (ex as any)._meta || {};
      const topic = (meta.topic || "").toLowerCase();
      const subject = (meta.subject_id || "").toLowerCase();
      
      let overriden = false;
      if (topic || subject) {
        if (topic.includes("إحصاء") || topic.includes("معطيات")) { parsed.classification.domain = "statistics"; overriden = true; }
        else if (topic.match(/هندس|أشعة|معالم|طالس|فيثاغورس|دوران|زوايا|مساح/)) { parsed.classification.domain = "geometry"; overriden = true; }
        else if (topic.includes("دوال") || topic.includes("دالة")) { parsed.classification.domain = "functions"; overriden = true; }
        else if (topic.includes("احتمال")) { parsed.classification.domain = "probability"; overriden = true; }
        else if (subject === "mathematics" || subject === "math") { parsed.classification.domain = "algebra"; overriden = true; }
      }

      // If domain was overriden, re-detect tasks for that domain
      if (overriden) {
        parsed.intent.tasks = detectTasks(cleaned, parsed.classification.domain);
      }

      solveExercise(parsed, cleaned);
    });
  }, [solveExercise]);

  const handleReviewExercise = useCallback((input: string) => {
    solveExercise(parseExercise(input), input);
  }, [solveExercise]);

  // Auto-solve when exercise is injected from TMA context
  useEffect(() => {
    if (preloadedExercise) handleDatasetExercise(preloadedExercise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedExercise]);

  // ── TMA MODE ─────────────────────────────────────────────────────────────
  if (isTelegramMode) {
    // ── TMA: No exercise selected → mobile home screen ──────────────────
    if (!currentExercise) {
      return (
        <div style={{
          fontFamily: "'Tajawal', sans-serif",
          direction: "rtl",
          minHeight: "100dvh",
          background: "#F8FAFC",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4F46E5 100%)",
            padding: "20px 16px 24px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -30, left: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", bottom: -20, right: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 4px 0" }}>
                محرك التمارين SOTA
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0 }}>
                حل محلي كامل • كشف الأخطاء المفاهيمية • مراجعة متباعدة
              </p>
            </div>
          </div>

            <div style={{ padding: "16px 14px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Dynamic exercise suggestions */}
            <DynamicExerciseSuggestions onSelectExercise={handleDatasetExercise} />

            {/* Exercise library embedded */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
              overflow: "hidden",
            }}>
              <div style={{
                background: "linear-gradient(135deg, #EEF2FF, #F0FDF4)",
                padding: "14px 16px",
                borderBottom: "1px solid #E5E7EB",
              }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 }}>
                  📚 مكتبة التمارين
                </h2>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0 0" }}>
                  اختر تمريناً لفتحه مباشرة
                </p>
              </div>
              <ExerciseLibrary onSelectExercise={handleDatasetExercise} />
            </div>

          </div>
        </div>
      );
    }
    return (
      <TMAExerciseView
        exercise={currentExercise}
        parsed={solved?.exercise ?? null}
        algebraResults={solved?.algebraResults ?? []}
        geometryResult={solved?.geometryResult ?? null}
        statisticsResult={solved?.statisticsResult ?? null}
        probabilityResult={solved?.probabilityResult ?? null}
        functionsResult={solved?.functionsResult ?? null}
      />
    );
  }

  // ── DESKTOP MODE ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "hsl(var(--background))", overflow: "hidden" }}>
      <SoundAura domain={solved?.exercise.classification.domain || "algebra"} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left panel — exercise input */}
        <div style={{
          width: 380,
          flexShrink: 0,
          borderLeft: "1px solid hsl(var(--border))",
          display: "flex",
          flexDirection: "column",
          background: "white",
          boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "14px 16px 12px",
            background: "linear-gradient(135deg, #EEF2FF, #F0FDF4)",
            borderBottom: "1px solid hsl(var(--border))",
          }} dir="rtl">
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "hsl(var(--foreground))", margin: 0, fontFamily: "'Tajawal', sans-serif" }}>
              📝 إدخال التمرين
            </h2>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {(["library", "text", "dataset", "knowledge", "deconstruct"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  style={{
                    flex: 1,
                    padding: "7px",
                    borderRadius: 8,
                    border: "none",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Tajawal', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: inputMode === mode
                      ? "linear-gradient(135deg, #4F46E5, #7C3AED)"
                      : "white",
                    color: inputMode === mode ? "white" : "hsl(var(--muted-foreground))",
                    boxShadow: inputMode === mode ? "0 2px 8px rgba(79,70,229,0.3)" : "none",
                  }}
                >
                  {mode === "library" ? "📚 المكتبة" : mode === "text" ? "✏️ نص حر" : mode === "dataset" ? "📁 ملف JSON" : mode === "deconstruct" ? "🔬 تفكيك" : "🧠 ذكاء"}
                </button>
              ))}
            </div>
          </div>

          {inputMode === "library" && <ExerciseLibrary onSelectExercise={handleDatasetExercise} />}
          {inputMode === "text" && <ExerciseInput onParsed={handleParsed} error={error} />}
          {inputMode === "dataset" && <DatasetBrowser onSelectExercise={handleDatasetExercise} />}
          {inputMode === "knowledge" && (
            <KnowledgeBaseView kb={kb} onKBChange={setKB} highlightGapId={highlightGapId} />
          )}
          {inputMode === "deconstruct" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              <FreeDeconstruct />
            </div>
          )}
        </div>

        {/* Center — results */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {solved ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* ExerciseResult — scrollable, takes available space */}
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                  <ExerciseResult
                    exercise={solved.exercise}
                    algebraResults={solved.algebraResults}
                    geometryResult={solved.geometryResult}
                    statisticsResult={solved.statisticsResult}
                    probabilityResult={solved.probabilityResult}
                    functionsResult={solved.functionsResult}
                    kb={kb}
                    onJumpToKB={handleJumpToGap}
                    onTrainGap={handleTrainGap}
                    exerciseId={(currentExercise as any)?._kb?.id}
                  />
                </div>
                {/* FeatureTabs — pinned at bottom of center panel */}
                {currentExercise && (
                  <div style={{
                    borderTop: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                    overflowY: "auto",
                    maxHeight: "45vh",
                    flexShrink: 0,
                    direction: "rtl",
                    padding: "12px 16px 16px",
                  }}>
                    <FeatureTabs
                      exercise={currentExercise}
                      parsed={solved.exercise}
                      kbPattern={null}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
                background: "hsl(var(--background))",
              }} className="dot-grid">
                <div style={{ textAlign: "center", maxWidth: 520 }} dir="rtl">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
                  <h1 style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "hsl(var(--foreground))",
                    marginBottom: 8,
                    fontFamily: "'Tajawal', sans-serif",
                  }}>
                    محرك التمارين SOTA
                  </h1>
                  <p style={{
                    fontSize: 14,
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: 28,
                    lineHeight: 1.8,
                  }}>
                    حل محلي كامل • كشف الأخطاء المفاهيمية • مراجعة متباعدة
                  </p>
                  <DynamicExerciseSuggestions onSelectExercise={handleDatasetExercise} />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right — progress sidebar */}
        <ProgressSidebar onSelectExercise={handleReviewExercise} />
      </div>
      {/* GapFixWizard modal — rule training */}
      {trainingGap && (
        <GapFixWizard
          gap={trainingGap}
          onSolve={handleSolveGap}
          onCancel={() => setTrainingGap(null)}
        />
      )}
    </div>
  );
}

