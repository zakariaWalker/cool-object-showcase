// ===== Geometry Editor — SVG canvas for geometric answers =====
import { useState, useRef, useCallback } from "react";

interface Point { x: number; y: number; label: string; }
interface Segment { from: string; to: string; }

interface GeometryEditorProps {
  onSubmit: (data: { points: Point[]; segments: Segment[]; labels: Record<string, string>; notes: string }) => void;
  className?: string;
}

const TOOLS = [
  { id: "point", icon: "•", label: "نقطة" },
  { id: "segment", icon: "—", label: "قطعة" },
  { id: "label", icon: "A", label: "تسمية" },
  { id: "move", icon: "✋", label: "تحريك" },
] as const;

type Tool = typeof TOOLS[number]["id"];

export function GeometryEditor({ onSubmit, className = "" }: GeometryEditorProps) {
  const [points, setPoints] = useState<Point[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [tool, setTool] = useState<Tool>("point");
  const [segStart, setSegStart] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextLabel = useRef(65); // ASCII 'A'

  const getSVGPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 400),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 300),
    };
  }, []);

  const findNearestPoint = (x: number, y: number, threshold = 20): Point | null => {
    let nearest: Point | null = null;
    let minDist = threshold;
    for (const p of points) {
      const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  };

  const handleSVGClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = getSVGPoint(e);

    if (tool === "point") {
      const label = String.fromCharCode(nextLabel.current++);
      setPoints([...points, { x, y, label }]);
    } else if (tool === "segment") {
      const nearest = findNearestPoint(x, y);
      if (!nearest) return;
      if (!segStart) {
        setSegStart(nearest.label);
      } else {
        if (segStart !== nearest.label) {
          setSegments([...segments, { from: segStart, to: nearest.label }]);
        }
        setSegStart(null);
      }
    } else if (tool === "label") {
      const nearest = findNearestPoint(x, y, 30);
      if (nearest) {
        const val = prompt(`تسمية أو قيمة عند ${nearest.label}:`, labels[nearest.label] || "");
        if (val !== null) setLabels({ ...labels, [nearest.label]: val });
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

  const getPoint = (label: string): Point | undefined => points.find(p => p.label === label);

  const undo = () => {
    if (segments.length > 0) setSegments(segments.slice(0, -1));
    else if (points.length > 0) {
      nextLabel.current--;
      setPoints(points.slice(0, -1));
    }
  };

  const clear = () => {
    setPoints([]); setSegments([]); setLabels({}); setNotes("");
    nextLabel.current = 65; setSegStart(null);
  };

  const handleSubmit = () => {
    onSubmit({ points, segments, labels, notes });
  };

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-primary/5 to-transparent border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm">📐</span>
          <span className="text-xs font-bold text-foreground">محرر الهندسة</span>
        </div>
        <div className="flex gap-1">
          <button onClick={undo} className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground">↩ تراجع</button>
          <button onClick={clear} className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-destructive">✕ مسح</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-1 px-3 py-2 border-b border-border bg-muted/30">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setSegStart(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tool === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="relative bg-background">
        <svg
          ref={svgRef}
          viewBox="0 0 400 300"
          className="w-full border-b border-border cursor-crosshair"
          style={{ aspectRatio: "4/3", background: "hsl(var(--background))" }}
          onClick={handleSVGClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="400" height="300" fill="url(#grid)" />

          {/* Segments */}
          {segments.map((seg, i) => {
            const from = getPoint(seg.from);
            const to = getPoint(seg.to);
            if (!from || !to) return null;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
            return (
              <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
                {/* Distance label */}
                <text x={mx} y={my - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))"
                  fontSize="9" fontFamily="monospace">{Math.round(dist / 10 * 10) / 10}</text>
              </g>
            );
          })}

          {/* Segment in progress */}
          {segStart && tool === "segment" && (
            <circle cx={getPoint(segStart)?.x} cy={getPoint(segStart)?.y} r="8"
              fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4" />
          )}

          {/* Points */}
          {points.map(p => (
            <g key={p.label} onMouseDown={e => handleMouseDown(e, p.label)} style={{ cursor: tool === "move" ? "grab" : "default" }}>
              <circle cx={p.x} cy={p.y} r="5" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="2" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="hsl(var(--foreground))"
                fontSize="12" fontWeight="bold" fontFamily="serif">{p.label}</text>
              {labels[p.label] && (
                <text x={p.x + 12} y={p.y + 4} textAnchor="start" fill="hsl(var(--primary))"
                  fontSize="10" fontFamily="monospace">{labels[p.label]}</text>
              )}
            </g>
          ))}
        </svg>

        {/* Tool hint */}
        <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 px-2 py-1 rounded-md backdrop-blur-sm">
          {tool === "point" && "انقر لإضافة نقطة"}
          {tool === "segment" && (segStart ? `اختر النقطة الثانية (من ${segStart})` : "اختر النقطة الأولى")}
          {tool === "label" && "انقر على نقطة لتسميتها"}
          {tool === "move" && "اسحب نقطة لتحريكها"}
        </div>
      </div>

      {/* Notes */}
      <div className="px-3 py-2 border-b border-border">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="ملاحظات إضافية (اختياري)..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground resize-none min-h-[40px] focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          rows={2}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20">
        <span className="text-[10px] text-muted-foreground">
          {points.length} نقطة • {segments.length} قطعة
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSubmit}
          disabled={points.length === 0 && !notes.trim()}
          className="px-5 py-2 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all disabled:opacity-40 shadow-sm"
        >
          ✓ إرسال الحل
        </button>
      </div>
    </div>
  );
}
