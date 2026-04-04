// ===== 3D Knowledge Graph — Meaningful Insight Visualization =====
import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────
interface KnowledgeGraph3DProps {
  exercises: any[];
  patterns: any[];
  deconstructions: any[];
}

interface DomainCluster {
  id: string;
  label: string;
  labelAr: string;
  color: string;
  exerciseCount: number;
  patternCount: number;
  deconstructionCount: number;
  coveragePct: number;
  types: { name: string; nameAr: string; count: number; covered: number }[];
  grades: Record<string, number>;
  position: [number, number, number];
}

interface InsightEdge {
  from: string;
  to: string;
  strength: number; // shared patterns or concepts
  label?: string;
}

// ─── Domain classification ──────────────────────────────────────────────────
const DOMAIN_MAP: Record<string, { domain: string; labelAr: string; color: string }> = {
  algebra: { domain: "algebra", labelAr: "الجبر", color: "#7c3aed" },
  factor: { domain: "algebra", labelAr: "الجبر", color: "#7c3aed" },
  solve_equation: { domain: "algebra", labelAr: "الجبر", color: "#7c3aed" },
  equations: { domain: "algebra", labelAr: "الجبر", color: "#7c3aed" },
  systems: { domain: "algebra", labelAr: "الجبر", color: "#7c3aed" },
  advanced_algebra: { domain: "algebra", labelAr: "الجبر", color: "#7c3aed" },
  
  geometry_construction: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  triangle_circle: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  parallelogram: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  angles: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  transformations: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  solids: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  analytic_geometry: { domain: "geometry", labelAr: "الهندسة", color: "#059669" },
  
  functions: { domain: "analysis", labelAr: "التحليل", color: "#dc2626" },
  calculus: { domain: "analysis", labelAr: "التحليل", color: "#dc2626" },
  sequences: { domain: "analysis", labelAr: "التحليل", color: "#dc2626" },
  
  statistics: { domain: "statistics", labelAr: "الإحصاء", color: "#d97706" },
  probability: { domain: "probability", labelAr: "الاحتمالات", color: "#ec4899" },
  
  arithmetic: { domain: "arithmetic", labelAr: "الحساب", color: "#0ea5e9" },
  fractions: { domain: "arithmetic", labelAr: "الحساب", color: "#0ea5e9" },
  number_sets: { domain: "arithmetic", labelAr: "الحساب", color: "#0ea5e9" },
  proportionality: { domain: "arithmetic", labelAr: "الحساب", color: "#0ea5e9" },
  
  trigonometry: { domain: "trigonometry", labelAr: "المثلثات", color: "#f97316" },
  prove: { domain: "proof", labelAr: "البرهان", color: "#14b8a6" },
  bac_prep: { domain: "exam_prep", labelAr: "تحضير BAC", color: "#a855f7" },
};

const DOMAIN_COLORS: Record<string, string> = {
  algebra: "#7c3aed", geometry: "#059669", analysis: "#dc2626",
  statistics: "#d97706", probability: "#ec4899", arithmetic: "#0ea5e9",
  trigonometry: "#f97316", proof: "#14b8a6", exam_prep: "#a855f7",
  other: "#6b7280",
};

const DOMAIN_LABELS: Record<string, string> = {
  algebra: "الجبر", geometry: "الهندسة", analysis: "التحليل",
  statistics: "الإحصاء", probability: "الاحتمالات", arithmetic: "الحساب",
  trigonometry: "المثلثات", proof: "البرهان", exam_prep: "تحضير BAC",
  other: "أخرى",
};

const TYPE_LABELS_AR: Record<string, string> = {
  arithmetic: "حساب", algebra: "جبر", fractions: "كسور", equations: "معادلات",
  geometry_construction: "إنشاءات", statistics: "إحصاء", probability: "احتمالات",
  functions: "دوال", trigonometry: "مثلثات", sequences: "متتاليات", calculus: "تحليل",
  systems: "جمل معادلات", proportionality: "تناسبية", transformations: "تحويلات",
  solids: "مجسمات", triangle_circle: "مثلث ودائرة", parallelogram: "متوازي أضلاع",
  angles: "زوايا", number_sets: "مجموعات أعداد", advanced_algebra: "جبر متقدم",
  prove: "برهان", bac_prep: "تحضير BAC", factor: "تحليل عوامل",
  solve_equation: "حل معادلات", analytic_geometry: "هندسة تحليلية",
};

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};

// ─── Build meaningful clusters ──────────────────────────────────────────────
function buildInsightGraph(exercises: any[], patterns: any[], deconstructions: any[]) {
  const deconExIds = new Set(deconstructions.map((d: any) => d.exerciseId || d.exercise_id));
  const deconPatternMap = new Map<string, Set<string>>();
  
  deconstructions.forEach((d: any) => {
    const pid = d.patternId || d.pattern_id;
    const eid = d.exerciseId || d.exercise_id;
    if (pid && eid) {
      if (!deconPatternMap.has(pid)) deconPatternMap.set(pid, new Set());
      deconPatternMap.get(pid)!.add(eid);
    }
  });

  // Group exercises by domain
  const domainExercises: Record<string, any[]> = {};
  exercises.forEach(ex => {
    const type = ex.type || "unclassified";
    const domainInfo = DOMAIN_MAP[type];
    const domain = domainInfo?.domain || "other";
    if (!domainExercises[domain]) domainExercises[domain] = [];
    domainExercises[domain].push(ex);
  });

  // Group patterns by domain
  const domainPatterns: Record<string, any[]> = {};
  patterns.forEach(p => {
    const type = p.type || "unclassified";
    const domainInfo = DOMAIN_MAP[type];
    const domain = domainInfo?.domain || "other";
    if (!domainPatterns[domain]) domainPatterns[domain] = [];
    domainPatterns[domain].push(p);
  });

  // Build clusters
  const clusters: DomainCluster[] = [];
  const domains = [...new Set([...Object.keys(domainExercises), ...Object.keys(domainPatterns)])];
  const angleStep = (Math.PI * 2) / Math.max(domains.length, 1);

  domains.forEach((domain, i) => {
    const exs = domainExercises[domain] || [];
    const pats = domainPatterns[domain] || [];
    const covered = exs.filter(e => deconExIds.has(e.id)).length;
    const coveragePct = exs.length > 0 ? Math.round((covered / exs.length) * 100) : 0;

    // Type breakdown within domain
    const typeMap: Record<string, { count: number; covered: number }> = {};
    exs.forEach(e => {
      const t = e.type || "unclassified";
      if (!typeMap[t]) typeMap[t] = { count: 0, covered: 0 };
      typeMap[t].count++;
      if (deconExIds.has(e.id)) typeMap[t].covered++;
    });

    // Grade breakdown
    const grades: Record<string, number> = {};
    exs.forEach(e => { grades[e.grade] = (grades[e.grade] || 0) + 1; });

    // Position: radius proportional to exercise count, angle evenly distributed
    const radius = 6 + Math.sqrt(exs.length) * 0.8;
    const angle = angleStep * i;
    const y = (coveragePct - 50) * 0.08; // Higher coverage = higher position

    clusters.push({
      id: domain,
      label: domain,
      labelAr: DOMAIN_LABELS[domain] || domain,
      color: DOMAIN_COLORS[domain] || "#6b7280",
      exerciseCount: exs.length,
      patternCount: pats.length,
      deconstructionCount: covered,
      coveragePct,
      types: Object.entries(typeMap)
        .map(([name, v]) => ({ name, nameAr: TYPE_LABELS_AR[name] || name, count: v.count, covered: v.covered }))
        .sort((a, b) => b.count - a.count),
      grades,
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    });
  });

  // Build edges: domains connected by shared patterns
  const edges: InsightEdge[] = [];
  // Find cross-domain pattern connections via deconstructions
  const domainForExercise = new Map<string, string>();
  exercises.forEach(ex => {
    const type = ex.type || "unclassified";
    domainForExercise.set(ex.id, DOMAIN_MAP[type]?.domain || "other");
  });

  // Patterns that bridge domains
  patterns.forEach(p => {
    const patType = p.type || "unclassified";
    const patDomain = DOMAIN_MAP[patType]?.domain || "other";
    const usedExIds = deconPatternMap.get(p.id);
    if (!usedExIds) return;
    const connectedDomains = new Set<string>();
    usedExIds.forEach(eid => {
      const d = domainForExercise.get(eid);
      if (d && d !== patDomain) connectedDomains.add(d);
    });
    connectedDomains.forEach(targetDomain => {
      const existing = edges.find(e =>
        (e.from === patDomain && e.to === targetDomain) ||
        (e.from === targetDomain && e.to === patDomain)
      );
      if (existing) existing.strength++;
      else edges.push({ from: patDomain, to: targetDomain, strength: 1 });
    });
  });

  return { clusters, edges };
}

// ─── 3D Domain Sphere ───────────────────────────────────────────────────────
function DomainSphere({ cluster, isSelected, onClick, onHover }: {
  cluster: DomainCluster;
  isSelected: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(cluster.color);
  
  // Size based on exercise count (meaningful)
  const baseSize = Math.max(0.6, Math.min(2.5, 0.4 + Math.sqrt(cluster.exerciseCount) * 0.15));
  const targetScale = isSelected ? baseSize * 1.3 : baseSize;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.4;
      const ringScale = targetScale * 1.6;
      ringRef.current.scale.lerp(new THREE.Vector3(ringScale, ringScale, ringScale), 0.08);
    }
  });

  // Coverage determines visual: full = solid, low = wireframe-ish
  const coverageOpacity = 0.3 + (cluster.coveragePct / 100) * 0.7;

  return (
    <group position={cluster.position}>
      {/* Coverage ring — shows completeness */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.04, 8, 64, (cluster.coveragePct / 100) * Math.PI * 2]} />
        <meshStandardMaterial
          color={cluster.coveragePct >= 70 ? "#22c55e" : cluster.coveragePct >= 40 ? "#eab308" : "#ef4444"}
          emissive={cluster.coveragePct >= 70 ? "#22c55e" : cluster.coveragePct >= 40 ? "#eab308" : "#ef4444"}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { onHover(false); document.body.style.cursor = "auto"; }}
      >
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color={cluster.color}
          emissive={cluster.color}
          emissiveIntensity={isSelected ? 0.5 : 0.15}
          metalness={0.2}
          roughness={0.5}
          transparent
          opacity={coverageOpacity}
        />
      </mesh>

      {/* Domain label */}
      <Billboard position={[0, targetScale + 0.8, 0]}>
        <Text fontSize={0.4} color="#1e293b" anchorX="center" anchorY="bottom" outlineColor="white" outlineWidth={0.06}>
          {cluster.labelAr}
        </Text>
      </Billboard>

      {/* Exercise count badge */}
      <Billboard position={[0, targetScale + 0.35, 0]}>
        <Text fontSize={0.22} color="#64748b" anchorX="center">
          {cluster.exerciseCount} تمرين · {cluster.coveragePct}%
        </Text>
      </Billboard>

      {/* Pattern count — small orbiting indicator */}
      {cluster.patternCount > 0 && (
        <Billboard position={[targetScale + 0.5, -0.3, 0]}>
          <Text fontSize={0.2} color={cluster.color} anchorX="center">
            🧩 {cluster.patternCount}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ─── Connection line with strength ──────────────────────────────────────────
function ConnectionLine({ start, end, strength }: {
  start: [number, number, number];
  end: [number, number, number];
  strength: number;
}) {
  const lineObj = useMemo(() => {
    // Create curved line
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + strength * 0.3,
      (start[2] + end[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...end),
    );
    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const opacity = Math.min(0.8, 0.2 + strength * 0.1);
    const material = new THREE.LineBasicMaterial({ color: "#94a3b8", transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [start, end, strength]);

  return <primitive object={lineObj} />;
}

// ─── Ground grid for spatial reference ──────────────────────────────────────
function GroundGrid() {
  return (
    <group position={[0, -4, 0]}>
      <gridHelper args={[30, 30, "#cbd5e1", "#e2e8f0"]} />
    </group>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────
function GraphScene({ clusters, edges, onSelectCluster }: {
  clusters: DomainCluster[];
  edges: InsightEdge[];
  onSelectCluster: (c: DomainCluster | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = useCallback((cluster: DomainCluster) => {
    const isAlreadySelected = selected === cluster.id;
    setSelected(isAlreadySelected ? null : cluster.id);
    onSelectCluster(isAlreadySelected ? null : cluster);
  }, [selected, onSelectCluster]);

  const clusterMap = useMemo(() => {
    const m = new Map<string, DomainCluster>();
    clusters.forEach(c => m.set(c.id, c));
    return m;
  }, [clusters]);

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" castShadow />
      <pointLight position={[-8, 5, -8]} intensity={0.4} color="#93c5fd" />

      <GroundGrid />

      {/* Edges */}
      {edges.map((e, i) => {
        const from = clusterMap.get(e.from);
        const to = clusterMap.get(e.to);
        if (!from || !to) return null;
        return <ConnectionLine key={i} start={from.position} end={to.position} strength={e.strength} />;
      })}

      {/* Domain clusters */}
      {clusters.map(c => (
        <DomainSphere
          key={c.id}
          cluster={c}
          isSelected={selected === c.id}
          onClick={() => handleClick(c)}
          onHover={() => {}}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={40}
        autoRotate
        autoRotateSpeed={0.2}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.15}
      />
    </>
  );
}

// ─── Insight Panel (shows real metrics when a domain is clicked) ─────────
function InsightPanel({ cluster, onClose }: { cluster: DomainCluster; onClose: () => void }) {
  const coverageColor = cluster.coveragePct >= 70 ? "#22c55e" : cluster.coveragePct >= 40 ? "#eab308" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      className="absolute top-4 left-4 w-80 rounded-2xl border border-border p-5 z-20"
      style={{ background: "hsl(var(--card) / 0.97)", backdropFilter: "blur(20px)" }}
      dir="rtl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: cluster.color }} />
          <h3 className="text-base font-black text-foreground">{cluster.labelAr}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl p-2.5 text-center" style={{ background: `${cluster.color}15` }}>
          <div className="text-lg font-black" style={{ color: cluster.color }}>{cluster.exerciseCount}</div>
          <div className="text-[9px] text-muted-foreground">تمرين</div>
        </div>
        <div className="rounded-xl p-2.5 text-center" style={{ background: `${cluster.color}15` }}>
          <div className="text-lg font-black" style={{ color: cluster.color }}>{cluster.patternCount}</div>
          <div className="text-[9px] text-muted-foreground">نمط</div>
        </div>
        <div className="rounded-xl p-2.5 text-center" style={{ background: `${coverageColor}15` }}>
          <div className="text-lg font-black" style={{ color: coverageColor }}>{cluster.coveragePct}%</div>
          <div className="text-[9px] text-muted-foreground">تغطية</div>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>التغطية</span>
          <span>{cluster.deconstructionCount}/{cluster.exerciseCount}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${cluster.coveragePct}%`, background: coverageColor }} />
        </div>
      </div>

      {/* Type breakdown */}
      {cluster.types.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-muted-foreground mb-2">توزيع الأنواع:</div>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
            {cluster.types.map(t => {
              const typePct = t.count > 0 ? Math.round((t.covered / t.count) * 100) : 0;
              return (
                <div key={t.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-foreground w-20 truncate">{t.nameAr}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${typePct}%`, background: cluster.color }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-8 text-left">{t.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade distribution */}
      {Object.keys(cluster.grades).length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-muted-foreground mb-2">المستويات:</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(cluster.grades)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, count]) => (
                <span key={grade} className="text-[9px] px-2 py-1 rounded-full font-bold"
                  style={{ background: `${cluster.color}15`, color: cluster.color }}>
                  {GRADE_LABELS[grade] || grade}: {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Legend with meaning ────────────────────────────────────────────────────
function InsightLegend({ clusters }: { clusters: DomainCluster[] }) {
  const sorted = [...clusters].sort((a, b) => b.exerciseCount - a.exerciseCount);
  return (
    <div className="absolute top-4 right-4 z-20 p-3 rounded-xl max-w-[180px]"
      style={{ background: "hsl(var(--card) / 0.9)", backdropFilter: "blur(10px)", border: "1px solid hsl(var(--border))" }}>
      <div className="text-[10px] font-black text-foreground mb-2">📊 المجالات</div>
      <div className="space-y-1.5">
        {sorted.map(c => (
          <div key={c.id} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
            <span className="text-[10px] text-foreground flex-1">{c.labelAr}</span>
            <span className="text-[9px] font-mono text-muted-foreground">{c.exerciseCount}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-border space-y-1">
        <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
          <div className="w-3 h-1 rounded-full bg-green-500" /> تغطية ≥70%
        </div>
        <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
          <div className="w-3 h-1 rounded-full bg-yellow-500" /> تغطية 40-69%
        </div>
        <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
          <div className="w-3 h-1 rounded-full bg-red-500" /> تغطية &lt;40%
        </div>
      </div>
    </div>
  );
}

// ─── Quick Stats Bar ────────────────────────────────────────────────────────
function QuickStats({ clusters, exercises, patterns, deconstructions }: {
  clusters: DomainCluster[];
  exercises: any[];
  patterns: any[];
  deconstructions: any[];
}) {
  const totalCoverage = exercises.length > 0
    ? Math.round((deconstructions.length / exercises.length) * 100)
    : 0;
  const weakest = [...clusters].sort((a, b) => a.coveragePct - b.coveragePct)[0];
  const strongest = [...clusters].sort((a, b) => b.coveragePct - a.coveragePct)[0];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20 flex-wrap justify-center" dir="rtl">
      <StatChip icon="📊" label="تغطية كلية" value={`${totalCoverage}%`}
        color={totalCoverage >= 60 ? "#22c55e" : "#eab308"} />
      <StatChip icon="📚" label="تمارين" value={`${exercises.length}`} color="#3b82f6" />
      <StatChip icon="🧩" label="أنماط" value={`${patterns.length}`} color="#8b5cf6" />
      {weakest && weakest.coveragePct < 50 && (
        <StatChip icon="⚠️" label="أضعف مجال" value={weakest.labelAr} color="#ef4444" />
      )}
      {strongest && (
        <StatChip icon="✅" label="أقوى مجال" value={strongest.labelAr} color="#22c55e" />
      )}
    </div>
  );
}

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
      style={{ background: "hsl(var(--card) / 0.9)", backdropFilter: "blur(10px)", border: "1px solid hsl(var(--border))" }}>
      <span>{icon}</span>
      <span className="text-muted-foreground text-[10px]">{label}</span>
      <span className="font-bold text-[11px]" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function KnowledgeGraph3D({ exercises, patterns, deconstructions }: KnowledgeGraph3DProps) {
  const [selectedCluster, setSelectedCluster] = useState<DomainCluster | null>(null);

  const { clusters, edges } = useMemo(
    () => buildInsightGraph(exercises, patterns, deconstructions),
    [exercises, patterns, deconstructions]
  );

  if (clusters.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] rounded-2xl border border-border bg-card">
        <div className="text-center">
          <div className="text-4xl mb-3">🕸️</div>
          <div className="text-sm text-muted-foreground">لا توجد بيانات كافية لبناء الشبكة</div>
          <div className="text-xs text-muted-foreground mt-1">أضف تمارين وأنماط لرؤية الشبكة ثلاثية الأبعاد</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden border border-border"
      style={{ background: "linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%)" }}>
      <Canvas camera={{ position: [0, 12, 22], fov: 50 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <color attach="background" args={["#f0f4f8"]} />
        <fog attach="fog" args={["#f0f4f8", 35, 60]} />
        <GraphScene clusters={clusters} edges={edges} onSelectCluster={setSelectedCluster} />
      </Canvas>

      <InsightLegend clusters={clusters} />
      <QuickStats clusters={clusters} exercises={exercises} patterns={patterns} deconstructions={deconstructions} />

      <AnimatePresence>
        {selectedCluster && (
          <InsightPanel cluster={selectedCluster} onClose={() => setSelectedCluster(null)} />
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10">
        <h2 className="text-sm font-black text-foreground">🧠 خريطة المعرفة — المجالات والتغطية</h2>
        <p className="text-[10px] text-muted-foreground">حجم الكرة = عدد التمارين · الحلقة = نسبة التغطية · اللون = المجال</p>
      </div>
    </div>
  );
}
