// ===== 2D Knowledge Graph — Premium SVG Domain Visualization =====
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
}

interface DomainEdge {
  from: string;
  to: string;
  strength: number;
}

// ─── Domain config ──────────────────────────────────────────────────────────
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

const SHORT_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};
const labelForGrade = (g: string) => SHORT_LABELS[g] || g;

// ─── Premium SVG Icons per domain ───────────────────────────────────────────
function DomainIcon({ domain, size = 48 }: { domain: string; size?: number }) {
  const s = size;
  const half = s / 2;
  const color = DOMAIN_COLORS[domain] || "#6b7280";
  
  switch (domain) {
    case "algebra":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <text x="32" y="28" textAnchor="middle" fontSize="18" fontWeight="800" fill={color} fontFamily="serif" fontStyle="italic">x</text>
          <line x1="18" y1="35" x2="46" y2="35" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <text x="22" y="50" fontSize="11" fontWeight="700" fill={color} fontFamily="serif">2x+1</text>
          <circle cx="50" cy="14" r="6" fill={color} fillOpacity="0.2" />
          <text x="50" y="17" textAnchor="middle" fontSize="8" fontWeight="800" fill={color}>²</text>
        </svg>
      );
    case "geometry":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <polygon points="32,12 12,52 52,52" stroke={color} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
          <circle cx="32" cy="38" r="10" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.08" strokeDasharray="3 2" />
          <line x1="32" y1="12" x2="32" y2="52" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
          <rect x="29" y="49" width="6" height="3" fill={color} fillOpacity="0.3" />
        </svg>
      );
    case "analysis":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <path d="M12 48 C 20 48, 24 16, 32 32 S 44 16, 52 16" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <line x1="12" y1="52" x2="52" y2="52" stroke={color} strokeWidth="1.5" opacity="0.3" />
          <line x1="12" y1="12" x2="12" y2="52" stroke={color} strokeWidth="1.5" opacity="0.3" />
          <circle cx="32" cy="32" r="3" fill={color} />
          <text x="36" y="28" fontSize="7" fill={color} fontWeight="700">f'(x)</text>
        </svg>
      );
    case "statistics":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <rect x="14" y="36" width="8" height="18" rx="2" fill={color} fillOpacity="0.5" />
          <rect x="24" y="24" width="8" height="30" rx="2" fill={color} fillOpacity="0.7" />
          <rect x="34" y="18" width="8" height="36" rx="2" fill={color} />
          <rect x="44" y="28" width="8" height="26" rx="2" fill={color} fillOpacity="0.6" />
          <path d="M14 34 L24 22 L34 16 L44 26 L54 20" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="3 2" />
        </svg>
      );
    case "probability":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <rect x="18" y="18" width="28" height="28" rx="6" stroke={color} strokeWidth="2.5" fill="none" />
          <circle cx="26" cy="26" r="2.5" fill={color} />
          <circle cx="38" cy="26" r="2.5" fill={color} />
          <circle cx="32" cy="32" r="2.5" fill={color} />
          <circle cx="26" cy="38" r="2.5" fill={color} />
          <circle cx="38" cy="38" r="2.5" fill={color} />
          <text x="32" y="56" textAnchor="middle" fontSize="7" fill={color} fontWeight="700">P(A∩B)</text>
        </svg>
      );
    case "arithmetic":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <text x="32" y="24" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>÷</text>
          <text x="20" y="42" fontSize="12" fontWeight="800" fill={color}>×</text>
          <text x="38" y="42" fontSize="14" fontWeight="800" fill={color}>+</text>
          <text x="32" y="56" textAnchor="middle" fontSize="8" fill={color} fontWeight="600">ℤ ℚ ℝ</text>
        </svg>
      );
    case "trigonometry":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <path d="M8 40 Q 16 16, 24 40 T 40 40 T 56 40" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <line x1="8" y1="40" x2="56" y2="40" stroke={color} strokeWidth="1" opacity="0.2" />
          <text x="32" y="56" textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>sin cos</text>
        </svg>
      );
    case "proof":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <text x="32" y="24" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>∀</text>
          <text x="22" y="40" fontSize="10" fontWeight="700" fill={color}>⇒</text>
          <text x="38" y="40" fontSize="10" fontWeight="700" fill={color}>∃</text>
          <text x="32" y="54" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>Q.E.D</text>
        </svg>
      );
    case "exam_prep":
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <rect x="16" y="12" width="32" height="40" rx="4" stroke={color} strokeWidth="2" fill="none" />
          <line x1="22" y1="22" x2="42" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <line x1="22" y1="28" x2="38" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <line x1="22" y1="34" x2="40" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          <path d="M26 40 L30 44 L38 36" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none">
          <rect x="4" y="4" width="56" height="56" rx="14" fill={color} fillOpacity="0.12" />
          <text x="32" y="38" textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>?</text>
        </svg>
      );
  }
}

// ─── Build clusters from data ───────────────────────────────────────────────
function buildClusters(exercises: any[], patterns: any[], deconstructions: any[]) {
  const deconExIds = new Set(deconstructions.map((d: any) => d.exerciseId || d.exercise_id));
  
  const domainExercises: Record<string, any[]> = {};
  exercises.forEach(ex => {
    const type = ex.type || "unclassified";
    const domainInfo = DOMAIN_MAP[type];
    const domain = domainInfo?.domain || "other";
    if (!domainExercises[domain]) domainExercises[domain] = [];
    domainExercises[domain].push(ex);
  });

  const clusters: DomainCluster[] = Object.entries(domainExercises)
    .map(([domain, exs]) => {
      const covered = exs.filter(e => deconExIds.has(e.id));
      const types: Record<string, { count: number; covered: number }> = {};
      exs.forEach(e => {
        const t = e.type || "unclassified";
        if (!types[t]) types[t] = { count: 0, covered: 0 };
        types[t].count++;
        if (deconExIds.has(e.id)) types[t].covered++;
      });
      const grades: Record<string, number> = {};
      exs.forEach(e => { const g = e.grade || "unknown"; grades[g] = (grades[g] || 0) + 1; });

      return {
        id: domain,
        label: domain,
        labelAr: DOMAIN_LABELS[domain] || domain,
        color: DOMAIN_COLORS[domain] || "#6b7280",
        exerciseCount: exs.length,
        patternCount: patterns.filter(p => (p.type || "").includes(domain)).length,
        deconstructionCount: covered.length,
        coveragePct: exs.length > 0 ? Math.round((covered.length / exs.length) * 100) : 0,
        types: Object.entries(types).map(([name, v]) => ({
          name, nameAr: TYPE_LABELS_AR[name] || name, count: v.count, covered: v.covered,
        })).sort((a, b) => b.count - a.count),
        grades,
      };
    })
    .filter(c => c.exerciseCount > 0)
    .sort((a, b) => b.exerciseCount - a.exerciseCount);

  // Build edges based on shared patterns
  const edges: DomainEdge[] = [];
  const domainIds = clusters.map(c => c.id);
  for (let i = 0; i < domainIds.length; i++) {
    for (let j = i + 1; j < domainIds.length; j++) {
      const a = domainIds[i], b = domainIds[j];
      const sharedPatterns = patterns.filter(p => {
        const t = p.type || "";
        return (DOMAIN_MAP[t]?.domain === a || t.includes(a)) && (DOMAIN_MAP[t]?.domain === b || t.includes(b));
      }).length;
      const sharedConcepts = Math.min(
        clusters[i].types.length, clusters[j].types.length
      );
      const strength = sharedPatterns + Math.floor(sharedConcepts / 3);
      if (strength > 0) edges.push({ from: a, to: b, strength });
    }
  }

  return { clusters, edges };
}

// ─── Coverage ring SVG ──────────────────────────────────────────────────────
function CoverageRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const ringColor = pct > 70 ? "#22c55e" : pct > 40 ? "#eab308" : "#ef4444";

  return (
    <svg width={size} height={size} className="absolute inset-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" opacity="0.1" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={ringColor} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

// ─── Node positions (circular layout) ───────────────────────────────────────
function getNodePositions(count: number, width: number, height: number) {
  const cx = width / 2, cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function KnowledgeGraph3D({ exercises, patterns, deconstructions }: KnowledgeGraph3DProps) {
  const [selected, setSelected] = useState<DomainCluster | null>(null);
  const { clusters, edges } = useMemo(() => buildClusters(exercises, patterns, deconstructions), [exercises, patterns, deconstructions]);

  const WIDTH = 900, HEIGHT = 520;
  const positions = useMemo(() => getNodePositions(clusters.length, WIDTH, HEIGHT), [clusters.length]);

  const totalEx = exercises.length;
  const totalDecon = deconstructions.length;
  const globalCoverage = totalEx > 0 ? Math.round((totalDecon / totalEx) * 100) : 0;
  
  const weakest = clusters.reduce((a, b) => a.coveragePct < b.coveragePct ? a : b, clusters[0]);
  const strongest = clusters.reduce((a, b) => a.coveragePct > b.coveragePct ? a : b, clusters[0]);

  if (!clusters.length) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground text-sm">
        لا توجد بيانات كافية للعرض
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden" dir="rtl">
      {/* Header stats */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-black text-foreground">🗺️ خريطة المعرفة</h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-muted-foreground">{totalEx} تمرين</span>
            <span className="text-muted-foreground">{patterns.length} نمط</span>
            <span className="text-muted-foreground">{clusters.length} مجال</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-foreground font-bold">التغطية الشاملة: <span className={globalCoverage > 60 ? "text-green-500" : globalCoverage > 30 ? "text-yellow-500" : "text-red-500"}>{globalCoverage}%</span></span>
          {weakest && <span className="text-red-400">⚠ الأضعف: {weakest.labelAr} ({weakest.coveragePct}%)</span>}
          {strongest && <span className="text-green-500">✦ الأقوى: {strongest.labelAr} ({strongest.coveragePct}%)</span>}
        </div>
      </div>

      <div className="flex">
        {/* SVG Graph */}
        <div className="flex-1 relative" style={{ minHeight: HEIGHT }}>
          <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="select-none">
            {/* Edges */}
            {edges.map((edge, i) => {
              const fromIdx = clusters.findIndex(c => c.id === edge.from);
              const toIdx = clusters.findIndex(c => c.id === edge.to);
              if (fromIdx < 0 || toIdx < 0) return null;
              const from = positions[fromIdx], to = positions[toIdx];
              return (
                <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="hsl(var(--border))" strokeWidth={Math.max(1, edge.strength * 0.5)}
                  opacity={0.3} strokeDasharray="4 4" />
              );
            })}
          </svg>

          {/* Domain nodes as HTML overlays */}
          {clusters.map((cluster, i) => {
            const pos = positions[i];
            const nodeSize = Math.max(72, Math.min(110, 60 + cluster.exerciseCount * 0.06));
            const isSelected = selected?.id === cluster.id;

            return (
              <motion.div
                key={cluster.id}
                className="absolute cursor-pointer group"
                style={{ left: `${(pos.x / WIDTH) * 100}%`, top: `${(pos.y / HEIGHT) * 100}%`, transform: "translate(-50%, -50%)" }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: isSelected ? 1.15 : 1 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => setSelected(isSelected ? null : cluster)}
              >
                <div className="relative flex flex-col items-center">
                  {/* Coverage ring */}
                  <div className="relative" style={{ width: nodeSize, height: nodeSize }}>
                    <CoverageRing pct={cluster.coveragePct} color={cluster.color} size={nodeSize} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <DomainIcon domain={cluster.id} size={nodeSize * 0.65} />
                    </div>
                  </div>

                  {/* Label */}
                  <div className="mt-1 text-center">
                    <div className="text-[10px] font-black text-foreground leading-none">{cluster.labelAr}</div>
                    <div className="text-[8px] text-muted-foreground font-bold">{cluster.exerciseCount} تمرين · {cluster.coveragePct}%</div>
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                    <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-[9px] whitespace-nowrap">
                      <div className="font-black text-foreground">{cluster.labelAr}</div>
                      <div className="text-muted-foreground">{cluster.exerciseCount} تمرين · {cluster.patternCount} نمط · {cluster.deconstructionCount} تفكيك</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-border bg-muted/20 overflow-hidden shrink-0"
            >
              <div className="p-4 w-[280px]">
                <div className="flex items-center gap-3 mb-4">
                  <DomainIcon domain={selected.id} size={40} />
                  <div>
                    <h4 className="text-sm font-black text-foreground">{selected.labelAr}</h4>
                    <p className="text-[10px] text-muted-foreground">{selected.exerciseCount} تمرين · تغطية {selected.coveragePct}%</p>
                  </div>
                </div>

                {/* Coverage bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-muted-foreground">التغطية</span>
                    <span className="font-black" style={{ color: selected.color }}>{selected.coveragePct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selected.coveragePct}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: selected.color }}
                    />
                  </div>
                </div>

                {/* Types breakdown */}
                <div className="mb-4">
                  <h5 className="text-[10px] font-black text-foreground mb-2">الأنواع الفرعية</h5>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {selected.types.slice(0, 8).map(t => (
                      <div key={t.name} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="font-bold text-foreground">{t.nameAr}</span>
                            <span className="text-muted-foreground">{t.covered}/{t.count}</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                            <div className="h-full rounded-full" style={{ width: `${t.count > 0 ? (t.covered / t.count) * 100 : 0}%`, backgroundColor: selected.color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grades */}
                <div>
                  <h5 className="text-[10px] font-black text-foreground mb-2">المستويات</h5>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selected.grades).sort((a, b) => b[1] - a[1]).map(([g, count]) => (
                      <span key={g} className="px-2 py-0.5 rounded text-[8px] font-bold border border-border bg-muted/50 text-foreground">
                        {labelForGrade(g)}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="mt-4 w-full text-[10px] py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition"
                >
                  إغلاق ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-5 py-2 border-t border-border bg-muted/20 text-[8px] text-muted-foreground">
        <span>حلقة التغطية:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {'>'}70%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 40-70%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> {'<'}40%</span>
        <span className="mr-4">حجم العقدة = عدد التمارين</span>
        <span>الخطوط = أنماط مشتركة</span>
      </div>
    </div>
  );
}
