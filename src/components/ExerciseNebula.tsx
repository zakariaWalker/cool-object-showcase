import { motion, AnimatePresence } from "framer-motion";
import { ParsedExercise } from "@/engine/exercise-parser";
import { Domain } from "@/engine/types";
import { useState, useEffect, useMemo, useRef } from "react";

interface ExerciseNebulaProps {
  exercise: ParsedExercise | null;
}

const DOMAIN_THEMES: Record<Domain, { color: string; bg: string; icon: string; title: string }> = {
  algebra: { color: "hsl(var(--algebra))", bg: "from-primary/10", icon: "🔢", title: "المنطق الجبري" },
  geometry: { color: "hsl(var(--geometry))", bg: "from-primary/10", icon: "📐", title: "الفضاء الهندسي" },
  statistics: { color: "hsl(var(--statistics))", bg: "from-accent/10", icon: "📊", title: "الذكاء الإحصائي" },
  probability: { color: "hsl(var(--probability))", bg: "from-primary/10", icon: "🎲", title: "الاحتمالات" },
  functions: { color: "hsl(var(--functions))", bg: "from-primary/10", icon: "📈", title: "تحليل الدوال" },
};

interface Particle {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "variable" | "number" | "statement" | "vertex" | "data";
  orbit?: boolean;
}

export function ExerciseNebula({ exercise }: ExerciseNebulaProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exercise) {
      setParticles([]);
      return;
    }

    const { domain } = exercise.classification;
    const { semanticObjects } = exercise;
    const newParticles: Particle[] = [];

    // --- DOMAIN SPECIFIC LAYOUT LOGIC ---
    
    if (domain === "geometry" && semanticObjects.geometry) {
      // Geometry: Form the shape (Triangle, Rectangle, etc)
      const { vertices, shape } = semanticObjects.geometry;
      vertices.forEach((v, i) => {
        const angle = (i / vertices.length) * Math.PI * 2;
        newParticles.push({
          id: `vert-${v}`,
          x: 50 + Math.cos(angle) * 30, // 50% center + 30% radius
          y: 50 + Math.sin(angle) * 30,
          label: v,
          type: "vertex"
        });
      });
    } else if (domain === "statistics" && semanticObjects.table) {
      // Statistics: Grid-like formation mirroring data
      const { headers, rows } = semanticObjects.table;
      headers.slice(0, 4).forEach((h, i) => {
        newParticles.push({
          id: `header-${i}`,
          x: 20 + i * 20,
          y: 30,
          label: h,
          type: "data"
        });
      });
      // Sample some data points
      rows.slice(0, 3).forEach((row, i) => {
        newParticles.push({
            id: `data-${i}`,
            x: 20 + i * 15,
            y: 50 + Math.random() * 20,
            label: String(row[1] || ""),
            type: "number"
        });
      });
    } else if (domain === "algebra") {
      // Algebra: Central cluster for equations, orbiters for variables
      const { equations, variables, inequalities } = semanticObjects;
      
      [...equations, ...inequalities].forEach((eq, i) => {
        newParticles.push({
          id: `eq-${i}`,
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
          label: eq.length > 15 ? eq.substring(0, 12) + "..." : eq,
          type: "statement"
        });
      });

      variables.forEach((v, i) => {
        const angle = (i / variables.length) * Math.PI * 2;
        newParticles.push({
          id: `var-${v}`,
          x: 50 + Math.cos(angle) * 40,
          y: 50 + Math.sin(angle) * 40,
          label: v,
          type: "variable",
          orbit: true
        });
      });
    } else {
      // General: Random floating constellation
      semanticObjects.numbers.slice(0, 8).forEach((n, i) => {
        newParticles.push({
          id: `num-${i}`,
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          label: String(n),
          type: "number"
        });
      });
    }

    setParticles(newParticles);
  }, [exercise]);

  // Background stars memoized
  const stars = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2,
    blink: 2 + Math.random() * 4
  })), []);

  if (!exercise) return (
    <div className="h-full flex items-center justify-center bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      <motion.span 
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="text-[14px] text-muted-foreground/30 italic"
      >
        البحث عن الروابط الرياضية...
      </motion.span>
    </div>
  );

  const theme = DOMAIN_THEMES[exercise.classification.domain] || DOMAIN_THEMES.algebra;

  return (
    <div className={`relative h-full w-full bg-gradient-to-br ${theme.bg} to-black/40 rounded-2xl border border-white/10 shadow-2xl overflow-hidden`}>
      {/* Dynamic Star Field */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map(star => (
          <motion.div
            key={star.id}
            className="absolute bg-white rounded-full"
            style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
            animate={{ opacity: [0.1, 0.8, 0.1] }}
            transition={{ duration: star.blink, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Constellation Canvas (Lines) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <AnimatePresence>
            {exercise.classification.domain === "geometry" && exercise.semanticObjects.geometry ? (
                // Geometry lines: Connect vertices
                exercise.semanticObjects.geometry.vertices.map((v, i, arr) => {
                    const p1 = particles.find(p => p.id === `vert-${v}`);
                    const p2 = particles.find(p => p.id === `vert-${arr[(i+1)%arr.length]}`);
                    if (!p1 || !p2) return null;
                    return (
                        <motion.line
                            key={`geo-line-${v}-${i}`}
                            x1={`${p1.x}%`} y1={`${p1.y}%`}
                            x2={`${p2.x}%`} y2={`${p2.y}%`}
                            stroke={theme.color} strokeWidth="2"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        />
                    );
                })
            ) : (
                // Regular links: Nearest neighbors
                particles.map((p, i) => {
                    if (i === 0 || i > 6) return null;
                    const prev = particles[i - 1];
                    return (
                        <line
                            key={`link-${i}`}
                            x1={`${p.x}%`} y1={`${p.y}%`}
                            x2={`${prev.x}%`} y2={`${prev.y}%`}
                            stroke={theme.color} strokeWidth="1" strokeDasharray="4 4"
                        />
                    );
                })
            )}
        </AnimatePresence>
      </svg>

      {/* Floating Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            layoutId={p.id}
            className="absolute flex items-center justify-center p-2 rounded-xl glass-card border border-white/10 shadow-lg cursor-default group"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
                scale: 1, 
                opacity: 1,
                y: p.orbit ? [0, -10, 0] : [0, -5, 0]
            }}
            transition={{
                y: { duration: 3 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" },
                scale: { type: "spring", stiffness: 300, damping: 20 }
            }}
          >
            <div className="absolute inset-0 bg-white/5 rounded-xl blur-lg transition-all group-hover:bg-primary/20" />
            <span className="relative text-[11px] font-bold text-foreground drop-shadow-md px-2">
              {p.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Domain HUD */}
      <div className="absolute bottom-4 right-4 text-right pointer-events-none">
        <div className="flex items-center justify-end gap-2 text-primary font-bold text-[18px]">
          {theme.title}
          <span className="text-2xl">{theme.icon}</span>
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
          Math Awareness Active
        </div>
      </div>
    </div>
  );
}
