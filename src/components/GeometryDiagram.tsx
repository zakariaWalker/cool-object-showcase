// ===== SVG Geometry Diagram =====
import { DiagramSpec } from "@/engine/geometry/types";

interface GeometryDiagramProps {
  diagram: DiagramSpec;
}

export function GeometryDiagram({ diagram }: GeometryDiagramProps) {
  const { points, segments, circles, labels } = diagram;

  const pointMap = new Map(points.map((p) => [p.label, p]));

  return (
    <svg
      viewBox="0 0 400 300"
      className="w-full h-auto border border-border rounded-sm bg-background"
      style={{ maxHeight: 300 }}
    >
      {/* Grid */}
      <defs>
        <pattern id="geo-grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <path d="M 25 0 L 0 0 0 25" fill="none" stroke="hsl(240 3.7% 12%)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#geo-grid)" />

      {/* Circles */}
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={c.center.x}
          cy={c.center.y}
          r={c.radius}
          fill="none"
          stroke="hsl(142.1 70.6% 45.3%)"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          opacity={0.6}
        />
      ))}

      {/* Segments */}
      {segments.map((seg, i) => {
        const from = pointMap.get(seg.from);
        const to = pointMap.get(seg.to);
        if (!from || !to) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        return (
          <g key={i}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="hsl(142.1 70.6% 45.3%)"
              strokeWidth="2"
            />
            {seg.label && (
              <text
                x={midX}
                y={midY - 8}
                textAnchor="middle"
                fill="hsl(0 0% 64.9%)"
                fontSize="11"
                fontFamily="'Geist Mono', monospace"
              >
                {seg.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Right angle indicator */}
      {points.length >= 3 && (
        <rect
          x={points[0].x}
          y={points[0].y - 12}
          width="12"
          height="12"
          fill="none"
          stroke="hsl(142.1 70.6% 45.3%)"
          strokeWidth="1"
          opacity={0.5}
        />
      )}

      {/* Points */}
      {points.map((p) => (
        <circle
          key={p.label}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="hsl(142.1 70.6% 45.3%)"
          stroke="hsl(0 0% 98%)"
          strokeWidth="1.5"
        />
      ))}

      {/* Labels */}
      {labels.map((l) => {
        const p = pointMap.get(l.point);
        if (!p) return null;
        const offset = {
          above: { dx: 0, dy: -14 },
          below: { dx: 0, dy: 20 },
          left: { dx: -14, dy: 4 },
          right: { dx: 14, dy: 4 },
        }[l.position];
        return (
          <text
            key={l.point}
            x={p.x + offset.dx}
            y={p.y + offset.dy}
            textAnchor="middle"
            fill="hsl(0 0% 98%)"
            fontSize="14"
            fontWeight="600"
            fontFamily="'Geist Mono', monospace"
          >
            {l.text}
          </text>
        );
      })}

      {/* Circle center */}
      {circles.map((c, i) => (
        <g key={`center-${i}`}>
          <circle cx={c.center.x} cy={c.center.y} r="3" fill="hsl(31.6 100% 50%)" />
          <text
            x={c.center.x + 10}
            y={c.center.y - 8}
            fill="hsl(31.6 100% 50%)"
            fontSize="12"
            fontFamily="'Geist Mono', monospace"
          >
            O
          </text>
        </g>
      ))}
    </svg>
  );
}
