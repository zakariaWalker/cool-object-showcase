// ===== Unified SVG Figure Renderer =====
// One component that consumes a FigureSpec + FigureHighlights and renders it.
// Uses an oblique projection for 3D solids and direct 2D for plane figures,
// keeping the bundle lightweight (no Three.js dependency required).

import { useMemo } from "react";
import type { FigureSpec, FigureHighlights } from "@/engine/figures/types";

interface Props {
  spec: FigureSpec;
  highlights?: FigureHighlights;
  className?: string;
}

const W = 420;
const H = 280;
const PAD = 30;

/** Oblique 3D → 2D projection. Y-axis (depth) is offset diagonally. */
function project(x: number, y: number, z: number): [number, number] {
  // x → screen x ; z → screen y (vertical) ; y → diagonal depth
  const depthAngle = Math.PI / 6; // 30°
  const depthScale = 0.55;
  const sx = x + y * depthScale * Math.cos(depthAngle);
  const sy = z + y * depthScale * Math.sin(depthAngle);
  return [sx, sy];
}

/** Map raw figure coords into the SVG viewport. */
function makeMapper(points: Array<[number, number]>) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const scale = Math.min((W - 2 * PAD) / xRange, (H - 2 * PAD) / yRange);
  return (x: number, y: number): [number, number] => [
    PAD + (x - xMin) * scale,
    H - PAD - (y - yMin) * scale, // flip Y so up is up
  ];
}

function isEdgeHighlighted(a: string, b: string, hi?: FigureHighlights) {
  if (!hi?.edges) return false;
  const key1 = a + b;
  const key2 = b + a;
  return hi.edges.some((e) => {
    const sortedE = e.split("").sort().join("");
    return sortedE === key1.split("").sort().join("") || sortedE === key2.split("").sort().join("");
  });
}

export function FigureRenderer({ spec, highlights, className = "" }: Props) {
  const view = useMemo(() => buildView(spec, highlights), [spec, highlights]);

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-md h-auto"
        role="img"
        aria-label={`رسم ${spec.kind}`}
      >
        {view}
      </svg>
      {highlights?.caption && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          {highlights.caption}
        </div>
      )}
    </div>
  );
}

// ---------- View builders ----------

function buildView(spec: FigureSpec, hi?: FigureHighlights) {
  switch (spec.kind) {
    case "parallelepiped":
    case "cube":
    case "prism":
    case "pyramid":
      return buildSolid(spec, hi);
    case "cylinder":
    case "cone":
    case "sphere":
      return buildSimpleSolid(spec, hi);
    case "circle":
      return buildCircle(spec, hi);
    case "function_plot":
    case "axes":
      return buildAxesPlot(spec, hi);
    default:
      return buildPolygon(spec, hi);
  }
}

// --- 3D solid (projected) ---
function buildSolid(spec: FigureSpec, hi?: FigureHighlights) {
  const verts = spec.vertices || {};
  const projected: Record<string, [number, number]> = {};
  const allPts: Array<[number, number]> = [];
  for (const [label, p] of Object.entries(verts)) {
    const [x, y, z = 0] = p;
    const pp = project(x, y, z);
    projected[label] = pp;
    allPts.push(pp);
  }
  const map = makeMapper(allPts);
  const mapped: Record<string, [number, number]> = {};
  for (const [label, p] of Object.entries(projected)) mapped[label] = map(p[0], p[1]);

  // Decide which edges are "hidden" — simple heuristic: edges entirely on the
  // far side (largest depth y) are dashed. Falls back to original spec order.
  const depths: Record<string, number> = {};
  for (const [label, p] of Object.entries(verts)) depths[label] = p[1] ?? 0;
  const maxDepth = Math.max(...Object.values(depths));

  const edges = spec.edges || [];
  const edgeEls = edges.map(([a, b], i) => {
    const pa = mapped[a], pb = mapped[b];
    if (!pa || !pb) return null;
    const hidden = depths[a] === maxDepth && depths[b] === maxDepth;
    const highlighted = isEdgeHighlighted(a, b, hi);
    return (
      <line
        key={`e-${i}`}
        x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]}
        className={
          highlighted
            ? "stroke-primary"
            : hidden
              ? "stroke-muted-foreground/60"
              : "stroke-foreground"
        }
        strokeWidth={highlighted ? 3 : hidden ? 1.4 : 1.8}
        strokeDasharray={hidden && !highlighted ? "5 4" : undefined}
        strokeLinecap="round"
      />
    );
  });

  // Highlighted faces (translucent fill)
  const faceEls = (spec.faces || []).map((face, i) => {
    const isHi = hi?.faces?.includes(face.join(""));
    if (!isHi) return null;
    const points = face.map((l) => mapped[l]).filter(Boolean) as [number, number][];
    return (
      <polygon
        key={`f-${i}`}
        points={points.map((p) => `${p[0]},${p[1]}`).join(" ")}
        className="fill-primary/20 stroke-primary"
        strokeWidth={1.5}
      />
    );
  });

  // Vertices + labels
  const vertexEls = Object.entries(mapped).map(([label, p]) => {
    const isHi = hi?.vertices?.includes(label);
    return (
      <g key={`v-${label}`}>
        <circle cx={p[0]} cy={p[1]} r={isHi ? 5 : 3}
          className={isHi ? "fill-primary" : "fill-foreground"} />
        <text
          x={p[0] + 8} y={p[1] - 6}
          className={isHi ? "fill-primary font-black" : "fill-foreground font-bold"}
          style={{ fontSize: 14, fontFamily: "system-ui, sans-serif" }}
        >
          {label}
        </text>
      </g>
    );
  });

  return <>{faceEls}{edgeEls}{vertexEls}</>;
}

// --- Cylinder / cone / sphere (parametric) ---
function buildSimpleSolid(spec: FigureSpec, _hi?: FigureHighlights) {
  const r = (spec.dims?.radius ?? 2) * 30;
  const h = (spec.dims?.height ?? 4) * 30;
  const cx = W / 2, cyTop = 60, cyBot = 60 + h;
  const ry = r * 0.35;

  if (spec.kind === "sphere") {
    return (
      <g>
        <circle cx={cx} cy={H/2} r={r} className="fill-primary/5 stroke-foreground" strokeWidth={1.8}/>
        <ellipse cx={cx} cy={H/2} rx={r} ry={ry} className="fill-none stroke-muted-foreground/60" strokeDasharray="5 4" strokeWidth={1.4}/>
      </g>
    );
  }
  if (spec.kind === "cone") {
    return (
      <g>
        <ellipse cx={cx} cy={cyBot} rx={r} ry={ry} className="fill-primary/5 stroke-foreground" strokeWidth={1.8}/>
        <line x1={cx - r} y1={cyBot} x2={cx} y2={cyTop} className="stroke-foreground" strokeWidth={1.8}/>
        <line x1={cx + r} y1={cyBot} x2={cx} y2={cyTop} className="stroke-foreground" strokeWidth={1.8}/>
      </g>
    );
  }
  // cylinder
  return (
    <g>
      <ellipse cx={cx} cy={cyTop} rx={r} ry={ry} className="fill-primary/5 stroke-foreground" strokeWidth={1.8}/>
      <line x1={cx - r} y1={cyTop} x2={cx - r} y2={cyBot} className="stroke-foreground" strokeWidth={1.8}/>
      <line x1={cx + r} y1={cyTop} x2={cx + r} y2={cyBot} className="stroke-foreground" strokeWidth={1.8}/>
      <ellipse cx={cx} cy={cyBot} rx={r} ry={ry} className="fill-none stroke-foreground" strokeWidth={1.8}/>
      <path d={`M ${cx - r} ${cyBot} A ${r} ${ry} 0 0 0 ${cx + r} ${cyBot}`} className="fill-none stroke-muted-foreground/60" strokeDasharray="5 4" strokeWidth={1.4}/>
    </g>
  );
}

// --- 2D polygon (triangle, quadrilaterals, polygons) ---
function buildPolygon(spec: FigureSpec, hi?: FigureHighlights) {
  const verts = spec.vertices || {};
  const pts2D: Array<[number, number]> = Object.values(verts).map((v) => [v[0], v[1]]);
  if (pts2D.length === 0) return null;
  const map = makeMapper(pts2D);
  const mapped: Record<string, [number, number]> = {};
  for (const [label, v] of Object.entries(verts)) mapped[label] = map(v[0], v[1]);

  const edges = spec.edges || [];
  return (
    <>
      <polygon
        points={Object.values(mapped).map((p) => `${p[0]},${p[1]}`).join(" ")}
        className="fill-primary/5 stroke-none"
      />
      {edges.map(([a, b], i) => {
        const pa = mapped[a], pb = mapped[b];
        if (!pa || !pb) return null;
        const isHi = isEdgeHighlighted(a, b, hi);
        return (
          <line key={`e-${i}`}
            x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]}
            className={isHi ? "stroke-primary" : "stroke-foreground"}
            strokeWidth={isHi ? 3 : 2}
            strokeLinecap="round"
          />
        );
      })}
      {Object.entries(mapped).map(([label, p]) => {
        const isHi = hi?.vertices?.includes(label);
        return (
          <g key={`v-${label}`}>
            <circle cx={p[0]} cy={p[1]} r={isHi ? 5 : 3}
              className={isHi ? "fill-primary" : "fill-foreground"} />
            <text x={p[0] + 8} y={p[1] - 6}
              className={isHi ? "fill-primary font-black" : "fill-foreground font-bold"}
              style={{ fontSize: 14, fontFamily: "system-ui, sans-serif" }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

// --- Circle ---
function buildCircle(spec: FigureSpec, _hi?: FigureHighlights) {
  const r = (spec.dims?.radius ?? 2) * 40;
  const cx = W / 2, cy = H / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className="fill-primary/5 stroke-foreground" strokeWidth={2}/>
      <circle cx={cx} cy={cy} r={2} className="fill-foreground"/>
      <text x={cx + 6} y={cy - 6} className="fill-foreground font-bold" style={{ fontSize: 13 }}>O</text>
    </g>
  );
}

// --- Axes / function plot ---
function buildAxesPlot(spec: FigureSpec, _hi?: FigureHighlights) {
  const range = spec.range || { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  const yMin = range.yMin ?? -5, yMax = range.yMax ?? 5;
  const map = makeMapper([
    [range.xMin, yMin], [range.xMax, yMax],
  ]);
  const [ox, oy] = map(0, 0);
  const [xMaxPx] = map(range.xMax, 0);
  const [xMinPx] = map(range.xMin, 0);
  const [, yMaxPx] = map(0, yMax);
  const [, yMinPx] = map(0, yMin);

  // Sample the function
  let path = "";
  if (spec.kind === "function_plot") {
    try {
      const fn = new Function("x", `return (${spec.expression || "x"});`) as (x: number) => number;
      const N = 80;
      const dx = (range.xMax - range.xMin) / N;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= N; i++) {
        const x = range.xMin + i * dx;
        const y = fn(x);
        if (Number.isFinite(y)) pts.push(map(x, y));
      }
      path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
    } catch { /* invalid expression — skip */ }
  }

  return (
    <g>
      <line x1={xMinPx} y1={oy} x2={xMaxPx} y2={oy} className="stroke-muted-foreground" strokeWidth={1.5}/>
      <line x1={ox} y1={yMinPx} x2={ox} y2={yMaxPx} className="stroke-muted-foreground" strokeWidth={1.5}/>
      <text x={xMaxPx - 10} y={oy - 6} className="fill-muted-foreground" style={{ fontSize: 12 }}>x</text>
      <text x={ox + 6} y={yMaxPx + 12} className="fill-muted-foreground" style={{ fontSize: 12 }}>y</text>
      {path && <path d={path} className="fill-none stroke-primary" strokeWidth={2}/>}
    </g>
  );
}
