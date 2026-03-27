// ===== What-If Scenario — Change parameters and see results in real-time =====
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ScenarioTab = "algebra" | "geometry" | "probability";

const TABS: { id: ScenarioTab; label: string; emoji: string }[] = [
  { id: "algebra", label: "المعادلات", emoji: "📊" },
  { id: "geometry", label: "الهندسة", emoji: "📐" },
  { id: "probability", label: "الاحتمالات", emoji: "🎲" },
];

export default function WhatIf() {
  const [tab, setTab] = useState<ScenarioTab>("algebra");

  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">
      <div className="flex-shrink-0 border-b border-border px-4 py-2 flex gap-2" style={{ background: "linear-gradient(to left, hsl(var(--probability) / 0.08), hsl(var(--probability) / 0.03), hsl(var(--background)))" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {tab === "algebra" && <AlgebraWhatIf key="alg" />}
          {tab === "geometry" && <GeometryWhatIf key="geo" />}
          {tab === "probability" && <ProbabilityWhatIf key="prob" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. ALGEBRA — ax² + bx + c parameter explorer
// ═══════════════════════════════════════════════════════════════

function AlgebraWhatIf() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);

  const discriminant = b * b - 4 * a * c;
  const vertex = a !== 0 ? { x: -b / (2 * a), y: c - (b * b) / (4 * a) } : null;
  const roots = useMemo(() => {
    if (a === 0) return b !== 0 ? [{ x: -c / b, label: "خطي" }] : [];
    if (discriminant < 0) return [];
    if (discriminant === 0) return [{ x: -b / (2 * a), label: "مزدوج" }];
    const sq = Math.sqrt(discriminant);
    return [
      { x: (-b + sq) / (2 * a), label: "x₁" },
      { x: (-b - sq) / (2 * a), label: "x₂" },
    ];
  }, [a, b, c, discriminant]);

  // Graph
  const W = 600, H = 400;
  const xRange = 12;
  const yRange = 12;
  const toSVG = (x: number, y: number) => ({
    sx: (x + xRange) / (2 * xRange) * W,
    sy: H / 2 - (y / yRange) * (H / 2),
  });

  const steps = 300;
  let pathD = "";
  for (let i = 0; i <= steps; i++) {
    const x = -xRange + (i / steps) * 2 * xRange;
    const y = a * x * x + b * x + c;
    if (Math.abs(y) > yRange * 2) { pathD += " "; continue; }
    const { sx, sy } = toSVG(x, y);
    pathD += (pathD === "" || pathD.endsWith(" ")) ? `M${sx},${sy}` : `L${sx},${sy}`;
  }

  // Axes
  const { sx: ox, sy: oy } = toSVG(0, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          <h2 className="text-base font-black text-foreground">🔬 ماذا لو غيّرت المعاملات؟</h2>
          <p className="text-xs text-muted-foreground">غيّر a, b, c وشاهد كيف تتغير القطع المكافئ والجذور</p>

          <div className="space-y-4">
            <ParamSlider label="a" value={a} onChange={setA} min={-5} max={5} step={0.1} color="text-destructive" desc="يتحكم في فتحة القطع واتجاهه" />
            <ParamSlider label="b" value={b} onChange={setB} min={-10} max={10} step={0.5} color="text-primary" desc="يزيح القطع أفقياً" />
            <ParamSlider label="c" value={c} onChange={setC} min={-10} max={10} step={0.5} color="text-muted-foreground" desc="يرفع أو يخفض القطع عمودياً" />
          </div>

          {/* Equation display */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center">
            <div className="text-lg font-mono font-black text-foreground" dir="ltr">
              f(x) = <span className="text-destructive">{a}</span>x² {b >= 0 ? "+" : ""} <span className="text-primary">{b}</span>x {c >= 0 ? "+" : ""} <span className="text-muted-foreground">{c}</span>
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-2">
            <InfoCard label="المميّز Δ" value={discriminant.toFixed(2)} color={discriminant > 0 ? "text-primary" : discriminant === 0 ? "text-accent-foreground" : "text-destructive"} />
            <InfoCard label="عدد الجذور" value={roots.length.toString()} />
            {roots.map((r, i) => (
              <InfoCard key={i} label={r.label} value={r.x.toFixed(3)} />
            ))}
            {vertex && <InfoCard label="الرأس" value={`(${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)})`} />}
            <InfoCard
              label="طبيعة الدالة"
              value={a > 0 ? "محدبة ∪" : a < 0 ? "مقعرة ∩" : "خطية"}
            />
          </div>
        </div>

        {/* Graph */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 450 }}>
            <rect width={W} height={H} className="fill-card" />
            {/* Grid */}
            {Array.from({ length: 25 }, (_, i) => {
              const x = (i / 24) * W;
              return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} className="stroke-border" strokeWidth={0.3} />;
            })}
            {Array.from({ length: 17 }, (_, i) => {
              const y = (i / 16) * H;
              return <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} className="stroke-border" strokeWidth={0.3} />;
            })}
            {/* Axes */}
            <line x1={ox} y1={0} x2={ox} y2={H} className="stroke-foreground/30" strokeWidth={1} />
            <line x1={0} y1={oy} x2={W} y2={oy} className="stroke-foreground/30" strokeWidth={1} />
            {/* Curve */}
            <path d={pathD} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
            {/* Roots */}
            {roots.map((r, i) => {
              const { sx, sy } = toSVG(r.x, 0);
              return (
                <g key={i}>
                  <circle cx={sx} cy={sy} r={6} className="fill-destructive" />
                  <text x={sx} y={sy + 18} className="fill-destructive text-[10px] font-bold" textAnchor="middle">
                    {r.x.toFixed(2)}
                  </text>
                </g>
              );
            })}
            {/* Vertex */}
            {vertex && (() => {
              const { sx, sy } = toSVG(vertex.x, vertex.y);
              return (
                <g>
                  <circle cx={sx} cy={sy} r={5} className="fill-accent" />
                  <text x={sx} y={sy - 10} className="fill-accent text-[9px] font-bold" textAnchor="middle">
                    رأس
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 2. GEOMETRY — Change dimensions, see effects on area/pythagorean
// ═══════════════════════════════════════════════════════════════

function GeometryWhatIf() {
  const [sideA, setSideA] = useState(3);
  const [sideB, setSideB] = useState(4);

  const hypotenuse = Math.sqrt(sideA * sideA + sideB * sideB);
  const area = (sideA * sideB) / 2;
  const perimeter = sideA + sideB + hypotenuse;
  const angleA = Math.atan(sideA / sideB) * (180 / Math.PI);
  const angleB = 90 - angleA;

  // Draw right triangle
  const W = 500, H = 400;
  const scale = Math.min(300 / sideA, 300 / sideB, 60);
  const ax = 100, ay = H - 60;
  const bx = ax + sideB * scale, by = ay;
  const cx = ax, cy = ay - sideA * scale;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <h2 className="text-base font-black text-foreground">🔬 ماذا لو غيّرت أضلاع المثلث؟</h2>
          <p className="text-xs text-muted-foreground">غيّر طول الضلعين وشاهد تأثيره على الوتر والمساحة</p>

          <ParamSlider label="الضلع a" value={sideA} onChange={setSideA} min={0.5} max={15} step={0.5} color="text-primary" desc="الضلع العمودي" />
          <ParamSlider label="الضلع b" value={sideB} onChange={setSideB} min={0.5} max={15} step={0.5} color="text-muted-foreground" desc="الضلع الأفقي" />

          {/* Pythagorean theorem */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border text-center font-mono" dir="ltr">
            <div className="text-sm text-foreground">
              <span className="text-primary">{sideA}²</span> + <span className="text-muted-foreground">{sideB}²</span> = <span className="text-destructive">{hypotenuse.toFixed(2)}²</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(sideA * sideA).toFixed(1)} + {(sideB * sideB).toFixed(1)} = {(hypotenuse * hypotenuse).toFixed(1)}
            </div>
          </div>

          <div className="space-y-2">
            <InfoCard label="الوتر c" value={hypotenuse.toFixed(3)} color="text-destructive" />
            <InfoCard label="المساحة" value={area.toFixed(2)} />
            <InfoCard label="المحيط" value={perimeter.toFixed(2)} />
            <InfoCard label="الزاوية A" value={`${angleA.toFixed(1)}°`} />
            <InfoCard label="الزاوية B" value={`${angleB.toFixed(1)}°`} />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 450 }}>
            <rect width={W} height={H} className="fill-card" />
            {/* Triangle */}
            <polygon points={`${ax},${ay} ${bx},${by} ${cx},${cy}`} className="fill-primary/10 stroke-primary" strokeWidth={2.5} />
            {/* Right angle marker */}
            <rect x={ax} y={ay - 15} width={15} height={15} fill="none" className="stroke-foreground/40" strokeWidth={1} />
            {/* Labels */}
            <text x={(ax + ax) / 2 - 25} y={(ay + cy) / 2} className="fill-primary text-[13px] font-black" textAnchor="middle">a = {sideA}</text>
            <text x={(ax + bx) / 2} y={ay + 25} className="fill-muted-foreground text-[13px] font-black" textAnchor="middle">b = {sideB}</text>
            <text x={(bx + cx) / 2 + 20} y={(by + cy) / 2} className="fill-destructive text-[13px] font-black" textAnchor="middle">c = {hypotenuse.toFixed(2)}</text>
            {/* Area squares visualization */}
            <rect x={ax - sideA * scale} y={cy} width={sideA * scale} height={sideA * scale} className="fill-primary/10 stroke-primary/30" strokeWidth={1} strokeDasharray="3 3" />
            <text x={ax - sideA * scale / 2} y={cy + sideA * scale / 2} className="fill-primary/50 text-[10px] font-bold" textAnchor="middle">a²={(sideA*sideA).toFixed(1)}</text>
            <rect x={ax} y={ay} width={sideB * scale} height={sideB * scale * 0.5} className="fill-muted/30 stroke-muted-foreground/30" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3. PROBABILITY — Change urn composition, see probability shifts
// ═══════════════════════════════════════════════════════════════

function ProbabilityWhatIf() {
  const [red, setRed] = useState(3);
  const [blue, setBlue] = useState(5);
  const [green, setGreen] = useState(2);
  const [draws, setDraws] = useState(1);

  const total = red + blue + green;
  const pRed = total > 0 ? red / total : 0;
  const pBlue = total > 0 ? blue / total : 0;
  const pGreen = total > 0 ? green / total : 0;

  // Multiple draws (with replacement)
  const pAtLeastOneRed = 1 - Math.pow(1 - pRed, draws);
  const pAllBlue = Math.pow(pBlue, draws);

  // Visual urn
  const balls: { color: string; className: string }[] = [
    ...Array(red).fill({ color: "أحمر", className: "fill-destructive" }),
    ...Array(blue).fill({ color: "أزرق", className: "fill-primary" }),
    ...Array(green).fill({ color: "أخضر", className: "fill-accent" }),
  ];

  const W = 300, H = 300;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <h2 className="text-base font-black text-foreground">🔬 ماذا لو غيّرت محتوى الجرة؟</h2>
          <p className="text-xs text-muted-foreground">غيّر عدد الكرات وشاهد تغيّر الاحتمالات فوراً</p>

          <ParamSlider label="🔴 كرات حمراء" value={red} onChange={v => setRed(Math.round(v))} min={0} max={20} step={1} color="text-destructive" />
          <ParamSlider label="🔵 كرات زرقاء" value={blue} onChange={v => setBlue(Math.round(v))} min={0} max={20} step={1} color="text-primary" />
          <ParamSlider label="🟢 كرات خضراء" value={green} onChange={v => setGreen(Math.round(v))} min={0} max={20} step={1} color="text-accent-foreground" />
          <ParamSlider label="عدد السحبات" value={draws} onChange={v => setDraws(Math.round(v))} min={1} max={10} step={1} color="text-foreground" desc="مع إعادة" />

          <div className="space-y-2 mt-4">
            <InfoCard label="مجموع الكرات" value={total.toString()} />
            <InfoCard label="P(أحمر)" value={`${(pRed * 100).toFixed(1)}%`} color="text-destructive" />
            <InfoCard label="P(أزرق)" value={`${(pBlue * 100).toFixed(1)}%`} color="text-primary" />
            <InfoCard label="P(أخضر)" value={`${(pGreen * 100).toFixed(1)}%`} color="text-accent-foreground" />
            {draws > 1 && (
              <>
                <InfoCard label={`P(≥1 أحمر في ${draws} سحبات)`} value={`${(pAtLeastOneRed * 100).toFixed(1)}%`} color="text-destructive" />
                <InfoCard label={`P(كلها زرقاء في ${draws} سحبات)`} value={`${(pAllBlue * 100).toFixed(1)}%`} color="text-primary" />
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Visual urn */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">🏺 الجرة</h3>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full mx-auto" style={{ maxWidth: 350, maxHeight: 350 }}>
              <rect width={W} height={H} className="fill-card" />
              {/* Urn shape */}
              <path d={`M80,60 Q60,60 50,100 L40,250 Q40,280 80,280 L220,280 Q260,280 260,250 L250,100 Q240,60 220,60 Z`} className="fill-muted/50 stroke-border" strokeWidth={2} />
              {/* Balls */}
              {balls.map((ball, i) => {
                const cols = 6;
                const row = Math.floor(i / cols);
                const col = i % cols;
                const bx = 95 + col * 30 + (row % 2 ? 15 : 0);
                const by = 250 - row * 28;
                return (
                  <circle key={i} cx={bx} cy={by} r={11} className={ball.className} opacity={0.9}>
                    <animate attributeName="cy" from={by - 5} to={by} dur="0.4s" begin={`${i * 0.05}s`} fill="freeze" />
                  </circle>
                );
              })}
            </svg>
          </div>

          {/* Probability bars */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">📊 توزيع الاحتمالات</h3>
            <ProbBar label="أحمر" percent={pRed * 100} color="bg-destructive" />
            <ProbBar label="أزرق" percent={pBlue * 100} color="bg-primary" />
            <ProbBar label="أخضر" percent={pGreen * 100} color="bg-accent" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════ Shared Components ═══════

function ParamSlider({ label, value, onChange, min, max, step, color = "text-foreground", desc }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; color?: string; desc?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-bold ${color}`}>{label}</span>
        <span className="text-sm font-mono font-black text-foreground">{value}</span>
      </div>
      {desc && <div className="text-[9px] text-muted-foreground mb-1">{desc}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-muted accent-primary"
      />
    </div>
  );
}

function InfoCard({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono font-black ${color}`}>{value}</span>
    </div>
  );
}

function ProbBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-muted-foreground w-12">{label}</span>
      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-[11px] font-mono font-bold text-foreground w-14 text-left" dir="ltr">
        {percent.toFixed(1)}%
      </span>
    </div>
  );
}
