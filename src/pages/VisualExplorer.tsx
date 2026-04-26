import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SkillTreeMap } from "@/components/SkillTreeMap";
import { KBExerciseSidekick } from "@/components/KBExerciseSidekick";
import { ConceptContextCard } from "@/components/ConceptContextCard";
import { EXPLORE_CONTEXT } from "@/components/conceptContexts";

type ExplorerTab = "functions" | "geometry" | "concepts" | "fractions" | "symmetry" | "thales" | "trigonometry" | "absolute";

/** Map our local lowercase grade ids → kb_exercises.grade keys. */
const GRADE_TO_KB: Record<string, string> = {
  "1am": "1AM",
  "2am": "2AM",
  "3am": "3AM",
  "bem": "4AM",
  "1as": "1AS",
  "2as": "2AS",
  "bac": "3AS",
};

/** Per-tab chapter keywords used to query the KB. */
const TAB_TO_KEYWORDS: Record<ExplorerTab, { keywords: string[]; label: string; accent: any }> = {
  fractions:    { keywords: ["كسور", "العمليات على الكسور"], label: "الكسور", accent: "statistics" },
  geometry:     { keywords: ["هندس", "مثلث", "رباعي", "مستقيم"], label: "الأشكال الهندسية", accent: "geometry" },
  symmetry:     { keywords: ["تناظر", "انسحاب", "دوران"], label: "التناظر والتحويلات", accent: "geometry" },
  thales:       { keywords: ["طالس"], label: "نظرية طالس", accent: "geometry" },
  trigonometry: { keywords: ["مثلثي", "مثلثات", "النسب المثلثية"], label: "النسب المثلثية", accent: "geometry" },
  absolute:     { keywords: ["القيمة المطلقة", "مطلق"], label: "القيمة المطلقة", accent: "algebra" },
  functions:    { keywords: ["دالة", "دوال", "النهايات", "الاشتقاق"], label: "الدوال", accent: "functions" },
  concepts:     { keywords: [], label: "خريطة المفاهيم", accent: "primary" },
};

const GRADES = [
  { id: "1am", label: "1AM" },
  { id: "2am", label: "2AM" },
  { id: "3am", label: "3AM" },
  { id: "bem", label: "4AM (BEM)" },
  { id: "1as", label: "1AS" },
  { id: "2as", label: "2AS" },
  { id: "bac", label: "3AS (BAC)" },
];

const ALL_TABS: { id: ExplorerTab; label: string; emoji: string; grades: string[] }[] = [
  { id: "fractions", label: "الكسور", emoji: "🍕", grades: ["1am"] },
  { id: "geometry", label: "الأشكال الهندسية", emoji: "📐", grades: ["1am", "2am"] },
  { id: "symmetry", label: "التناظر", emoji: "🦋", grades: ["2am"] },
  { id: "thales", label: "طالس", emoji: "📏", grades: ["3am"] },
  { id: "trigonometry", label: "حساب المثلثات", emoji: "🔺", grades: ["bem"] },
  { id: "absolute", label: "القيمة المطلقة", emoji: "↔️", grades: ["1as"] },
  { id: "functions", label: "رسم الدوال", emoji: "📈", grades: ["2as", "bac"] },
  { id: "concepts", label: "خريطة المفاهيم", emoji: "🧠", grades: ["1am", "2am", "3am", "bem", "1as", "2as", "bac"] },
];

export default function VisualExplorer() {
  const [grade, setGrade] = useState("bem");
  
  const visibleTabs = ALL_TABS.filter(t => t.grades.includes(grade));
  const [tab, setTab] = useState<ExplorerTab>("trigonometry");

  // Re-select first tab if current tab is hidden
  if (!visibleTabs.find(t => t.id === tab)) {
    setTab(visibleTabs[0].id);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">
      {/* Grade Selector */}
      <div className="flex-shrink-0 bg-muted/30 border-b border-border px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {GRADES.map(g => (
          <button
            key={g.id}
            onClick={() => setGrade(g.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              grade === g.id ? "bg-foreground text-background" : "bg-card text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-border px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar" style={{ background: "linear-gradient(to left, hsl(var(--functions) / 0.08), hsl(var(--functions) / 0.03), hsl(var(--background)))" }}>
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 max-w-[1600px] mx-auto">
          <div className="min-w-0">
            {EXPLORE_CONTEXT[tab] && (
              <ConceptContextCard context={EXPLORE_CONTEXT[tab]} />
            )}
            <AnimatePresence mode="wait">
              {tab === "functions" && <FunctionPlotter key="fn" />}
              {tab === "geometry" && <GeometryPlayground key="geo" />}
              {tab === "concepts" && <ConceptMapExplorer key="cm" />}
              {tab === "fractions" && <FractionsVisualizer key="frac" />}
              {tab === "symmetry" && <SymmetryPlayground key="sym" />}
              {tab === "thales" && <ThalesExplorer key="tha" />}
              {tab === "trigonometry" && <TrigonometryVisualizer key="trig" />}
              {tab === "absolute" && <AbsoluteValueExplorer key="abs" />}
            </AnimatePresence>
          </div>

          {/* KB sidekick — real exercises matching the active concept */}
          {tab !== "concepts" && TAB_TO_KEYWORDS[tab].keywords.length > 0 && (
            <aside className="xl:sticky xl:top-4 xl:self-start">
              <KBExerciseSidekick
                grade={GRADE_TO_KB[grade] || "4AM"}
                chapterKeywords={TAB_TO_KEYWORDS[tab].keywords}
                conceptLabel={TAB_TO_KEYWORDS[tab].label}
                accent={TAB_TO_KEYWORDS[tab].accent}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. FUNCTION PLOTTER — Interactive graph with draggable points
// ═══════════════════════════════════════════════════════════════

function FunctionPlotter() {
  const [expr, setExpr] = useState("x^2");
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [yMin, setYMin] = useState(-10);
  const [yMax, setYMax] = useState(10);
  const [showDerivative, setShowDerivative] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Parse and evaluate function
  const evalExpr = (x: number): number | null => {
    try {
      const sanitized = expr
        .replace(/\^/g, "**")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/abs/g, "Math.abs")
        .replace(/ln/g, "Math.log")
        .replace(/log/g, "Math.log10")
        .replace(/pi/g, "Math.PI")
        .replace(/e(?![a-z])/g, "Math.E");
      const fn = new Function("x", `return ${sanitized}`);
      const val = fn(x);
      return isFinite(val) ? val : null;
    } catch { return null; }
  };

  const W = 700, H = 500;
  const toSVG = (x: number, y: number) => ({
    sx: ((x - xMin) / (xMax - xMin)) * W,
    sy: H - ((y - yMin) / (yMax - yMin)) * H,
  });
  
  const fromSVG = (sx: number, sy: number) => ({
    x: (sx / W) * (xMax - xMin) + xMin,
    y: ((H - sy) / H) * (yMax - yMin) + yMin,
  });

  // Generate points
  const steps = 400;
  const dx = (xMax - xMin) / steps;
  let pathD = "";
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    const y = evalExpr(x);
    if (y === null || y < yMin - 5 || y > yMax + 5) {
      pathD += " ";
      continue;
    }
    const { sx, sy } = toSVG(x, y);
    pathD += (pathD === "" || pathD.endsWith(" ")) ? `M${sx},${sy}` : `L${sx},${sy}`;
  }

  // Grid lines
  const gridLines: JSX.Element[] = [];
  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    const { sx } = toSVG(x, 0);
    gridLines.push(
      <line key={`vg${x}`} x1={sx} y1={0} x2={sx} y2={H} className="stroke-border" strokeWidth={x === 0 ? 1.5 : 0.5} />
    );
    if (x !== 0) {
      const { sy: labelY } = toSVG(0, 0);
      gridLines.push(
        <text key={`vt${x}`} x={sx} y={Math.min(H - 5, Math.max(15, labelY + 15))} className="fill-muted-foreground text-[10px]" textAnchor="middle">{x}</text>
      );
    }
  }
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    const { sy } = toSVG(0, y);
    gridLines.push(
      <line key={`hg${y}`} x1={0} y1={sy} x2={W} y2={sy} className="stroke-border" strokeWidth={y === 0 ? 1.5 : 0.5} />
    );
    if (y !== 0) {
      const { sx: labelX } = toSVG(0, 0);
      gridLines.push(
        <text key={`ht${y}`} x={Math.min(W - 5, Math.max(15, labelX + 5))} y={sy - 3} className="fill-muted-foreground text-[10px]">{y}</text>
      );
    }
  }

  // Quick presets
  const presets = [
    { label: "x²", expr: "x^2" },
    { label: "sin(x)", expr: "sin(x)" },
    { label: "x³ - 3x", expr: "x^3 - 3*x" },
    { label: "1/x", expr: "1/x" },
    { label: "|x|", expr: "abs(x)" },
    { label: "√x", expr: "sqrt(x)" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] text-muted-foreground font-bold mb-1 block">الدالة f(x) =</label>
          <input
            value={expr}
            onChange={e => setExpr(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            dir="ltr"
            placeholder="x^2 + 3*x - 1"
          />
        </div>
        <div className="flex gap-2">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setExpr(p.expr)}
              className={`px-3 py-2 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                expr === p.expr ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowDerivative(!showDerivative)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            showDerivative ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {showDerivative ? "✨ إيقاف المتتبع" : "📏 تفعيل متتبع المشتقة"}
        </button>
      </div>

      {/* Range sliders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RangeInput label="X min" value={xMin} onChange={setXMin} min={-50} max={0} />
        <RangeInput label="X max" value={xMax} onChange={setXMax} min={1} max={50} />
        <RangeInput label="Y min" value={yMin} onChange={setYMin} min={-50} max={0} />
        <RangeInput label="Y max" value={yMax} onChange={setYMax} min={1} max={50} />
      </div>

      {/* Graph */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden cursor-crosshair relative group">
        <svg 
          viewBox={`0 0 ${W} ${H}`} 
          className="w-full" 
          style={{ maxHeight: 500 }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const sx = ((e.clientX - rect.left) / rect.width) * W;
            const sy = ((e.clientY - rect.top) / rect.height) * H;
            setMousePos({ x: sx, y: sy });
          }}
          onMouseLeave={() => setMousePos(null)}
        >
          <rect width={W} height={H} className="fill-card" />
          {gridLines}
          <path d={pathD} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Derivative/Tangent Line */}
          {showDerivative && mousePos && (() => {
            const { x: curX } = fromSVG(mousePos.x, mousePos.y);
            const curY = evalExpr(curX);
            if (curY === null) return null;
            
            const h = 0.001;
            const y1 = evalExpr(curX - h);
            const y2 = evalExpr(curX + h);
            if (y1 === null || y2 === null) return null;
            
            const slope = (y2 - y1) / (2 * h);
            const intercept = curY - slope * curX;
            
            // Draw tangent line
            const x1 = curX - 5, x2 = curX + 5;
            const yStart = slope * x1 + intercept;
            const yEnd = slope * x2 + intercept;
            
            const p1 = toSVG(x1, yStart);
            const p2 = toSVG(x2, yEnd);
            const center = toSVG(curX, curY);
            
            return (
              <g>
                <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} className="stroke-accent" strokeWidth={2} strokeDasharray="4 2" />
                <circle cx={center.sx} cy={center.sy} r={4} className="fill-accent stroke-background" strokeWidth={1.5} />
                <rect x={center.sx + 10} y={center.sy - 40} width={80} height={35} rx={6} className="fill-background/90 stroke-border shadow-sm" />
                <text x={center.sx + 15} y={center.sy - 25} className="fill-foreground text-[10px] font-black" style={{ direction: 'ltr' }}>f'({curX.toFixed(1)}) ≈ {slope.toFixed(2)}</text>
                <text x={center.sx + 15} y={center.sy - 12} className="fill-muted-foreground text-[8px]">الميل (المشتقة)</text>
              </g>
            );
          })()}
        </svg>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. GEOMETRY PLAYGROUND — Drag vertices, see measurements
// ═══════════════════════════════════════════════════════════════

interface DragPoint { label: string; x: number; y: number; }

function GeometryPlayground() {
  const [shape, setShape] = useState<"triangle" | "rectangle" | "circle">("triangle");
  const [points, setPoints] = useState<DragPoint[]>([
    { label: "A", x: 150, y: 350 },
    { label: "B", x: 450, y: 350 },
    { label: "C", x: 300, y: 100 },
  ]);
  const [dragging, setDragging] = useState<number | null>(null);

  const W = 600, H = 450;

  const dist = (a: DragPoint, b: DragPoint) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging === null) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    setPoints(prev => prev.map((p, i) => i === dragging ? { ...p, x: Math.max(20, Math.min(W - 20, x)), y: Math.max(20, Math.min(H - 20, y)) } : p));
  };

  // Measurements
  const measurements: { label: string; value: string }[] = [];
  if (shape === "triangle" && points.length >= 3) {
    const ab = dist(points[0], points[1]);
    const bc = dist(points[1], points[2]);
    const ca = dist(points[2], points[0]);
    const s = (ab + bc + ca) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - ab) * (s - bc) * (s - ca)));
    measurements.push(
      { label: "AB", value: ab.toFixed(1) },
      { label: "BC", value: bc.toFixed(1) },
      { label: "CA", value: ca.toFixed(1) },
      { label: "المحيط", value: (ab + bc + ca).toFixed(1) },
      { label: "المساحة", value: area.toFixed(1) },
    );
  } else if (shape === "rectangle" && points.length >= 3) {
    const w = Math.abs(points[1].x - points[0].x);
    const h = Math.abs(points[2].y - points[0].y);
    measurements.push(
      { label: "العرض", value: w.toFixed(1) },
      { label: "الطول", value: h.toFixed(1) },
      { label: "المحيط", value: (2 * (w + h)).toFixed(1) },
      { label: "المساحة", value: (w * h).toFixed(1) },
    );
  } else if (shape === "circle" && points.length >= 2) {
    const r = dist(points[0], points[1]);
    measurements.push(
      { label: "نصف القطر", value: r.toFixed(1) },
      { label: "المحيط", value: (2 * Math.PI * r).toFixed(1) },
      { label: "المساحة", value: (Math.PI * r * r).toFixed(1) },
    );
  }

  const switchShape = (s: typeof shape) => {
    setShape(s);
    if (s === "triangle") setPoints([{ label: "A", x: 150, y: 350 }, { label: "B", x: 450, y: 350 }, { label: "C", x: 300, y: 100 }]);
    else if (s === "rectangle") setPoints([{ label: "A", x: 150, y: 100 }, { label: "B", x: 450, y: 100 }, { label: "C", x: 150, y: 350 }]);
    else setPoints([{ label: "المركز", x: 300, y: 225 }, { label: "حافة", x: 420, y: 225 }]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Shape selector */}
      <div className="flex gap-2">
        {([["triangle", "مثلث", "△"], ["rectangle", "مستطيل", "▭"], ["circle", "دائرة", "○"]] as const).map(([s, label, icon]) => (
          <button
            key={s}
            onClick={() => switchShape(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              shape === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full cursor-crosshair"
            style={{ maxHeight: 450 }}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDragging(null)}
            onMouseLeave={() => setDragging(null)}
          >
            <rect width={W} height={H} className="fill-card" />
            {/* Grid */}
            {Array.from({ length: 13 }, (_, i) => {
              const x = (i / 12) * W;
              return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} className="stroke-border" strokeWidth={0.3} />;
            })}
            {Array.from({ length: 10 }, (_, i) => {
              const y = (i / 9) * H;
              return <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} className="stroke-border" strokeWidth={0.3} />;
            })}

            {/* Shape */}
            {shape === "triangle" && (
              <polygon
                points={points.map(p => `${p.x},${p.y}`).join(" ")}
                className="fill-primary/10 stroke-primary"
                strokeWidth={2}
              />
            )}
            {shape === "rectangle" && points.length >= 3 && (
              <rect
                x={Math.min(points[0].x, points[1].x)}
                y={Math.min(points[0].y, points[2].y)}
                width={Math.abs(points[1].x - points[0].x)}
                height={Math.abs(points[2].y - points[0].y)}
                className="fill-primary/10 stroke-primary"
                strokeWidth={2}
              />
            )}
            {shape === "circle" && points.length >= 2 && (
              <>
                <circle cx={points[0].x} cy={points[0].y} r={dist(points[0], points[1])} className="fill-primary/10 stroke-primary" strokeWidth={2} />
                <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} className="stroke-primary/50" strokeWidth={1} strokeDasharray="4 4" />
              </>
            )}

            {/* Edge labels */}
            {shape === "triangle" && points.length >= 3 && (
              <>
                {[[0, 1], [1, 2], [2, 0]].map(([a, b]) => {
                  const mx = (points[a].x + points[b].x) / 2;
                  const my = (points[a].y + points[b].y) / 2;
                  return (
                    <text key={`e${a}${b}`} x={mx} y={my - 8} className="fill-primary text-[11px] font-bold" textAnchor="middle">
                      {dist(points[a], points[b]).toFixed(0)}
                    </text>
                  );
                })}
              </>
            )}

            {/* Draggable points */}
            {points.map((p, i) => (
              <g key={i} onMouseDown={() => setDragging(i)} style={{ cursor: "grab" }}>
                <circle cx={p.x} cy={p.y} r={12} className="fill-primary/20" />
                <circle cx={p.x} cy={p.y} r={6} className="fill-primary stroke-primary-foreground" strokeWidth={2} />
                <text x={p.x} y={p.y - 18} className="fill-foreground text-[12px] font-bold" textAnchor="middle">{p.label}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Measurements panel */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground mb-3">📏 القياسات</h3>
          {measurements.map(m => (
            <div key={m.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <span className="text-xs font-bold text-foreground">{m.label}</span>
              <span className="text-sm font-mono font-black text-primary">{m.value}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-4">
            💡 اسحب النقاط لتغيير الشكل وشاهد تغيّر القياسات مباشرة
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. CONCEPT MAP EXPLORER — Interactive knowledge graph
// ═══════════════════════════════════════════════════════════════



interface ConceptNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  exerciseCount: number;
}

function ConceptMapExplorer() {
  const [skills, setSkills] = useState<any[]>([]);
  const [deps, setDeps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [sk, dp] = await Promise.all([
        supabase.from("kb_skills").select("id,name_ar,name,domain,subdomain,grade,difficulty,bloom_level").limit(2000),
        supabase.from("kb_skill_dependencies").select("from_skill_id,to_skill_id").limit(2000),
      ]);
      setSkills((sk.data || []) as any);
      setDeps((dp.data || []) as any);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-sm text-muted-foreground">⏳ جارٍ تحميل المهارات...</div>;
  if (!skills.length) return <div className="text-center py-20 text-sm text-muted-foreground">لا توجد مهارات في قاعدة المعرفة بعد</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="bg-card border border-border rounded-xl p-3">
        <h3 className="text-sm font-bold text-foreground mb-1">🧠 شجرة المفاهيم</h3>
        <p className="text-[11px] text-muted-foreground">المجال ← الوحدة ← المهارة. انقر مهارة لرؤية متطلباتها.</p>
      </div>
      <SkillTreeMap skills={skills} deps={deps} />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4. FRACTIONS VISUALIZER (1AM)
// ═══════════════════════════════════════════════════════════════
function FractionsVisualizer() {
  const [num1, setNum1] = useState(1);
  const [den1, setDen1] = useState(4);
  const [num2, setNum2] = useState(2);
  const [den2, setDen2] = useState(4);

  const drawPie = (num: number, den: number, r: number, cx: number, cy: number, color: string) => {
    const paths = [];
    for (let i = 0; i < den; i++) {
      const startAngle = (i / den) * Math.PI * 2 - Math.PI / 2;
      const endAngle = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
      const isFilled = i < num;
      paths.push(
        <path
          key={i}
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          className={isFilled ? color : "fill-muted"}
          stroke="hsl(var(--background))"
          strokeWidth={4}
        />
      );
    }
    return paths;
  };

  const sameDenom = den1 === den2;
  const commonDenom = (den1 * den2); // simplistic
  const adjustedNum1 = sameDenom ? num1 : num1 * den2;
  const adjustedNum2 = sameDenom ? num2 : num2 * den1;
  const sumNum = adjustedNum1 + adjustedNum2;
  const sumDen = sameDenom ? den1 : commonDenom;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-black">جمع الكسرين هندسياً 🍕</h2>
        <p className="text-xs text-muted-foreground">استكشف كيف نجمع الأجزاء. إذا اختلفت المقامات، يجب توحيدها أولاً!</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="text-primary font-bold text-sm text-center">الكسر الأول</div>
              <RangeInput label="البسط" value={num1} onChange={setNum1} min={0} max={den1} />
              <RangeInput label="المقام" value={den1} onChange={(v) => { setDen1(v); if(num1>v) setNum1(v); }} min={1} max={12} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-destructive font-bold text-sm text-center">الكسر الثاني</div>
              <RangeInput label="البسط" value={num2} onChange={setNum2} min={0} max={den2} />
              <RangeInput label="المقام" value={den2} onChange={(v) => { setDen2(v); if(num2>v) setNum2(v); }} min={1} max={12} />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-3xl">
          <svg viewBox="0 0 400 200" className="w-full max-w-sm">
            {/* Pie 1 */}
            <g>{drawPie(num1, den1, 40, 60, 100, "fill-primary")}</g>
            <text x={60} y={160} textAnchor="middle" className="text-xs font-bold fill-foreground" style={{ direction: "ltr" }}>{num1}/{den1}</text>
            
            <text x={120} y={105} textAnchor="middle" className="text-2xl font-black fill-muted-foreground">+</text>
            
            {/* Pie 2 */}
            <g>{drawPie(num2, den2, 40, 180, 100, "fill-destructive")}</g>
            <text x={180} y={160} textAnchor="middle" className="text-xs font-bold fill-foreground" style={{ direction: "ltr" }}>{num2}/{den2}</text>
            
            <text x={240} y={105} textAnchor="middle" className="text-2xl font-black fill-muted-foreground">=</text>

            {/* Sum Pie */}
            <g>{drawPie(sumNum, sumDen, 50, 320, 100, "fill-geometry")}</g>
            <text x={320} y={170} textAnchor="middle" className="text-sm font-bold fill-foreground" style={{ direction: "ltr" }}>
              {sameDenom ? `${sumNum}/${sumDen}` : `${adjustedNum1}/${sumDen} + ${adjustedNum2}/${sumDen} = ${sumNum}/${sumDen}`}
            </text>
          </svg>
          {!sameDenom && (
            <div className="mt-4 px-4 py-2 bg-destructive/10 text-destructive text-xs font-bold rounded-xl border border-destructive/20">
              ⚠️ المقامات مختلفة! قمنا بتوحيدها إلى المنوال {sumDen}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5. SYMMETRY PLAYGROUND (2AM)
// ═══════════════════════════════════════════════════════════════
function SymmetryPlayground() {
  const [symType, setSymType] = useState<"axial"|"central">("axial");
  const [points, setPoints] = useState([{x: -50, y: -50}, {x: -20, y: -80}, {x: -80, y: -20}]);
  const [dragging, setDragging] = useState<number | null>(null);

  const W = 400, H = 400;
  const ox = W/2, oy = H/2;

  const getSymmetric = (p: {x: number, y: number}) => {
    if (symType === "axial") return { x: -p.x, y: p.y }; // Symmetry across Y axis
    return { x: -p.x, y: -p.y }; // Central symmetry (origin)
  };

  const handleMouseMove = (e: any) => {
    if (dragging === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - ox;
    const y = e.clientY - rect.top - oy;
    const newPoints = [...points];
    newPoints[dragging] = { x, y };
    setPoints(newPoints);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-4">
          <h2 className="text-base font-black">التناظر المركزي والمحوري 🦋</h2>
          <p className="text-xs text-muted-foreground">اسحب رؤوس المثلث، وشاهد كيف يتحرك خياله بالتناظر.</p>
          <div className="flex gap-2 bg-muted/30 p-1 rounded-xl">
            <button className={`flex-1 py-2 text-xs font-bold rounded-lg ${symType === "axial" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setSymType("axial")}>محوري (محور التراتيب)</button>
            <button className={`flex-1 py-2 text-xs font-bold rounded-lg ${symType === "central" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} onClick={() => setSymType("central")}>مركزي (المبدأ O)</button>
          </div>
          <div className="p-3 bg-muted/20 rounded-xl border border-border">
            <h4 className="text-xs font-bold text-primary mb-2">إحداثيات النقاط</h4>
            {points.map((p, i) => {
              const sym = getSymmetric(p);
              return (
                <div key={i} className="text-[10px] flex justify-between font-mono" dir="ltr">
                  <span className="text-foreground">P{i+1}({p.x.toFixed(0)}, {-p.y.toFixed(0)})</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-destructive">P'{i+1}({sym.x.toFixed(0)}, {-sym.y.toFixed(0)})</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-border bg-card overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={handleMouseMove} onMouseUp={() => setDragging(null)} onMouseLeave={() => setDragging(null)}>
            <rect width={W} height={H} fill="transparent" />
            <line x1={ox} y1={0} x2={ox} y2={H} className={symType==="axial" ? "stroke-primary" : "stroke-border"} strokeWidth={symType==="axial"?2:1} strokeDasharray={symType==="axial"?"none":"5,5"} />
            <line x1={0} y1={oy} x2={W} y2={oy} className="stroke-border" strokeWidth={1} />
            {symType === "central" && <circle cx={ox} cy={oy} r={4} className="fill-primary" />}
            
            {/* Original Shape */}
            <polygon points={points.map(p => `${ox+p.x},${oy+p.y}`).join(" ")} className="fill-foreground/10 stroke-foreground" strokeWidth={2} />
            {/* Symmetric Shape */}
            <polygon points={points.map(p => {
              const sym = getSymmetric(p);
              return `${ox+sym.x},${oy+sym.y}`;
            }).join(" ")} className="fill-destructive/10 stroke-destructive" strokeWidth={2} strokeDasharray="4,4" />
            
            {/* Construction Lines */}
            {points.map((p, i) => {
              const sym = getSymmetric(p);
              return <line key={`l${i}`} x1={ox+p.x} y1={oy+p.y} x2={ox+sym.x} y2={oy+sym.y} className="stroke-muted-foreground/30" strokeWidth={1} strokeDasharray="2,2" />;
            })}

            {/* Vertices */}
            {points.map((p, i) => (
              <g key={`p${i}`} onMouseDown={() => setDragging(i)} style={{cursor: "grab"}}>
                <circle cx={ox+p.x} cy={oy+p.y} r={12} className="fill-transparent" />
                <circle cx={ox+p.x} cy={oy+p.y} r={5} className="fill-foreground" />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6. THALES EXPLORER (3AM)
// ═══════════════════════════════════════════════════════════════
function ThalesExplorer() {
  const [ratio, setRatio] = useState(0.5); // AM/AB

  const A = {x: 200, y: 50};
  const B = {x: 50, y: 300};
  const C = {x: 350, y: 300};
  
  const M = {x: A.x + (B.x - A.x) * ratio, y: A.y + (B.y - A.y) * ratio};
  const N = {x: A.x + (C.x - A.x) * ratio, y: A.y + (C.y - A.y) * ratio};

  const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  const AB = dist(A, B); const AC = dist(A, C); const BC = dist(B, C);
  const AM = dist(A, M); const AN = dist(A, N); const MN = dist(M, N);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">خاصية طالس المباشرة 📏</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            بما أن المستقيمين (MN) و (BC) متوازيان، فإن أطوال أضلاع المثلث AMN متناسبة مع أطوال أضلاع المثلث ABC.
          </p>
          <RangeInput label="غيّر موضع (MN)" value={ratio} onChange={setRatio} min={0.1} max={0.9} />
          
          <div className="mt-4 p-4 rounded-xl bg-card border border-border text-center font-mono font-bold text-sm" dir="ltr">
            <div className="flex justify-center items-center gap-4">
              <div className="flex gap-2">
                <div className="flex flex-col items-center"><span>AM</span><span className="w-6 h-px bg-foreground my-1"/><span className="text-primary">AB</span></div>
                <div className="flex flex-col items-center justify-center">=</div>
                <div className="flex flex-col items-center"><span>AN</span><span className="w-6 h-px bg-foreground my-1"/><span className="text-primary">AC</span></div>
                <div className="flex flex-col items-center justify-center">=</div>
                <div className="flex flex-col items-center"><span>MN</span><span className="w-6 h-px bg-foreground my-1"/><span className="text-primary">BC</span></div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground flex justify-center gap-4">
              <span>{AM.toFixed(0)} / {AB.toFixed(0)}</span>
              <span>=</span>
              <span>{AN.toFixed(0)} / {AC.toFixed(0)}</span>
              <span>=</span>
              <span>{MN.toFixed(0)} / {BC.toFixed(0)}</span>
            </div>
            <div className="mt-2 text-destructive">≈ {ratio.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex justify-center bg-card rounded-3xl border border-border overflow-hidden p-4">
          <svg viewBox="0 0 400 350" className="w-full">
            <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} className="fill-primary/5 stroke-primary" strokeWidth={2} />
            <line x1={M.x - 30} y1={M.y} x2={N.x + 30} y2={N.y} className="stroke-destructive" strokeWidth={2} />
            <line x1={B.x - 30} y1={B.y} x2={C.x + 30} y2={C.y} className="stroke-primary" strokeWidth={2} />
            
            <circle cx={A.x} cy={A.y} r={4} className="fill-foreground" />
            <text x={A.x} y={A.y-10} textAnchor="middle" className="text-xs font-bold fill-foreground">A</text>
            <circle cx={B.x} cy={B.y} r={4} className="fill-foreground" />
            <text x={B.x-10} y={B.y+15} textAnchor="middle" className="text-xs font-bold fill-foreground">B</text>
            <circle cx={C.x} cy={C.y} r={4} className="fill-foreground" />
            <text x={C.x+10} y={C.y+15} textAnchor="middle" className="text-xs font-bold fill-foreground">C</text>
            <circle cx={M.x} cy={M.y} r={4} className="fill-destructive" />
            <text x={M.x-15} y={M.y} textAnchor="middle" className="text-xs font-bold fill-destructive">M</text>
            <circle cx={N.x} cy={N.y} r={4} className="fill-destructive" />
            <text x={N.x+15} y={N.y} textAnchor="middle" className="text-xs font-bold fill-destructive">N</text>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 7. TRIGONOMETRY VISUALIZER (4AM / BEM)
// ═══════════════════════════════════════════════════════════════
function TrigonometryVisualizer() {
  const [angle, setAngle] = useState(30);
  const hypotenuse = 200;
  const rad = (angle * Math.PI) / 180;
  
  const opposite = Math.sin(rad) * hypotenuse;
  const adjacent = Math.cos(rad) * hypotenuse;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">حساب المثلثات في مثلث قائم 🔺</h2>
          <p className="text-[11px] text-muted-foreground">تتغير النسب المثلثية بتغير الزاوية، لكنها متقلبة مع الحجم.</p>
          <RangeInput label="الزاوية ألفا (°)" value={angle} onChange={setAngle} min={5} max={85} />
          
          <div className="grid grid-cols-1 gap-3 mt-4" dir="ltr">
            <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
              <span className="font-bold text-xs text-muted-foreground">sin(a) = المقابل / الوتر</span>
              <span className="font-mono text-sm text-primary font-black">{Math.sin(rad).toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
              <span className="font-bold text-xs text-muted-foreground">cos(a) = المجاور / الوتر</span>
              <span className="font-mono text-sm text-destructive font-black">{Math.cos(rad).toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-card border border-border">
              <span className="font-bold text-xs text-muted-foreground">tan(a) = المقابل / المجاور</span>
              <span className="font-mono text-sm text-geometry font-black">{Math.tan(rad).toFixed(3)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center bg-card rounded-3xl border border-border p-6 overflow-hidden">
          <svg viewBox="0 0 350 300" className="w-full">
            <g transform={`translate(50, 250)`}>
              {/* Triangle */}
              <polygon points={`0,0 ${adjacent},0 ${adjacent},${-opposite}`} className="fill-primary/10 stroke-primary" strokeWidth={2} />
              
              {/* Right angle */}
              <rect x={adjacent-15} y={-15} width={15} height={15} className="fill-none stroke-foreground" />
              
              {/* Angle Arc */}
              <path d={`M 30,0 A 30,30 0 0,0 ${30*Math.cos(rad)},${-30*Math.sin(rad)}`} className="stroke-destructive fill-none" strokeWidth={2} />
              <text x={40} y={-10} className="text-[10px] font-bold fill-destructive">{angle}°</text>
              
              {/* Labels */}
              <text x={adjacent/2} y={15} textAnchor="middle" className="text-[10px] font-bold fill-destructive">المجاور</text>
              <text x={adjacent+15} y={-opposite/2} textAnchor="middle" className="text-[10px] font-bold fill-primary">المقابل</text>
              <text x={adjacent/2-20} y={-opposite/2-10} textAnchor="middle" className="text-[10px] font-bold fill-foreground transform -rotate-30">الوتر</text>
            </g>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 8. ABSOLUTE VALUE EXPLORER (1AS)
// ═══════════════════════════════════════════════════════════════
function AbsoluteValueExplorer() {
  const [valX, setValX] = useState(3);
  const [center, setCenter] = useState(0);

  const W = 600, H = 200;
  const padding = 40;
  const scale = (W - 2 * padding) / 20; // from -10 to 10
  
  const toSVG = (x: number) => padding + (x + 10) * scale;
  const cx = toSVG(center);
  const px = toSVG(valX);
  
  const dist = Math.abs(valX - center);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">المسافة والقيمة المطلقة ↔️</h2>
          <p className="text-[11px] text-muted-foreground">القيمة المطلقة |x - c| تمثل المسافة بين النقطة x والمركز c على مستقيم الأعداد.</p>
          
          <RangeInput label="المركز (c)" value={center} onChange={setCenter} min={-8} max={8} />
          <RangeInput label="النقطة (x)" value={valX} onChange={setValX} min={-10} max={10} />
          
          <div className="p-4 rounded-xl bg-card border border-border text-center font-mono font-bold mt-4" dir="ltr">
            <div className="text-sm text-foreground mb-2">| x - {center < 0 ? `(${center})` : center} | = d</div>
            <div className="text-lg text-primary">| {valX} - {center < 0 ? `(${center})` : center} | = {dist}</div>
          </div>
        </div>
        
        <div className="flex justify-center items-center bg-card rounded-3xl border border-border p-6 overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {/* Number Line */}
            <line x1={padding - 20} y1={H/2} x2={W - padding + 20} y2={H/2} className="stroke-muted-foreground/50" strokeWidth={2} />
            
            {/* Ticks */}
            {Array.from({length: 21}, (_, i) => i - 10).map(tick => (
              <g key={tick}>
                <line x1={toSVG(tick)} y1={H/2 - 5} x2={toSVG(tick)} y2={H/2 + 5} className="stroke-muted-foreground/50" strokeWidth={1} />
                {tick % 2 === 0 && <text x={toSVG(tick)} y={H/2 + 20} textAnchor="middle" className="text-[10px] font-bold fill-muted-foreground">{tick}</text>}
              </g>
            ))}
            
            {/* Distance Arc */}
            <path d={`M ${cx} ${H/2 - 10} Q ${(cx + px) / 2} ${H/2 - 60} ${px} ${H/2 - 10}`} fill="none" className="stroke-destructive" strokeWidth={2} strokeDasharray="4 4" />
            <text x={(cx + px) / 2} y={H/2 - 40} textAnchor="middle" className="text-[12px] font-black fill-destructive">المسافة = {dist}</text>

            {/* Center point */}
            <circle cx={cx} cy={H/2} r={6} className="fill-primary" />
            <text x={cx} y={H/2 - 15} textAnchor="middle" className="text-[11px] font-bold fill-primary">c</text>

            {/* X point */}
            <circle cx={px} cy={H/2} r={6} className="fill-foreground" />
            <text x={px} y={H/2 - 15} textAnchor="middle" className="text-[11px] font-bold fill-foreground">x</text>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════ Helper ═══════


function RangeInput({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-bold">{label}: {value}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-muted accent-primary"
      />
    </div>
  );
}
