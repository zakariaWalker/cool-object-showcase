// ===== Visual Explorer — Interactive function plotter, geometry manipulator, concept map =====
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ExplorerTab = "functions" | "geometry" | "concepts";

const TABS: { id: ExplorerTab; label: string; emoji: string }[] = [
  { id: "functions", label: "رسم الدوال", emoji: "📈" },
  { id: "geometry", label: "الأشكال الهندسية", emoji: "📐" },
  { id: "concepts", label: "خريطة المفاهيم", emoji: "🧠" },
];

export default function VisualExplorer() {
  const [tab, setTab] = useState<ExplorerTab>("functions");

  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">
      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-border px-4 py-2 flex gap-2" style={{ background: "linear-gradient(to left, hsl(var(--functions) / 0.08), hsl(var(--functions) / 0.03), hsl(var(--background)))" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
        <AnimatePresence mode="wait">
          {tab === "functions" && <FunctionPlotter key="fn" />}
          {tab === "geometry" && <GeometryPlayground key="geo" />}
          {tab === "concepts" && <ConceptMapExplorer key="cm" />}
        </AnimatePresence>
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
      </div>

      {/* Range sliders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RangeInput label="X min" value={xMin} onChange={setXMin} min={-50} max={0} />
        <RangeInput label="X max" value={xMax} onChange={setXMax} min={1} max={50} />
        <RangeInput label="Y min" value={yMin} onChange={setYMin} min={-50} max={0} />
        <RangeInput label="Y max" value={yMax} onChange={setYMax} min={1} max={50} />
      </div>

      {/* Graph */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 500 }}>
          <rect width={W} height={H} className="fill-card" />
          {gridLines}
          <path d={pathD} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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

import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ConceptNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  exerciseCount: number;
}

function ConceptMapExplorer() {
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    setLoading(true);
    const { data: patterns } = await (supabase as any).from("kb_patterns").select("*");
    const { data: decons } = await (supabase as any).from("kb_deconstructions").select("pattern_id");

    if (patterns) {
      const countMap: Record<string, number> = {};
      decons?.forEach((d: any) => { countMap[d.pattern_id] = (countMap[d.pattern_id] || 0) + 1; });

      const W = 700, H = 500;
      const mapped = patterns.map((p: any, i: number) => {
        const angle = (i / patterns.length) * 2 * Math.PI;
        const radius = 150 + Math.random() * 80;
        return {
          id: p.id,
          name: p.name,
          type: p.type || "",
          x: W / 2 + Math.cos(angle) * radius,
          y: H / 2 + Math.sin(angle) * radius,
          exerciseCount: countMap[p.id] || 0,
        };
      });
      setNodes(mapped);
    }
    setLoading(false);
  };

  const selectNode = async (nodeId: string) => {
    setSelectedNode(nodeId);
    const { data } = await (supabase as any)
      .from("kb_deconstructions")
      .select("exercise_id, kb_exercises(id, text, grade, type)")
      .eq("pattern_id", nodeId)
      .limit(10);
    setExercises(data?.map((d: any) => d.kb_exercises).filter(Boolean) || []);
  };

  const selected = nodes.find(n => n.id === selectedNode);

  if (loading) return <div className="text-center py-20 text-muted-foreground">جاري تحميل الخريطة...</div>;

  const W = 700, H = 500;

  // Edges: connect nodes that share concepts (simplified: connect neighbors)
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < Math.min(i + 3, nodes.length); j++) {
      edges.push([i, j]);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 500 }}>
            <rect width={W} height={H} className="fill-card" />
            {/* Edges */}
            {edges.map(([a, b], i) => (
              <line
                key={i}
                x1={nodes[a].x} y1={nodes[a].y}
                x2={nodes[b].x} y2={nodes[b].y}
                className="stroke-border" strokeWidth={0.5} opacity={0.4}
              />
            ))}
            {/* Nodes */}
            {nodes.map(n => {
              const isSelected = n.id === selectedNode;
              const r = 8 + n.exerciseCount * 2;
              return (
                <g key={n.id} onClick={() => selectNode(n.id)} style={{ cursor: "pointer" }}>
                  <circle cx={n.x} cy={n.y} r={r + 6} className={isSelected ? "fill-primary/20" : "fill-transparent"} />
                  <circle cx={n.x} cy={n.y} r={r} className={isSelected ? "fill-primary" : "fill-primary/40"} />
                  <text x={n.x} y={n.y + r + 14} className="fill-foreground text-[9px] font-bold" textAnchor="middle">
                    {n.name.length > 15 ? n.name.slice(0, 13) + "…" : n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Details panel */}
        <div className="space-y-3">
          {selected ? (
            <>
              <h3 className="text-sm font-black text-foreground">{selected.name}</h3>
              <div className="text-[10px] text-muted-foreground">{selected.type}</div>
              <div className="text-xs text-muted-foreground">{selected.exerciseCount} تمارين مرتبطة</div>
              <div className="space-y-2 mt-4">
                <h4 className="text-[11px] font-bold text-foreground">التمارين:</h4>
                {exercises.map((ex: any) => (
                  <div key={ex.id} className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground line-clamp-3">
                    {ex.text?.slice(0, 120)}...
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-xs">
              👆 اضغط على عقدة لاستكشاف المفهوم والتمارين المرتبطة
            </div>
          )}
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
