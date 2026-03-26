// ═══════════════════════════════════════════════════════════════════════
//  Landing.tsx — QED · رحلة الخلية العصبية
//  Neural synapse storytelling — scroll builds connections in your brain
// ═══════════════════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────
interface NeuronNode {
  id: string;
  label: string;
  x: number;
  y: number;
  active: boolean;
}

interface Synapse {
  from: string;
  to: string;
  active: boolean;
  broken: boolean;
}

// ─── Scene Data ─────────────────────────────────────────────────────────
const SCENES = [
  {
    id: "intro",
    title: "دماغك يبني مسارات جديدة الآن",
    subtitle: "كل مفهوم رياضي = عُقدة عصبية. كل وصلة = فهم حقيقي.",
    description: "عندما تتعلم، دماغك يُنشئ وصلات عصبية (synapses) بين المفاهيم. كلما تدربت أكثر، الوصلات تصبح أقوى وأسرع.",
    visual: "network-grow",
    neurons: [
      { id: "n1", label: "الاشتقاق", x: 20, y: 30 },
      { id: "n2", label: "النهايات", x: 50, y: 20 },
      { id: "n3", label: "التكامل", x: 80, y: 35 },
    ],
  },
  {
    id: "gaps",
    title: "الثغرات = وصلات مقطوعة",
    subtitle: "لهذا تضيع النقاط: ليس لأنك غبي، بل لأن وصلة واحدة مفقودة.",
    description: "عندما يكون مفهوم ناقص، الإشارة العصبية لا تصل. تبدأ تخسر نقاط في التمرين بدون ما تفهم ليش.",
    visual: "broken-synapse",
    neurons: [
      { id: "g1", label: "المتتاليات", x: 15, y: 25 },
      { id: "g2", label: "التزايد المقارن", x: 50, y: 45 },
      { id: "g3", label: "الدوال الأسية", x: 85, y: 25 },
    ],
  },
  {
    id: "diagnose",
    title: "QED يكتشف الوصلات المقطوعة",
    subtitle: "تقييم تشخيصي ذكي يحلل إجاباتك ويحدد بالضبط أين الخلل.",
    description: "بدل ما تضيع وقتك في مراجعة كل شيء، QED يحدد الأنماط الضعيفة والمفاهيم الغائبة — بدقة ٩٥٪.",
    visual: "scan-detect",
    neurons: [
      { id: "d1", label: "نمط ١", x: 20, y: 20 },
      { id: "d2", label: "نمط ٢", x: 50, y: 50 },
      { id: "d3", label: "نمط ٣", x: 80, y: 20 },
      { id: "d4", label: "الثغرة", x: 50, y: 20 },
    ],
  },
  {
    id: "heal",
    title: "الوصلات تتصل من جديد",
    subtitle: "مسار تعلم مخصص يبني الوصلات المفقودة خطوة بخطوة.",
    description: "بعد التشخيص، QED يرسم لك مسار تعلم مرتّب — يبدأ من الأساس ويصعد تدريجياً حتى تُتقن كل مفهوم.",
    visual: "reconnect",
    neurons: [
      { id: "h1", label: "الأساس", x: 10, y: 50 },
      { id: "h2", label: "البناء", x: 35, y: 25 },
      { id: "h3", label: "التعمق", x: 60, y: 50 },
      { id: "h4", label: "الإتقان", x: 85, y: 25 },
    ],
  },
  {
    id: "parent",
    title: "لولي الأمر: تابع تقدّم ابنك بشفافية",
    subtitle: "تقارير واضحة، خريطة ثغرات، ومؤشر تقدم أسبوعي.",
    description: "لا حاجة لانتظار النتائج النهائية. تابع التقدم يوماً بيوم، واعرف بالضبط أين يحتاج ابنك للمساعدة.",
    visual: "parent-view",
    neurons: [
      { id: "p1", label: "التقييم", x: 15, y: 40 },
      { id: "p2", label: "التقدم", x: 45, y: 20 },
      { id: "p3", label: "التقرير", x: 75, y: 40 },
    ],
  },
];

// ─── Neural Network SVG Component ───────────────────────────────────────
function NeuralNetwork({
  neurons,
  synapses,
  scanning,
  healing,
}: {
  neurons: NeuronNode[];
  synapses: Synapse[];
  scanning?: boolean;
  healing?: boolean;
}) {
  return (
    <svg viewBox="0 0 100 70" className="w-full max-w-lg" style={{ overflow: "visible" }}>
      {/* Background glow */}
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(45 90% 55%)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(45 90% 55%)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nodeGlowCyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(180 60% 50%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(180 60% 50%)" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Synapses (connections) */}
      {synapses.map((s, i) => {
        const from = neurons.find((n) => n.id === s.from);
        const to = neurons.find((n) => n.id === s.to);
        if (!from || !to) return null;

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - 8;

        return (
          <motion.path
            key={`syn-${i}`}
            d={`M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`}
            fill="none"
            stroke={s.broken ? "hsl(0 84% 60%)" : s.active ? "hsl(45 90% 55%)" : "hsl(220 15% 20%)"}
            strokeWidth={s.active ? 0.8 : 0.4}
            strokeDasharray={s.broken ? "2 2" : "none"}
            filter={s.active && !s.broken ? "url(#glow)" : "none"}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: s.active ? 1 : 0.3,
              opacity: s.active ? 1 : 0.3,
            }}
            transition={{ duration: 1.2, delay: i * 0.2, ease: "easeInOut" }}
          />
        );
      })}

      {/* Pulse along active synapses */}
      {synapses
        .filter((s) => s.active && !s.broken)
        .map((s, i) => {
          const from = neurons.find((n) => n.id === s.from);
          const to = neurons.find((n) => n.id === s.to);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - 8;
          return (
            <motion.circle
              key={`pulse-${i}`}
              r="1"
              fill="hsl(45 90% 70%)"
              filter="url(#glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            >
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path={`M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`}
                begin={`${i * 0.5}s`}
              />
            </motion.circle>
          );
        })}

      {/* Scanning line */}
      {scanning && (
        <motion.line
          x1="0"
          y1="0"
          x2="100"
          y2="0"
          stroke="hsl(180 60% 50%)"
          strokeWidth="0.3"
          opacity="0.6"
          filter="url(#glow)"
          initial={{ y1: 0, y2: 0 }}
          animate={{ y1: [0, 70, 0], y2: [0, 70, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Neuron nodes */}
      {neurons.map((n, i) => (
        <motion.g
          key={n.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 200 }}
          style={{ transformOrigin: `${n.x}px ${n.y}px` }}
        >
          {/* Glow circle */}
          {n.active && (
            <motion.circle
              cx={n.x}
              cy={n.y}
              r="8"
              fill={healing ? "url(#nodeGlowCyan)" : "url(#nodeGlow)"}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {/* Node */}
          <circle
            cx={n.x}
            cy={n.y}
            r="3.5"
            fill={n.active ? "hsl(220 15% 8%)" : "hsl(220 15% 12%)"}
            stroke={n.active ? "hsl(45 90% 55%)" : "hsl(220 15% 25%)"}
            strokeWidth={n.active ? 0.8 : 0.4}
          />
          {/* Inner dot */}
          <circle
            cx={n.x}
            cy={n.y}
            r="1.2"
            fill={n.active ? "hsl(45 90% 55%)" : "hsl(220 15% 30%)"}
          />
          {/* Label */}
          <text
            x={n.x}
            y={n.y + 8}
            textAnchor="middle"
            fill={n.active ? "hsl(45 90% 70%)" : "hsl(220 10% 40%)"}
            fontSize="3.2"
            fontFamily="Tajawal, sans-serif"
            fontWeight="700"
          >
            {n.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

// ─── Scene Component ────────────────────────────────────────────────────
function ScenePanel({
  scene,
  index,
  isActive,
}: {
  scene: (typeof SCENES)[number];
  index: number;
  isActive: boolean;
}) {
  const flip = index % 2 !== 0;
  const isParent = scene.id === "parent";

  // Build neurons with active state
  const neurons: NeuronNode[] = scene.neurons.map((n) => ({
    ...n,
    active: isActive,
  }));

  // Build synapses based on scene type
  const synapses: Synapse[] = [];
  for (let i = 0; i < scene.neurons.length - 1; i++) {
    const isBroken = scene.visual === "broken-synapse" && i === 1;
    synapses.push({
      from: scene.neurons[i].id,
      to: scene.neurons[i + 1].id,
      active: isActive,
      broken: isBroken,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.15, y: 30 }}
      transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex flex-col ${flip ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16 rounded-3xl p-6 lg:p-10 transition-all duration-700 ${
        isActive
          ? isParent
            ? "bg-accent/5 border border-accent/15"
            : "bg-primary/5 border border-primary/10"
          : "bg-transparent border border-transparent"
      }`}
    >
      {/* Text */}
      <div className="flex-1 min-w-0 text-right" dir="rtl">
        {isParent && (
          <div className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold mb-4">
            👨‍👩‍👧 لولي الأمر
          </div>
        )}
        <h2
          className={`text-2xl lg:text-4xl font-black leading-tight mb-3 transition-colors duration-500 ${
            isActive
              ? isParent
                ? "text-accent"
                : "text-primary"
              : "text-muted-foreground/30"
          }`}
        >
          {scene.title}
        </h2>
        <p
          className={`text-sm lg:text-base font-bold mb-2 transition-colors duration-500 ${
            isActive ? "text-foreground/80" : "text-foreground/10"
          }`}
        >
          {scene.subtitle}
        </p>
        <p
          className={`text-sm leading-relaxed transition-colors duration-500 ${
            isActive ? "text-muted-foreground" : "text-muted-foreground/10"
          }`}
        >
          {scene.description}
        </p>
        {isActive && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className={`h-px mt-6 origin-right ${
              isParent
                ? "bg-gradient-to-l from-accent/50 to-transparent"
                : "bg-gradient-to-l from-primary/50 to-transparent"
            }`}
          />
        )}
      </div>

      {/* Neural Visual */}
      <div className="flex-shrink-0 w-full lg:w-[380px] flex justify-center items-center">
        <NeuralNetwork
          neurons={neurons}
          synapses={synapses}
          scanning={scene.visual === "scan-detect" && isActive}
          healing={scene.visual === "reconnect" && isActive}
        />
      </div>
    </motion.div>
  );
}

// ─── Stats Badge ────────────────────────────────────────────────────────
function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-4">
      <div className="text-2xl lg:text-3xl font-black text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ─── Background Neural Web ──────────────────────────────────────────────
function BackgroundNeural() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03]">
      <svg viewBox="0 0 1000 1000" className="w-full h-full">
        {Array.from({ length: 40 }, (_, i) => {
          const x = Math.random() * 1000;
          const y = Math.random() * 1000;
          return <circle key={i} cx={x} cy={y} r="2" fill="hsl(45 90% 55%)" />;
        })}
        {Array.from({ length: 30 }, (_, i) => {
          const x1 = Math.random() * 1000;
          const y1 = Math.random() * 1000;
          const x2 = x1 + (Math.random() - 0.5) * 300;
          const y2 = y1 + (Math.random() - 0.5) * 300;
          return (
            <line
              key={`l-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(45 90% 55%)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Main Landing Component
// ═══════════════════════════════════════════════════════════════════════
export default function Landing() {
  const [activeScene, setActiveScene] = useState(-1);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggered = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });

  // Intersection observer for scenes
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.35) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!isNaN(idx) && !triggered.current.has(idx)) {
              triggered.current.add(idx);
              setActiveScene(idx);
            }
          }
        });
      },
      { threshold: 0.35 }
    );
    sceneRefs.current.forEach((el) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // Global synapse count based on scroll
  const synapseCount = useTransform(scrollYProgress, [0, 1], [0, 47]);
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    const unsub = synapseCount.on("change", (v) => setDisplayCount(Math.round(v)));
    return unsub;
  }, [synapseCount]);

  return (
    <div ref={containerRef} className="light relative bg-background min-h-screen" dir="rtl">
      <BackgroundNeural />

      {/* Progress bar (top) */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary z-50 origin-right"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Synapse counter (fixed) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border text-xs"
      >
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground font-mono">
          وصلات نشطة:
        </span>
        <span className="text-primary font-black">{displayCount}</span>
      </motion.div>

      {/* Progress dots (side) */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40">
        {SCENES.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              i <= activeScene
                ? "bg-primary scale-150 shadow-[0_0_8px_hsl(45_90%_55%/0.6)]"
                : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* ── Hero ── */}
      <div className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center">
        {/* Hero neural animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <svg viewBox="0 0 400 300" className="w-full max-w-3xl">
            {/* Animated expanding neural web */}
            {[
              [200, 150],
              [120, 80],
              [280, 80],
              [80, 200],
              [320, 200],
              [160, 220],
              [240, 220],
              [200, 60],
              [140, 150],
              [260, 150],
            ].map(([cx, cy], i) => (
              <motion.circle
                key={i}
                cx={cx}
                cy={cy}
                r="4"
                fill="hsl(45 90% 55%)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            ))}
            {[
              [200, 150, 120, 80],
              [200, 150, 280, 80],
              [200, 150, 80, 200],
              [200, 150, 320, 200],
              [120, 80, 200, 60],
              [280, 80, 200, 60],
              [80, 200, 160, 220],
              [320, 200, 240, 220],
              [140, 150, 120, 80],
              [260, 150, 280, 80],
            ].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={`l-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(45 90% 55%)"
                strokeWidth="0.8"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ delay: 1 + i * 0.1, duration: 1 }}
              />
            ))}
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 max-w-2xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-primary/30" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-primary/50 uppercase">
              BAC 2025 · Neural Learning Engine
            </span>
            <div className="h-px w-10 bg-primary/30" />
          </div>

          {/* Neural emoji cluster */}
          <div className="text-5xl mb-4">🧬</div>

          <h1 className="text-4xl lg:text-6xl font-black text-foreground leading-[1.1] mb-6">
            دماغك يبني مسارات
            <br />
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              جديدة الآن
            </span>
          </h1>

          <p className="text-muted-foreground text-sm lg:text-base max-w-md mx-auto leading-relaxed mb-8">
            كل مفهوم رياضي = عُقدة عصبية. كل فهم = وصلة جديدة.
            <br />
            QED يكتشف الوصلات المقطوعة ويساعدك على إعادة بنائها.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-1 mb-10">
            <StatBadge value="٤٧" label="وصلة عصبية" />
            <div className="w-px h-8 bg-border mx-2" />
            <StatBadge value="٥ دق" label="للتشخيص" />
            <div className="w-px h-8 bg-border mx-2" />
            <StatBadge value="٩٥٪" label="دقة التحليل" />
          </div>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/home"
              className="inline-block px-10 py-4 rounded-2xl bg-gradient-to-l from-primary to-amber-500 text-primary-foreground font-black text-lg shadow-[0_10px_40px_hsl(45_90%_55%/0.3)] hover:shadow-[0_14px_50px_hsl(45_90%_55%/0.5)] transition-shadow"
            >
              ابدأ رحلة الاكتشاف ←
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-primary/20 flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="w-1 h-1 rounded-full bg-primary/40"
            />
          </div>
          <span className="font-mono text-[8px] tracking-[0.2em] text-primary/25">
            مرّر للأسفل
          </span>
        </motion.div>
      </div>

      {/* ── Scene Panels ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        {SCENES.map((scene, idx) => (
          <div
            key={scene.id}
            ref={(el) => { sceneRefs.current[idx] = el; }}
            data-idx={idx}
            className="min-h-[80vh] flex flex-col justify-center py-12"
          >
            <ScenePanel scene={scene} index={idx} isActive={activeScene >= idx} />

            {idx < SCENES.length - 1 && (
              <div className="flex justify-center my-8">
                <motion.div
                  initial={{ height: 0 }}
                  animate={activeScene >= idx ? { height: 60 } : { height: 0 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="w-px bg-gradient-to-b from-primary/40 to-transparent"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Final CTA ── */}
      <div className="min-h-[70vh] flex flex-col justify-center items-center text-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-xl"
        >
          <div className="text-4xl mb-4">🧠</div>
          <h2 className="text-3xl lg:text-5xl font-black text-foreground leading-tight mb-6">
            دماغك جاهز
            <br />
            <span className="text-primary">ابنِ الوصلات الآن</span>
          </h2>
          <p className="text-muted-foreground text-sm lg:text-base mb-10 leading-relaxed">
            ٥ دقائق تكفي لتكتشف خريطة ثغراتك وتبدأ بناء وصلات جديدة.
            <br />
            بدون حساب · بدون بطاقة بنكية · نتائج فورية.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/home"
              className="inline-block px-12 py-5 rounded-2xl bg-gradient-to-l from-primary to-amber-500 text-primary-foreground font-black text-xl shadow-[0_0_50px_hsl(45_90%_55%/0.4),0_16px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_0_70px_hsl(45_90%_55%/0.6),0_20px_60px_rgba(0,0,0,0.6)] transition-shadow"
            >
              اكتشف ثغراتك الآن — مجاني ←
            </Link>
          </motion.div>
          <div className="mt-4 text-[10px] text-muted-foreground/40 font-mono tracking-wider">
            بدون حساب · بدون بطاقة بنكية · نتائج فورية
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-[10px] text-muted-foreground/30 font-mono tracking-[0.15em]">
          © 2025 QED ALGERIA · NEURAL LEARNING ENGINE · مبني بحب للطالب الجزائري 🇩🇿
        </p>
      </div>
    </div>
  );
}
