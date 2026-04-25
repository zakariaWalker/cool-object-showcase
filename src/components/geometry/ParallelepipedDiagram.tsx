// ===== Parallelepiped (rectangular box) auto-renderer =====
// Renders a labeled 3D parallelepiped ABCDEFGH using a 2D oblique projection.
// Convention used in Algerian 1AM textbooks:
//   Bottom face: A (front-left), B (front-right), C (back-right), D (back-left)
//   Top face:    E (above A),    F (above B),    G (above C),    H (above D)

interface Props {
  /** Optional vertex labels to highlight (e.g. ["G", "A", "B"]) */
  highlight?: string[];
  className?: string;
}

const VERTICES: Record<string, { x: number; y: number }> = {
  // Front face (closer to viewer)
  A: { x: 60, y: 220 },
  B: { x: 280, y: 220 },
  F: { x: 280, y: 80 },
  E: { x: 60, y: 80 },
  // Back face (depth offset)
  D: { x: 130, y: 180 },
  C: { x: 350, y: 180 },
  G: { x: 350, y: 40 },
  H: { x: 130, y: 40 },
};

// Edges grouped: solid (visible) vs dashed (hidden behind the solid)
const SOLID_EDGES: [string, string][] = [
  // Front face
  ["A", "B"], ["B", "F"], ["F", "E"], ["E", "A"],
  // Right face
  ["B", "C"], ["C", "G"], ["G", "F"],
  // Top face
  ["E", "H"], ["H", "G"],
];
const DASHED_EDGES: [string, string][] = [
  // Hidden back/left edges
  ["A", "D"], ["D", "C"], ["D", "H"],
];

// Where to place each label relative to its vertex
const LABEL_OFFSET: Record<string, { dx: number; dy: number }> = {
  A: { dx: -14, dy: 14 },
  B: { dx: 8, dy: 16 },
  C: { dx: 12, dy: 6 },
  D: { dx: 12, dy: 16 },
  E: { dx: -14, dy: -6 },
  F: { dx: 8, dy: -6 },
  G: { dx: 12, dy: -6 },
  H: { dx: -4, dy: -8 },
};

export function ParallelepipedDiagram({ highlight = [], className = "" }: Props) {
  const hi = new Set(highlight.map((s) => s.toUpperCase()));

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <svg
        viewBox="0 0 420 260"
        className="w-full max-w-md h-auto"
        role="img"
        aria-label="رسم متوازي المستطيلات ABCDEFGH"
      >
        {/* Faint shading for the top face to give a sense of 3D */}
        <polygon
          points={`${VERTICES.E.x},${VERTICES.E.y} ${VERTICES.F.x},${VERTICES.F.y} ${VERTICES.G.x},${VERTICES.G.y} ${VERTICES.H.x},${VERTICES.H.y}`}
          className="fill-primary/5"
        />
        {/* Right face shading */}
        <polygon
          points={`${VERTICES.B.x},${VERTICES.B.y} ${VERTICES.C.x},${VERTICES.C.y} ${VERTICES.G.x},${VERTICES.G.y} ${VERTICES.F.x},${VERTICES.F.y}`}
          className="fill-primary/[0.03]"
        />

        {/* Hidden edges (dashed) */}
        {DASHED_EDGES.map(([a, b]) => (
          <line
            key={`d-${a}-${b}`}
            x1={VERTICES[a].x} y1={VERTICES[a].y}
            x2={VERTICES[b].x} y2={VERTICES[b].y}
            className="stroke-muted-foreground/60"
            strokeWidth={1.4}
            strokeDasharray="5 4"
          />
        ))}

        {/* Solid (visible) edges */}
        {SOLID_EDGES.map(([a, b]) => (
          <line
            key={`s-${a}-${b}`}
            x1={VERTICES[a].x} y1={VERTICES[a].y}
            x2={VERTICES[b].x} y2={VERTICES[b].y}
            className="stroke-foreground"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        ))}

        {/* Vertices + labels */}
        {Object.entries(VERTICES).map(([label, p]) => {
          const off = LABEL_OFFSET[label];
          const highlighted = hi.has(label);
          return (
            <g key={label}>
              <circle
                cx={p.x} cy={p.y}
                r={highlighted ? 5 : 3}
                className={highlighted ? "fill-primary" : "fill-foreground"}
              />
              <text
                x={p.x + off.dx}
                y={p.y + off.dy}
                className={`${highlighted ? "fill-primary font-black" : "fill-foreground font-bold"}`}
                style={{ fontSize: 16, fontFamily: "system-ui, sans-serif" }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
