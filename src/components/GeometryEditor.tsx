// ===== Geometry Editor — SVG canvas for geometric answers =====
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Undo2, MousePointer2, 
  Circle as CircleIcon, MoveRight, Settings2, 
  Maximize2, Crosshair, Type, Compass, CheckCircle2
} from "lucide-react";

interface Point { x: number; y: number; label: string; isIntersection?: boolean; }
interface Segment { from: string; to: string; type: "segment" | "vector" | "ray" | "line"; }
interface Circle { center: string; pointOn: string; }
interface Angle { points: [string, string, string]; } // [A, Vertex, C]

interface GeometryEditorProps {
  onSubmit: (data: any) => void;
  className?: string;
}

const TOOLS = [
  { id: "point", icon: <Plus size={16} />, label: "نقطة", hint: "انقر لإضافة نقطة" },
  { id: "segment", icon: <div className="w-4 h-0.5 bg-current" />, label: "قطعة", hint: "صل بين نقطتين" },
  { id: "circle", icon: <CircleIcon size={16} />, label: "دائرة", hint: "المركز ثم نقطة على المحيط" },
  { id: "vector", icon: <MoveRight size={16} />, label: "شعاع", hint: "بداية ونهاية الشعاع" },
  { id: "angle", icon: <Compass size={16} />, label: "زاوية", hint: "اختر 3 نقاط (الرأس في المنتصف)" },
  { id: "move", icon: <MousePointer2 size={16} />, label: "تحريك", hint: "اسحب العناصر لتحريكها" },
] as const;

type Tool = typeof TOOLS[number]["id"];

export function GeometryEditor({ onSubmit, className = "" }: GeometryEditorProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [tool, setTool] = useState<Tool>("point");
  const [selection, setSelection] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const nextLabel = useRef(65); // ASCII 'A'

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
    } else if (tool === "segment" || tool === "vector") {
      if (nearest) {
        if (selection.length === 0) {
          setSelection([nearest.label]);
        } else if (selection[0] !== nearest.label) {
          setSegments([...segments, { 
            from: selection[0], 
            to: nearest.label, 
            type: tool === "vector" ? "vector" : "segment" 
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

  const handleMouseUp = () => setDragging(null);

  const undo = () => {
    if (angles.length > 0) setAngles(angles.slice(0, -1));
    else if (circles.length > 0) setCircles(circles.slice(0, -1));
    else if (segments.length > 0) setSegments(segments.slice(0, -1));
    else if (points.length > 0) {
      nextLabel.current--;
      setPoints(points.slice(0, -1));
    }
    setSelection([]);
  };

  const clear = () => {
    setPoints([]); setSegments([]); setCircles([]); setAngles([]); setLabels({}); setNotes("");
    nextLabel.current = 65; setSelection([]);
  };

  const getPoint = (label: string): Point | undefined => points.find(p => p.label === label);

  const handleSubmit = () => {
    onSubmit({ points, segments, circles, angles, labels, notes });
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
            <h3 className="text-sm font-bold text-foreground">محرر الهندسة المتطور</h3>
            <p className="text-[10px] text-muted-foreground">أنشئ أشكالاً هندسية بدقة رياضية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={undo} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-all border border-transparent">
            <Undo2 size={16} />
          </button>
          <button onClick={clear} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-destructive transition-all border border-transparent">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2 px-4 py-3 border-b border-border/50 bg-muted/10">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setSelection([]); }}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              tool === t.id
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t.icon}
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
        <div className="hidden md:block w-px h-8 bg-border/50 mx-2" />
        <button 
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${showGrid ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground"}`}
          title="شبكة"
        >
          <Maximize2 size={16} />
        </button>
        <button 
          onClick={() => setShowAxes(!showAxes)}
          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${showAxes ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground"}`}
          title="محاور"
        >
          <Crosshair size={16} />
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-background overflow-hidden aspect-[4/3]">
        <svg
          ref={svgRef}
          viewBox="0 0 400 300"
          className="w-full h-full cursor-crosshair touch-none"
          onClick={handleSVGClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          <AnimatePresence>
            {showGrid && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <defs>
                  <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" className="text-border/40" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="400" height="300" fill="url(#grid-pattern)" />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Axes */}
          {showAxes && (
            <g className="text-primary/40">
              <line x1="0" y1="150" x2="400" y2="150" stroke="currentColor" strokeWidth="1" />
              <line x1="200" y1="0" x2="200" y2="300" stroke="currentColor" strokeWidth="1" />
              {/* Markers */}
              <path d="M 395 147 L 400 150 L 395 153" fill="none" stroke="currentColor" />
              <path d="M 197 5 L 200 0 L 203 5" fill="none" stroke="currentColor" />
            </g>
          )}

          {/* Angles */}
          {angles.map((ang, i) => {
            const p1 = getPoint(ang.points[0]);
            const p2 = getPoint(ang.points[1]); // Vertex
            const p3 = getPoint(ang.points[2]);
            if (!p1 || !p2 || !p3) return null;
            
            const a1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
            const a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
            const radius = 20;
            
            const startX = p2.x + Math.cos(a1) * radius;
            const startY = p2.y + Math.sin(a1) * radius;
            const endX = p2.x + Math.cos(a2) * radius;
            const endY = p2.y + Math.sin(a2) * radius;
            
            const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
            const sweep = a2 > a1 ? 1 : 0;

            return (
              <path
                key={i}
                d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                opacity="0.5"
              />
            );
          })}

          {/* Circles */}
          {circles.map((c, i) => {
            const center = getPoint(c.center);
            const pointOn = getPoint(c.pointOn);
            if (!center || !pointOn) return null;
            const r = Math.sqrt((pointOn.x - center.x) ** 2 + (pointOn.y - center.y) ** 2);
            return (
              <circle
                key={i}
                cx={center.x}
                cy={center.y}
                r={r}
                fill="hsl(var(--primary) / 0.05)"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            );
          })}

          {/* Segments & Vectors */}
          {segments.map((seg, i) => {
            const from = getPoint(seg.from);
            const to = getPoint(seg.to);
            if (!from || !to) return null;

            if (seg.type === "vector") {
              const angle = Math.atan2(to.y - from.y, to.x - from.x);
              const headLen = 10;
              return (
                <g key={i}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="hsl(var(--primary))" strokeWidth="2" />
                  <path 
                    d={`M ${to.x} ${to.y} L ${to.x - headLen * Math.cos(angle - Math.PI/6)} ${to.y - headLen * Math.sin(angle - Math.PI/6)} M ${to.x} ${to.y} L ${to.x - headLen * Math.cos(angle + Math.PI/6)} ${to.y - headLen * Math.sin(angle + Math.PI/6)}`}
                    stroke="hsl(var(--primary))" strokeWidth="2" fill="none"
                  />
                </g>
              );
            }

            return (
              <line 
                key={i} 
                x1={from.x} y1={from.y} x2={to.x} y2={to.y} 
                stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" 
              />
            );
          })}

          {/* Points */}
          {points.map(p => (
            <g 
              key={p.label} 
              onMouseDown={e => handleMouseDown(e, p.label)} 
              className="group cursor-pointer"
              style={{ cursor: tool === "move" ? "grab" : "default" }}
            >
              <circle 
                cx={p.x} cy={p.y} r={selection.includes(p.label) ? 8 : 5} 
                fill={selection.includes(p.label) ? "hsl(var(--primary))" : "hsl(var(--background))"} 
                stroke="hsl(var(--primary))" strokeWidth="2" 
                className="transition-all"
              />
              <text 
                x={p.x} y={p.y - 12} textAnchor="middle" 
                className="fill-foreground text-[12px] font-bold select-none italic"
                style={{ fontFamily: "serif" }}
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Floating Hint */}
        <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 text-[10px] font-bold text-primary flex items-center gap-2 shadow-sm pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {TOOLS.find(t => t.id === tool)?.hint}
        </div>
      </div>

      {/* Manual Input / Labels */}
      <div className="px-5 py-4 border-t border-border/50 bg-muted/5">
        <div className="flex items-center gap-2 mb-3">
          <Type size={14} className="text-muted-foreground" />
          <span className="text-[11px] font-bold text-foreground">بيانات إضافية أو ملاحظات:</span>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="أدخل قياسات الزوايا، أطوال الأضلاع، أو أي ملاحظات هندسية أخرى..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-xs text-foreground resize-none min-h-[60px] focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
          rows={2}
        />
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">النقاط</span>
            <span className="text-xs font-mono font-bold text-foreground">{points.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">العناصر</span>
            <span className="text-xs font-mono font-bold text-foreground">{segments.length + circles.length}</span>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={points.length === 0 && !notes.trim()}
          className="group relative flex items-center gap-2 px-8 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CheckCircle2 size={14} />
          <span>إرسال الإنشاء الهندسي</span>
        </button>
      </div>
    </div>
  );
}
