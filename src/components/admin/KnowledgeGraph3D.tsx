import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  label: string;
  type: string;
  group: string;
  size: number;
  exerciseCount?: number;
  patternCount?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: "exercise_pattern" | "pattern_decon" | "same_type" | "prereq";
}

interface KnowledgeGraph3DProps {
  exercises: any[];
  patterns: any[];
  deconstructions: any[];
}

// ─── Color palette ───────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  algebra: "#7c3aed",
  geometry: "#059669",
  analysis: "#dc2626",
  statistics: "#d97706",
  arithmetic: "#0ea5e9",
  probability: "#ec4899",
  sequences: "#8b5cf6",
  other: "#6b7280",
  pattern: "#f59e0b",
  deconstruction: "#14b8a6",
};

function classifyType(type: string): string {
  const t = (type || "").toLowerCase();
  if (["factor", "solve_equation", "simplify", "expand", "identity", "equation"].some(k => t.includes(k))) return "algebra";
  if (["area", "perimeter", "volume", "angle", "triangle", "geometry", "pythagoras", "thales"].some(k => t.includes(k))) return "geometry";
  if (["derivative", "integral", "limit", "function", "domain"].some(k => t.includes(k))) return "analysis";
  if (["statistics", "mean", "median", "mode"].some(k => t.includes(k))) return "statistics";
  if (["arithmetic", "fraction", "gcd", "lcm"].some(k => t.includes(k))) return "arithmetic";
  if (["probability"].some(k => t.includes(k))) return "probability";
  if (["sequence", "series"].some(k => t.includes(k))) return "sequences";
  return "other";
}

// ─── Build graph from data ───────────────────────────────────────────────────
function buildGraph(exercises: any[], patterns: any[], deconstructions: any[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Group exercises by type
  const typeGroups: Record<string, any[]> = {};
  exercises.forEach(ex => {
    const t = ex.type || "unclassified";
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(ex);
  });

  // Create type cluster nodes
  Object.entries(typeGroups).forEach(([type, exs]) => {
    const group = classifyType(type);
    const node: GraphNode = {
      id: `type_${type}`,
      label: type.replace(/_/g, " "),
      type: "exercise_type",
      group,
      size: Math.min(2, 0.5 + exs.length * 0.05),
      exerciseCount: exs.length,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  });

  // Pattern nodes
  patterns.forEach(p => {
    const node: GraphNode = {
      id: `pattern_${p.id}`,
      label: p.name || "نمط",
      type: "pattern",
      group: "pattern",
      size: 0.8,
      patternCount: 1,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  });

  // Edges: deconstructions link exercises → patterns
  deconstructions.forEach(d => {
    if (!d.exercise_id || !d.pattern_id) return;
    const ex = exercises.find(e => e.id === d.exercise_id);
    const exType = ex?.type || "unclassified";
    const sourceId = `type_${exType}`;
    const targetId = `pattern_${d.pattern_id}`;
    if (nodeMap.has(sourceId) && nodeMap.has(targetId)) {
      if (!edges.find(e => e.source === sourceId && e.target === targetId)) {
        edges.push({ source: sourceId, target: targetId, type: "exercise_pattern" });
      }
    }
  });

  // Edges: same-group connections
  const byGroup: Record<string, GraphNode[]> = {};
  nodes.filter(n => n.type === "exercise_type").forEach(n => {
    if (!byGroup[n.group]) byGroup[n.group] = [];
    byGroup[n.group].push(n);
  });
  Object.values(byGroup).forEach(group => {
    for (let i = 0; i < group.length - 1; i++) {
      edges.push({ source: group[i].id, target: group[i + 1].id, type: "same_type" });
    }
  });

  return { nodes, edges };
}

// ─── Force simulation ────────────────────────────────────────────────────────
function useForceLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  return useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    
    // Initial positions: group-based spherical layout
    const groupAngles: Record<string, number> = {};
    let angleIdx = 0;
    const groups = [...new Set(nodes.map(n => n.group))];
    groups.forEach(g => { groupAngles[g] = (angleIdx++ / groups.length) * Math.PI * 2; });

    nodes.forEach((n, i) => {
      const angle = groupAngles[n.group] || 0;
      const radius = 8 + Math.random() * 4;
      const ySpread = (Math.random() - 0.5) * 10;
      const jitter = Math.random() * 2;
      positions[n.id] = [
        Math.cos(angle) * radius + jitter,
        ySpread,
        Math.sin(angle) * radius + jitter,
      ];
    });

    // Simple force iterations
    const edgeSet = edges.map(e => ({ s: e.source, t: e.target }));
    for (let iter = 0; iter < 60; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = positions[nodes[i].id];
          const b = positions[nodes[j].id];
          const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
          const force = 15 / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force, fz = (dz / dist) * force;
          a[0] += fx; a[1] += fy; a[2] += fz;
          b[0] -= fx; b[1] -= fy; b[2] -= fz;
        }
      }
      // Attraction along edges
      edgeSet.forEach(({ s, t }) => {
        const a = positions[s], b = positions[t];
        if (!a || !b) return;
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
        const force = (dist - 4) * 0.02;
        const fx = (dx / dist) * force, fy = (dy / dist) * force, fz = (dz / dist) * force;
        a[0] += fx; a[1] += fy; a[2] += fz;
        b[0] -= fx; b[1] -= fy; b[2] -= fz;
      });
    }

    return positions;
  }, [nodes, edges]);
}

// ─── 3D Node Component ──────────────────────────────────────────────────────
function GraphNodeMesh({ node, position, isHovered, onClick, onHover }: {
  node: GraphNode;
  position: [number, number, number];
  isHovered: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const color = GROUP_COLORS[node.group] || "#6b7280";
  const scale = isHovered ? node.size * 1.4 : node.size;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      const targetScale = scale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      glowRef.current.scale.set(scale * 1.5 * pulse, scale * 1.5 * pulse, scale * 1.5 * pulse);
    }
  });

  return (
    <group position={position}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={isHovered ? 0.2 : 0.08} />
      </mesh>

      {/* Main node */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { onHover(false); document.body.style.cursor = "auto"; }}
      >
        {node.type === "pattern" ? (
          <octahedronGeometry args={[1, 0]} />
        ) : (
          <sphereGeometry args={[1, 32, 32]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.6 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Label */}
      <Billboard>
        <Text
          position={[0, scale + 0.6, 0]}
          fontSize={0.35}
          color="white"
          anchorX="center"
          anchorY="bottom"
          font="/fonts/Tajawal-Bold.ttf"
          outlineColor="black"
          outlineWidth={0.04}
          maxWidth={4}
        >
          {node.label.length > 15 ? node.label.slice(0, 15) + "…" : node.label}
        </Text>
      </Billboard>

      {/* Count badge */}
      {node.exerciseCount && node.exerciseCount > 1 && (
        <Billboard position={[scale + 0.4, 0.4, 0]}>
          <Text fontSize={0.25} color="#fbbf24" anchorX="center">
            {node.exerciseCount}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ─── 3D Edge Component ──────────────────────────────────────────────────────
function GraphEdgeLine({ start, end, type }: { start: [number, number, number]; end: [number, number, number]; type: string }) {
  const lineObj = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([...start, ...end], 3));
    const color = type === "exercise_pattern" ? "#a78bfa" : type === "same_type" ? "#374151" : "#4b5563";
    const opacity = type === "exercise_pattern" ? 0.6 : 0.2;
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [start, end, type]);

  return <primitive object={lineObj} />;
}

// ─── Particle field ──────────────────────────────────────────────────────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#4f46e5" size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function GraphScene({ nodes, edges, positions, onSelectNode }: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Record<string, [number, number, number]>;
  onSelectNode: (n: GraphNode | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 15, 10]} intensity={1} color="#a78bfa" />
      <pointLight position={[-10, -10, 10]} intensity={0.5} color="#06b6d4" />
      <pointLight position={[0, 0, -15]} intensity={0.3} color="#f59e0b" />

      <ParticleField />

      {/* Edges */}
      {edges.map((e, i) => {
        const start = positions[e.source];
        const end = positions[e.target];
        if (!start || !end) return null;
        return <GraphEdgeLine key={i} start={start} end={end} type={e.type} />;
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;
        return (
          <GraphNodeMesh
            key={n.id}
            node={n}
            position={pos}
            isHovered={hovered === n.id}
            onClick={() => onSelectNode(n)}
            onHover={(h) => setHovered(h ? n.id : null)}
          />
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={35}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

// ─── Info Panel ──────────────────────────────────────────────────────────────
function NodeInfoPanel({ node, exercises, patterns, deconstructions, onClose }: {
  node: GraphNode;
  exercises: any[];
  patterns: any[];
  deconstructions: any[];
  onClose: () => void;
}) {
  const color = GROUP_COLORS[node.group] || "#6b7280";

  const relatedExercises = node.type === "exercise_type"
    ? exercises.filter(e => `type_${e.type}` === node.id).slice(0, 5)
    : [];

  const relatedPattern = node.type === "pattern"
    ? patterns.find(p => `pattern_${p.id}` === node.id)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute top-4 left-4 w-80 rounded-2xl border border-border/50 p-5 z-10"
      style={{
        background: "hsl(var(--card) / 0.95)",
        backdropFilter: "blur(20px)",
        boxShadow: `0 0 30px ${color}33`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-bold text-foreground">{node.label}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 mb-3">
        <div>النوع: <span className="text-foreground">{node.type === "pattern" ? "نمط" : "تصنيف تمارين"}</span></div>
        <div>المجموعة: <span className="text-foreground">{node.group}</span></div>
        {node.exerciseCount && <div>عدد التمارين: <span className="font-bold text-foreground">{node.exerciseCount}</span></div>}
      </div>

      {relatedExercises.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-bold text-muted-foreground mb-1">نماذج تمارين:</div>
          {relatedExercises.map((ex, i) => (
            <div key={i} className="text-[11px] text-foreground/80 p-1.5 rounded bg-muted/50 line-clamp-2" dir="rtl">
              {ex.text?.slice(0, 80)}…
            </div>
          ))}
        </div>
      )}

      {relatedPattern && (
        <div className="space-y-1">
          <div className="text-xs font-bold text-muted-foreground mb-1">تفاصيل النمط:</div>
          <div className="text-[11px] text-foreground/80">{relatedPattern.description || "بدون وصف"}</div>
          {relatedPattern.steps && (
            <div className="text-[11px] text-muted-foreground">
              الخطوات: {(relatedPattern.steps as any[]).length}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Stats bar ───────────────────────────────────────────────────────────────
function StatsBar({ nodes, edges, exercises, patterns }: { nodes: GraphNode[]; edges: GraphEdge[]; exercises: any[]; patterns: any[] }) {
  const stats = [
    { label: "عقد", value: nodes.length, icon: "⚪" },
    { label: "روابط", value: edges.length, icon: "🔗" },
    { label: "تمارين", value: exercises.length, icon: "📝" },
    { label: "أنماط", value: patterns.length, icon: "🔷" },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
          style={{ background: "hsl(var(--card) / 0.8)", backdropFilter: "blur(10px)", border: "1px solid hsl(var(--border) / 0.3)" }}>
          <span>{s.icon}</span>
          <span className="font-bold text-foreground">{s.value}</span>
          <span className="text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  const items = Object.entries(GROUP_COLORS).filter(([k]) => k !== "deconstruction");
  return (
    <div className="absolute top-4 right-4 space-y-1 z-10 p-3 rounded-xl"
      style={{ background: "hsl(var(--card) / 0.8)", backdropFilter: "blur(10px)", border: "1px solid hsl(var(--border) / 0.3)" }}>
      <div className="text-[10px] font-bold text-muted-foreground mb-1.5">تصنيفات</div>
      {items.map(([key, color]) => (
        <div key={key} className="flex items-center gap-2 text-[11px]">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-foreground/80">{key}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function KnowledgeGraph3D({ exercises, patterns, deconstructions }: KnowledgeGraph3DProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const { nodes, edges } = useMemo(
    () => buildGraph(exercises, patterns, deconstructions),
    [exercises, patterns, deconstructions]
  );

  const positions = useForceLayout(nodes, edges);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] rounded-2xl" style={{ background: "hsl(var(--card))" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">🕸️</div>
          <div className="text-sm text-muted-foreground">لا توجد بيانات كافية لبناء الشبكة</div>
          <div className="text-xs text-muted-foreground mt-1">أضف تمارين وأنماط لرؤية الشبكة ثلاثية الأبعاد</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(240 20% 8%), hsl(250 25% 12%))" }}>
      <Canvas camera={{ position: [0, 8, 20], fov: 55 }} dpr={[1, 2]}>
        <fog attach="fog" args={["#0a0a1a", 25, 50]} />
        <GraphScene
          nodes={nodes}
          edges={edges}
          positions={positions}
          onSelectNode={setSelectedNode}
        />
      </Canvas>

      <Legend />
      <StatsBar nodes={nodes} edges={edges} exercises={exercises} patterns={patterns} />

      <AnimatePresence>
        {selectedNode && (
          <NodeInfoPanel
            node={selectedNode}
            exercises={exercises}
            patterns={patterns}
            deconstructions={deconstructions}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10">
        <h2 className="text-sm font-black text-white/90">🧠 شبكة المعرفة ثلاثية الأبعاد</h2>
        <p className="text-[10px] text-white/40">اسحب للتدوير • تمرير للتكبير • انقر على عقدة لمعرفة التفاصيل</p>
      </div>
    </div>
  );
}
