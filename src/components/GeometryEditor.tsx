// ===== Geometry Editor — SVG canvas for geometric answers =====
// Adaptive to:
//  • Level (primary | middle | secondary): tool palette tuned to the curriculum
//  • Domain detected from the exercise text (basic / transformations / functions / analytic)
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Undo2, MousePointer2,
  Circle as CircleIcon, MoveRight,
  Maximize2, Crosshair, Compass, CheckCircle2,
  GraduationCap, Activity, ChevronDown, Triangle, Square, RotateCw, FlipHorizontal
} from "lucide-react";

type Level = "primary" | "middle" | "secondary";
type Domain = "basic" | "transformations" | "functions" | "analytic";

interface Point { x: number; y: number; label: string; isIntersection?: boolean; }
interface Segment { from: string; to: string; type: "segment" | "vector" | "ray" | "line"; }
interface Circle { center: string; pointOn: string; }
interface Angle { points: [string, string, string]; }
interface Func { formula: string; color: string; }

interface GeometryEditorProps {
  onSubmit: (data: any) => void;
  initialLevel?: Level;
  exerciseText?: string;        // used to auto-detect the geometric domain
  lockLevel?: boolean;          // when true, disables manual level switching
  className?: string;
}

// Tools available per level — extended with shape shortcuts and transformations
const TOOLS_BY_LEVEL: Record<Level, any[]> = {
  primary: [
    { id: "point", icon: <Plus size={16} />, label: "نقطة", hint: "انقر لإضافة نقطة" },
    { id: "segment", icon: <div className="w-4 h-0.5 bg-current" />, label: "خط", hint: "صل بين نقطتين" },
    { id: "triangle", icon: <Triangle size={16} />, label: "مثلث", hint: "أنشئ مثلثاً (3 نقرات)" },
    { id: "rect", icon: <Square size={16} />, label: "مستطيل", hint: "أنشئ مستطيلاً (نقرتان)" },
    { id: "circle", icon: <CircleIcon size={16} />, label: "دائرة", hint: "مركز ثم نقطة على المحيط" },
    { id: "move", icon: <MousePointer2 size={16} />, label: "تحريك", hint: "اسحب لتحريك العناصر" },
  ],
  middle: [
    { id: "point", icon: <Plus size={16} />, label: "نقطة", hint: "إضافة نقطة" },
    { id: "segment", icon: <div className="w-4 h-0.5 bg-current" />, label: "قطعة", hint: "رسم قطعة مستقيمة" },
    { id: "circle", icon: <CircleIcon size={16} />, label: "دائرة", hint: "رسم دائرة" },
    { id: "angle", icon: <Compass size={16} />, label: "زاوية", hint: "قياس/رسم زاوية" },
    { id: "vector", icon: <MoveRight size={16} />, label: "شعاع", hint: "رسم شعاع (انسحاب)" },
    { id: "rotate", icon: <RotateCw size={16} />, label: "دوران", hint: "تحويل بالدوران" },
    { id: "reflect", icon: <FlipHorizontal size={16} />, label: "تماثل", hint: "تماثل محوري" },
    { id: "move", icon: <MousePointer2 size={16} />, label: "تحريك", hint: "تحريك العناصر" },
  ],
  secondary: [
    { id: "point", icon: <Plus size={16} />, label: "نقطة", hint: "إضافة نقطة بالإحداثيات" },
    { id: "line", icon: <div className="w-full h-px bg-current" />, label: "مستقيم", hint: "مستقيم (معادلة)" },
    { id: "function", icon: <Activity size={16} />, label: "دالة", hint: "رسم منحنى دالة f(x)" },
    { id: "vector", icon: <MoveRight size={16} />, label: "شعاع", hint: "أشعة في المستوي" },
    { id: "circle", icon: <CircleIcon size={16} />, label: "دائرة", hint: "دائرة" },
    { id: "move", icon: <MousePointer2 size={16} />, label: "تحريك", hint: "تحريك العناصر" },
  ]
};

const LEVEL_LABELS: Record<Level, string> = {
  primary: "ابتدائي",
  middle: "متوسط",
  secondary: "ثانوي (BAC)"
};

const DOMAIN_LABELS: Record<Domain, string> = {
  basic: "أشكال أساسية",
  transformations: "تحويلات",
  functions: "دوال ومنحنيات",
  analytic: "هندسة تحليلية",
};

// Detect geometric subdomain from exercise text → pre-selects the most useful tool.
function detectDomain(text?: string): Domain {
  const t = (text || "").toLowerCase();
  if (/دالة|منحنى|f\s*\(|y\s*=|courbe|function|graph/.test(t)) return "functions";
  if (/انسحاب|دوران|تماثل|تحويل|translation|rotation|symét|reflection/.test(t)) return "transformations";
  if (/إحداث|معلم|repère|vecteur|coord|axe/.test(t)) return "analytic";
  return "basic";
}

function defaultToolForDomain(level: Level, domain: Domain): string {
  if (domain === "functions") return level === "secondary" ? "function" : "segment";
  if (domain === "transformations") return level === "middle" ? "vector" : "segment";
  if (domain === "analytic") return "point";
  if (level === "primary") return "triangle";
  return "point";
}

export function GeometryEditor({ onSubmit, initialLevel = "middle", exerciseText, lockLevel = false, className = "" }: GeometryEditorProps) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const domain = useMemo(() => detectDomain(exerciseText), [exerciseText]);
  const [points, setPoints] = useState<Point[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [functions, setFunctions] = useState<Func[]>([]);
  const [notes, setNotes] = useState("");
  const [tool, setTool] = useState<string>(() => defaultToolForDomain(initialLevel, detectDomain(exerciseText)));
  const [selection, setSelection] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(initialLevel !== "primary" || ["analytic", "functions"].includes(detectDomain(exerciseText)));
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  // When parent updates initialLevel (e.g. profile loads after mount), respect it.
  useEffect(() => {
    setLevel(initialLevel);
    setTool(defaultToolForDomain(initialLevel, domain));
    setShowAxes(initialLevel !== "primary" || domain === "analytic" || domain === "functions");
  }, [initialLevel, domain]);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const nextLabel = useRef(65);

  const getSVGPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 400),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 300),
    };
  }, []);

  const findNearestPoint = (x: number, y: number, threshold = 15): Point | null => {
    let nearest: Point | null = null;
    let minDist = threshold;
    for (const p of points) {
      const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  };

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging) return;
    const { x, y } = getSVGPoint(e);
    const nearest = findNearestPoint(x, y);

    if (tool === "point") {
      if (!nearest) {
        const label = String.fromCharCode(nextLabel.current++);
        setPoints([...points, { x, y, label }]);
      }
    } else if (tool === "segment" || tool === "vector" || tool === "line") {
      if (nearest) {
        if (selection.length === 0) {
          setSelection([nearest.label]);
        } else if (selection[0] !== nearest.label) {
          setSegments([...segments, { 
            from: selection[0], 
            to: nearest.label, 
            type: tool === "vector" ? "vector" : tool === "line" ? "line" : "segment"
          }]);
          setSelection([]);
        }
      }
    } else if (tool === "circle") {
      if (nearest) {
        if (selection.length === 0) {
          setSelection([nearest.label]);
        } else if (selection[0] !== nearest.label) {
          setCircles([...circles, { center: selection[0], pointOn: nearest.label }]);
          setSelection([]);
        }
      }
    } else if (tool === "angle") {
      if (nearest) {
        const newSel = [...selection, nearest.label];
        if (newSel.length === 3) {
          setAngles([...angles, { points: newSel as [string, string, string] }]);
          setSelection([]);
        } else {
          setSelection(newSel);
        }
      }
    } else if (tool === "function") {
      const formula = prompt("أدخل معادلة الدالة (مثال: x*x/20):", "x*x/100");
      if (formula) setFunctions([...functions, { formula, color: "hsl(var(--primary))" }]);
    } else if (tool === "triangle") {
      // 3-click triangle
      if (!nearest) {
        const label = String.fromCharCode(nextLabel.current++);
        const newPts = [...points, { x, y, label }];
        setPoints(newPts);
        const sel = [...selection, label];
        if (sel.length === 3) {
          setSegments([
            ...segments,
            { from: sel[0], to: sel[1], type: "segment" },
            { from: sel[1], to: sel[2], type: "segment" },
            { from: sel[2], to: sel[0], type: "segment" },
          ]);
          setSelection([]);
        } else {
          setSelection(sel);
        }
      }
    } else if (tool === "rect") {
      // 2-click axis-aligned rectangle (opposite corners)
      if (!nearest) {
        const label = String.fromCharCode(nextLabel.current++);
        const newPts = [...points, { x, y, label }];
        setPoints(newPts);
        const sel = [...selection, label];
        if (sel.length === 2) {
          const a = newPts.find(p => p.label === sel[0])!;
          const b = newPts.find(p => p.label === sel[1])!;
          const c = { x: b.x, y: a.y, label: String.fromCharCode(nextLabel.current++) };
          const d = { x: a.x, y: b.y, label: String.fromCharCode(nextLabel.current++) };
          setPoints([...newPts, c, d]);
          setSegments([
            ...segments,
            { from: a.label, to: c.label, type: "segment" },
            { from: c.label, to: b.label, type: "segment" },
            { from: b.label, to: d.label, type: "segment" },
            { from: d.label, to: a.label, type: "segment" },
          ]);
          setSelection([]);
        } else {
          setSelection(sel);
        }
      }
    } else if (tool === "rotate" || tool === "reflect") {
      // Pick two points → record the transformation as a note (geometric instruction).
      if (nearest) {
        const sel = [...selection, nearest.label];
        if (sel.length === 2) {
          const verb = tool === "rotate" ? "دوران مركزه" : "تماثل محوره";
          setNotes((n) => `${n}${n ? "\n" : ""}${verb} ${sel[0]} يُطبَّق على ${sel[1]}`);
          setSelection([]);
        } else {
          setSelection(sel);
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent, label: string) => {
    if (tool === "move") {
      e.stopPropagation();
      setDragging(label);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging && tool === "move") {
      const { x, y } = getSVGPoint(e);
      setPoints(pts => pts.map(p => p.label === dragging ? { ...p, x, y } : p));
    }
  };

  const undo = () => {
    if (functions.length > 0) setFunctions(functions.slice(0, -1));
    else if (angles.length > 0) setAngles(angles.slice(0, -1));
    else if (circles.length > 0) setCircles(circles.slice(0, -1));
    else if (segments.length > 0) setSegments(segments.slice(0, -1));
    else if (points.length > 0) {
      nextLabel.current--;
      setPoints(points.slice(0, -1));
    }
    setSelection([]);
  };

  const getPoint = (label: string): Point | undefined => points.find(p => p.label === label);

  const renderFunction = (f: Func) => {
    const pointsArray: string[] = [];
    const step = 5;
    const originX = 200;
    const originY = 150;
    
    for (let i = 0; i <= 400; i += step) {
      const xVal = (i - originX) / 20; // Scale 1 unit = 20px
      try {
        // Safe evaluation (very basic)
        const yVal = eval(f.formula.replace(/x/g, `(${xVal})`));
        const svgY = originY - (yVal * 20);
        if (svgY >= 0 && svgY <= 300) {
          pointsArray.push(`${i},${svgY}`);
        }
      } catch (e) { /* skip */ }
    }
    return pointsArray.length > 2 ? `M ${pointsArray.join(" L ")}` : "";
  };

  return (
    <div className={`rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Compass size={18} />
          </div>
          <div>
            <button
              onClick={() => !lockLevel && setShowLevelSelect(!showLevelSelect)}
              disabled={lockLevel}
              className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors disabled:cursor-default disabled:hover:text-foreground"
              title={lockLevel ? "المستوى مُعتمد من ملفك الشخصي" : "تغيير المستوى"}
            >
              محرر الهندسة ({LEVEL_LABELS[level]}) {lockLevel && "🔒"}
              {!lockLevel && (
                <ChevronDown size={14} className={`transition-transform ${showLevelSelect ? "rotate-180" : ""}`} />
              )}
            </button>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span>أنشئ أشكالاً هندسية بدقة رياضية</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                {DOMAIN_LABELS[domain]}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={undo} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-all border border-transparent shadow-sm">
            <Undo2 size={16} />
          </button>
          <button onClick={() => { setPoints([]); setSegments([]); setCircles([]); setAngles([]); setFunctions([]); nextLabel.current = 65; }} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-destructive transition-all border border-transparent">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Level Selector — hidden when locked */}
      <AnimatePresence>
        {showLevelSelect && !lockLevel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/5 border-b border-border/50 overflow-hidden">
            <div className="p-3 flex gap-2">
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l => (
                <button
                  key={l}
                  onClick={() => { setLevel(l); setShowLevelSelect(false); setTool(defaultToolForDomain(l, domain)); setShowAxes(l !== "primary" || domain === "analytic" || domain === "functions"); }}
                  className={`flex-1 flex flex-col items-center p-2 rounded-xl border transition-all ${level === l ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <GraduationCap size={16} />
                  <span className="text-[10px] font-bold mt-1">{LEVEL_LABELS[l]}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border/50 bg-muted/10">
        {TOOLS_BY_LEVEL[level].map(t => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setSelection([]); }}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${tool === t.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <div className="w-px h-8 bg-border/50 mx-1 hidden sm:block" />
        <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-xl border transition-all ${showGrid ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground"}`}>
          <Maximize2 size={16} />
        </button>
        <button onClick={() => setShowAxes(!showAxes)} className={`p-2 rounded-xl border transition-all ${showAxes ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground"}`}>
          <Crosshair size={16} />
        </button>
      </div>

      {/* Canvas */}
      <div className="relative bg-background overflow-hidden aspect-[4/3]">
        <svg
          ref={svgRef}
          viewBox="0 0 400 300"
          className="w-full h-full cursor-crosshair touch-none"
          onClick={handleSVGClick}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        >
          {showGrid && (
            <g className="text-border/40">
              <defs>
                <pattern id="grid-pattern-gen" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#grid-pattern-gen)" />
            </g>
          )}

          {showAxes && (
            <g className="text-primary/40">
              <line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" strokeWidth="1" />
              <line x1="200" y1="0" x2="200" y2="300" stroke="currentColor" strokeWidth="1" />
              <text x="390" y="145" className="fill-current text-[8px]">x</text>
              <text x="205" y="10" className="fill-current text-[8px]">y</text>
            </g>
          )}

          {functions.map((f, i) => (
            <path key={i} d={renderFunction(f)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
          ))}

          {angles.map((ang, i) => {
            const p1 = getPoint(ang.points[0]), p2 = getPoint(ang.points[1]), p3 = getPoint(ang.points[2]);
            if (!p1 || !p2 || !p3) return null;
            const a1 = Math.atan2(p1.y - p2.y, p1.x - p2.x), a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
            const r = 20, sX = p2.x + Math.cos(a1)*r, sY = p2.y + Math.sin(a1)*r, eX = p2.x + Math.cos(a2)*r, eY = p2.y + Math.sin(a2)*r;
            return <path key={i} d={`M ${sX} ${sY} A ${r} ${r} 0 ${Math.abs(a2-a1)>Math.PI?1:0} ${a2>a1?1:0} ${eX} ${eY}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.6" />;
          })}

          {circles.map((c, i) => {
            const center = getPoint(c.center), pOn = getPoint(c.pointOn);
            if (!center || !pOn) return null;
            const r = Math.sqrt((pOn.x - center.x)**2 + (pOn.y - center.y)**2);
            return <circle key={i} cx={center.x} cy={center.y} r={r} fill="hsl(var(--primary)/0.05)" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 2" />;
          })}

          {segments.map((seg, i) => {
            const from = getPoint(seg.from), to = getPoint(seg.to);
            if (!from || !to) return null;
            if (seg.type === "vector") {
              const a = Math.atan2(to.y-from.y, to.x-from.x), h = 10;
              return <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="hsl(var(--primary))" strokeWidth="2" />
                <path d={`M ${to.x} ${to.y} L ${to.x - h*Math.cos(a-Math.PI/6)} ${to.y - h*Math.sin(a-Math.PI/6)} M ${to.x} ${to.y} L ${to.x - h*Math.cos(a+Math.PI/6)} ${to.y - h*Math.sin(a+Math.PI/6)}`} stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
              </g>;
            }
            if (seg.type === "line") {
              const dx = to.x - from.x, dy = to.y - from.y;
              return <line key={i} x1={from.x - dx*100} y1={from.y - dy*100} x2={to.x + dx*100} y2={to.y + dy*100} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="5 2" />;
            }
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />;
          })}

          {points.map(p => (
            <g key={p.label} onMouseDown={e => handleMouseDown(e, p.label)} className="group cursor-pointer">
              <circle cx={p.x} cy={p.y} r={selection.includes(p.label) ? 8 : 5} fill={selection.includes(p.label) ? "hsl(var(--primary))" : "hsl(var(--background))"} stroke="hsl(var(--primary))" strokeWidth="2" className="transition-all" />
              <text x={p.x} y={p.y-12} textAnchor="middle" className="fill-foreground text-[10px] font-bold select-none italic" style={{ fontFamily: "serif" }}>{p.label}</text>
            </g>
          ))}
        </svg>

        <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 text-[10px] font-bold text-primary shadow-sm pointer-events-none">
          {TOOLS_BY_LEVEL[level].find(t => t.id === tool)?.hint}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border/50 bg-muted/5">
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="أدخل قياسات الزوايا، أطوال الأضلاع، أو أي ملاحظات هندسية أخرى..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-xs text-foreground resize-none min-h-[60px] focus:outline-none focus:border-primary/50 transition-all"
          rows={2}
        />
      </div>

      <div className="px-5 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex flex-col"><span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">النقاط</span><span className="text-xs font-mono font-bold">{points.length}</span></div>
          <div className="flex flex-col"><span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">العناصر</span><span className="text-xs font-mono font-bold">{segments.length + circles.length + functions.length}</span></div>
        </div>
        <button onClick={() => onSubmit({ points, segments, circles, angles, functions, notes })} disabled={points.length === 0 && functions.length === 0 && !notes.trim()} className="group relative flex items-center gap-2 px-8 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all disabled:opacity-40 shadow-lg shadow-primary/20">
          <CheckCircle2 size={14} />
          <span>إرسال الحل</span>
        </button>
      </div>
    </div>
  );
}
