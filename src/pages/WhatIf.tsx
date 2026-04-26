// ===== What-If Scenario — Change parameters and see results in real-time =====
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KBExerciseSidekick } from "@/components/KBExerciseSidekick";
import { ConceptContextCard } from "@/components/ConceptContextCard";
import { WHATIF_CONTEXT } from "@/components/conceptContexts";

type ScenarioTab = "algebra" | "geometry" | "probability" | "projectile" | "grades" | "perimeter" | "balance" | "scientific" | "pgcd";

const GRADE_TO_KB: Record<string, string> = {
  "1am": "1AM",
  "2am": "2AM",
  "3am": "3AM",
  "bem": "4AM",
  "1as": "1AS",
  "2as": "2AS",
  "bac": "3AS",
};

const TAB_TO_KEYWORDS: Record<ScenarioTab, { keywords: string[]; label: string; accent: any }> = {
  perimeter:  { keywords: ["مساحة", "محيط", "مستطيل"], label: "المساحة والمحيط", accent: "geometry" },
  balance:    { keywords: ["معادلة", "حل المعادلات", "الميزان"], label: "المعادلات", accent: "algebra" },
  scientific: { keywords: ["كتابة علمية", "قوى", "أسس"], label: "الكتابة العلمية", accent: "statistics" },
  pgcd:       { keywords: ["القاسم المشترك", "PGCD", "قاسم"], label: "PGCD والقواسم", accent: "algebra" },
  geometry:   { keywords: ["فيثاغورس", "مثلث قائم", "النسب المثلثية"], label: "فيثاغورس", accent: "geometry" },
  algebra:    { keywords: ["الدرجة الثانية", "ثلاثي الحدود", "كثيرة الحدود"], label: "معادلات الدرجة الثانية", accent: "algebra" },
  probability:{ keywords: ["احتمال", "احتمالات", "إحصاء"], label: "الاحتمالات", accent: "probability" },
  projectile: { keywords: ["دالة", "قطع مكافئ", "الدرجة الثانية"], label: "حركة القذائف", accent: "functions" },
  grades:     { keywords: ["معدل", "متوسط", "وسط"], label: "حساب المعدل", accent: "statistics" },
};

const GRADES = [
  { id: "1am", label: "1AM" },
  { id: "2am", label: "2AM" },
  { id: "3am", label: "3AM" },
  { id: "bem", label: "4AM (BEM)" },
  { id: "1as", label: "1AS" },
  { id: "2as", label: "2AS" },
  { id: "bac", label: "3AS (BAC)" },
];

const ALL_TABS: { id: ScenarioTab; label: string; emoji: string; grades: string[] }[] = [
  { id: "perimeter", label: "المساحة والمحيط", emoji: "🟩", grades: ["1am"] },
  { id: "balance", label: "الميزان (معادلات)", emoji: "⚖️", grades: ["2am"] },
  { id: "scientific", label: "الكتابة العلمية", emoji: "🔬", grades: ["3am"] },
  { id: "pgcd", label: "القاسم المشترك (PGCD)", emoji: "➗", grades: ["bem"] },
  { id: "geometry", label: "فيثاغورس", emoji: "📐", grades: ["3am", "bem"] },
  { id: "algebra", label: "المعادلات (الدرجة 2)", emoji: "📊", grades: ["1as", "2as", "bac"] },
  { id: "probability", label: "الاحتمالات", emoji: "🎲", grades: ["2as", "bac"] },
  { id: "projectile", label: "قذف الأجسام", emoji: "🚀", grades: ["bac"] },
  { id: "grades", label: "توقع المعدل", emoji: "🎓", grades: ["bem", "bac"] },
];

export default function WhatIf() {
  const [grade, setGrade] = useState("bem");
  const visibleTabs = ALL_TABS.filter(t => t.grades.includes(grade));
  const [tab, setTab] = useState<ScenarioTab>("pgcd");

  if (!visibleTabs.find(t => t.id === tab)) {
    setTab(visibleTabs[0].id);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">
      {/* Grade Selector */}
      <div className="flex-shrink-0 bg-muted/30 border-b border-border px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {GRADES.map(g => (
          <button
            key={g.id}
            onClick={() => setGrade(g.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              grade === g.id ? "bg-foreground text-background" : "bg-card text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex-shrink-0 border-b border-border px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar" style={{ background: "linear-gradient(to left, hsl(var(--probability) / 0.08), hsl(var(--probability) / 0.03), hsl(var(--background)))" }}>
        {visibleTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 max-w-[1600px] mx-auto">
          <div className="min-w-0">
            {WHATIF_CONTEXT[tab] && (
              <ConceptContextCard context={WHATIF_CONTEXT[tab]} />
            )}
            <AnimatePresence mode="wait">
              {tab === "algebra" && <AlgebraWhatIf key="alg" />}
              {tab === "geometry" && <GeometryWhatIf key="geo" />}
              {tab === "probability" && <ProbabilityWhatIf key="prob" />}
              {tab === "projectile" && <ProjectileWhatIf key="proj" />}
              {tab === "grades" && <GradeSimulator key="grade" />}
              {tab === "perimeter" && <PerimeterWhatIf key="perim" />}
              {tab === "balance" && <BalanceWhatIf key="bal" />}
              {tab === "scientific" && <ScientificWhatIf key="sci" />}
              {tab === "pgcd" && <PGCDWhatIf key="pgcd" />}
            </AnimatePresence>
          </div>

          {/* KB sidekick — real exercises matching the active scenario */}
          {TAB_TO_KEYWORDS[tab].keywords.length > 0 && (
            <aside className="xl:sticky xl:top-4 xl:self-start">
              <KBExerciseSidekick
                grade={GRADE_TO_KB[grade] || "4AM"}
                chapterKeywords={TAB_TO_KEYWORDS[tab].keywords}
                conceptLabel={TAB_TO_KEYWORDS[tab].label}
                accent={TAB_TO_KEYWORDS[tab].accent}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1.5 PROJECTILE MOTION — Physics/Math integration (Parabola)
// ═══════════════════════════════════════════════════════════════

function ProjectileWhatIf() {
  const [v0, setV0] = useState(25);
  const [angle, setAngle] = useState(45);
  const [g, setG] = useState(9.8);

  const rad = (angle * Math.PI) / 180;
  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);
  
  const timeOfFlight = (2 * vy) / (g || 1);
  const maxRange = (v0 * v0 * Math.sin(2 * rad)) / (g || 1);
  const maxHeight = (vy * vy) / (2 * (g || 1));

  // Trajectory points
  const W = 600, H = 400;
  const padding = 40;
  const scale = Math.min((W - 2 * padding) / (maxRange || 1), (H - 2 * padding) / (maxHeight || 1), 5);
  
  const toSVG = (x: number, y: number) => ({
    sx: padding + x * scale,
    sy: H - padding - y * scale,
  });

  const steps = 100;
  let pathD = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * timeOfFlight;
    const x = vx * t;
    const y = vy * t - 0.5 * g * t * t;
    const { sx, sy } = toSVG(x, y);
    pathD += i === 0 ? `M${sx},${sy}` : `L${sx},${sy}`;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <h2 className="text-base font-black text-foreground">🚀 ماذا لو قذفت جسماً؟</h2>
          <p className="text-xs text-muted-foreground">تحصل حركة القذيفة في مسار تدرسه في الرياضيات (القطع المكافئ)</p>

          <ParamSlider label="السرعة الابتدائية (m/s)" value={v0} onChange={setV0} min={1} max={100} step={1} color="text-primary" />
          <ParamSlider label="زاوية القذف (°)" value={angle} onChange={setAngle} min={0} max={90} step={1} color="text-accent-foreground" />
          <ParamSlider label="الجاذبية (m/s²)" value={g} onChange={setG} min={1} max={30} step={0.1} color="text-muted-foreground" desc="9.8 للأرض، 1.6 للقمر" />

          <div className="space-y-2 mt-4">
            <InfoCard label="زمن التحليق" value={`${timeOfFlight.toFixed(2)} ثا`} />
            <InfoCard label="أقصى مدى (الأفقي)" value={`${maxRange.toFixed(1)} م`} color="text-primary" />
            <InfoCard label="أقصى ارتفاع (الذروة)" value={`${maxHeight.toFixed(1)} م`} color="text-accent-foreground" />
            <InfoCard label="معادلة المسار" value="y = ax² + bx" />
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 450 }}>
            <rect width={W} height={H} className="fill-card" />
            <line x1={padding} y1={H - padding} x2={W - padding} y2={H - padding} className="stroke-muted-foreground/30" strokeWidth={1} />
            <line x1={padding} y1={padding} x2={padding} y2={H - padding} className="stroke-muted-foreground/30" strokeWidth={1} />
            <path d={pathD} fill="none" className="stroke-primary" strokeWidth={3} strokeLinecap="round" />
            {(() => {
              const peak = toSVG(maxRange / 2, maxHeight);
              const end = toSVG(maxRange, 0);
              return (
                <g>
                  <circle cx={peak.sx} cy={peak.sy} r={5} className="fill-accent stroke-background" strokeWidth={2} />
                  <text x={peak.sx} y={peak.sy - 12} className="fill-accent text-[10px] font-black" textAnchor="middle">الذروة</text>
                  <circle cx={end.sx} cy={end.sy} r={5} className="fill-destructive stroke-background" strokeWidth={2} />
                  <text x={end.sx} y={end.sy - 12} className="fill-destructive text-[10px] font-black" textAnchor="middle">المدى</text>
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
// 1.7 GRADE SIMULATOR — Target vs Expected BAC results
// ═══════════════════════════════════════════════════════════════

function GradeSimulator() {
  const Subjects = [
    { id: "math", name: "الرياضيات", coef: 7, color: "bg-primary" },
    { id: "phys", name: "الفيزياء", coef: 6, color: "bg-accent" },
    { id: "nature", name: "العلوم", coef: 6, color: "bg-geometry" },
    { id: "arab", name: "العربية", coef: 3, color: "bg-statistics" },
    { id: "phil", name: "الفلسفة", coef: 2, color: "bg-destructive" },
  ];

  const [scores, setScores] = useState<Record<string, number>>(
    Subjects.reduce((acc, s) => ({ ...acc, [s.id]: 10 }), {})
  );

  const totalCoef = Subjects.reduce((acc, s) => acc + s.coef, 0);
  const average = Subjects.reduce((acc, s) => acc + (scores[s.id] * s.coef), 0) / totalCoef;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-base font-black text-foreground">🎓 ماذا لو حصلت على هذه العلامات؟</h2>
          <p className="text-xs text-muted-foreground">توقع معدلك في البكالوريا بناءً على معاملات المواد العلمية</p>
          
          <div className="grid grid-cols-1 gap-4">
            {Subjects.map(s => (
              <div key={s.id} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold">{s.name} <span className="text-[10px] text-muted-foreground opacity-60">(معامل {s.coef})</span></span>
                  <span className="text-sm font-black font-mono">{scores[s.id]}</span>
                </div>
                <input 
                  type="range" min={0} max={20} step={0.25} value={scores[s.id]}
                  onChange={(e) => setScores(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full bg-muted accent-primary"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-primary/5 border-2 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
          <div className="text-sm font-bold text-muted-foreground mb-2">المعدل المتوقع</div>
          <div className="text-7xl font-black text-primary mb-2 drop-shadow-sm">{average.toFixed(2)}</div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${average >= 16 ? "bg-geometry text-geometry-foreground" : average >= 10 ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
            {average >= 16 ? "ممتاز (تقدير جيد جداً)" : average >= 12 ? "جيد (تقدير قريب من الجيد)" : average >= 10 ? "ناجح" : "راسب"}
          </div>
          
          <div className="mt-8 w-full p-4 rounded-xl bg-background border border-border space-y-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">توزيع النقاط</h4>
            <div className="flex h-3 w-full rounded-full overflow-hidden">
              {Subjects.map(s => (
                <div key={s.id} style={{ width: `${(scores[s.id] * s.coef / (average * totalCoef)) * 100}%` }} className={`${s.color}`} title={s.name} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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


// ═══════════════════════════════════════════════════════════════
// 1.8 PERIMETER VS AREA (1AM)
// ═══════════════════════════════════════════════════════════════
function PerimeterWhatIf() {
  const [width, setWidth] = useState(5);
  const [height, setHeight] = useState(5);

  const perimeter = 2 * (width + height);
  const area = width * height;

  const W = 400, H = 300;
  const padding = 40;
  // max allowable w/h is 15 so max scale is ~15
  const scale = Math.min((W - 2*padding)/15, (H - 2*padding)/15);
  const rw = width * scale;
  const rh = height * scale;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">المساحة والمحيط 🟩</h2>
          <p className="text-[11px] text-muted-foreground">لاحظ الفرق بين المحيط (طول الإطار الخارجي) والمساحة (المربعات الداخلية).</p>
          
          <ParamSlider label="الطول (L)" value={width} onChange={setWidth} min={1} max={15} step={1} color="text-primary" />
          <ParamSlider label="العرض (l)" value={height} onChange={setHeight} min={1} max={15} step={1} color="text-destructive" />
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-xs font-bold text-muted-foreground mb-1">المحيط (P)</div>
              <div className="font-mono text-xl font-black text-primary">{perimeter} <span className="text-xs">cm</span></div>
              <div className="text-[10px] mt-1 text-muted-foreground" style={{ direction: "ltr" }}>2 × ({width} + {height})</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-xs font-bold text-muted-foreground mb-1">المساحة (A)</div>
              <div className="font-mono text-xl font-black text-destructive">{area} <span className="text-xs">cm²</span></div>
              <div className="text-[10px] mt-1 text-muted-foreground" style={{ direction: "ltr" }}>{width} × {height}</div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center items-center bg-card rounded-3xl border border-border p-6 overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            <g transform={`translate(${(W-rw)/2}, ${(H-rh)/2})`}>
              <rect width={rw} height={rh} className="fill-destructive/10 stroke-primary" strokeWidth={4} />
              
              {/* Grid to show area */}
              {Array.from({length: width}).map((_, i) => (
                <line key={`v${i}`} x1={i*scale} y1={0} x2={i*scale} y2={rh} className="stroke-destructive/20" strokeWidth={1} />
              ))}
              {Array.from({length: height}).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i*scale} x2={rw} y2={i*scale} className="stroke-destructive/20" strokeWidth={1} />
              ))}
              
              <text x={rw/2} y={-10} textAnchor="middle" className="text-xs font-bold fill-primary">{width}</text>
              <text x={-20} y={rh/2} textAnchor="middle" className="text-xs font-bold fill-destructive">{height}</text>
            </g>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1.9 BALANCE SCALES EQUATIONS (2AM)
// ═══════════════════════════════════════════════════════════════
function BalanceWhatIf() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(8);
  const [step, setStep] = useState(0);

  // equation: x + a = b
  const x = b - a;
  
  const wX = step === 0 ? a : 0;
  const wB = step === 0 ? b : b - a;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">طريقة الميزان لحل المعادلات ⚖️</h2>
          <p className="text-[11px] text-muted-foreground">للحفاظ على توازن الميزان، ما نفعله في الكفة اليمنى يجب أن نفعله في اليسرى.</p>
          
          <ParamSlider label="الكتلة المعلومة (a)" value={a} onChange={(v) => {setA(v); setStep(0);}} min={1} max={10} step={1} color="text-destructive" />
          <ParamSlider label="كتلة الطرف الثاني (b)" value={b} onChange={(v) => {setB(v); setStep(0);}} min={a+1} max={20} step={1} color="text-primary" />
          
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setStep(0)} 
              className={`flex-1 py-2 rounded-xl text-xs font-bold border ${step === 0 ? "bg-foreground text-background" : "bg-card"}`}
            >
              1. المعادلة الأصلية
            </button>
            <button 
              onClick={() => setStep(1)} 
              className={`flex-1 py-2 rounded-xl text-xs font-bold border ${step === 1 ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              2. إضافة (-a) للطرفين
            </button>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card text-center font-mono font-black text-lg mt-4" style={{ direction: "ltr" }}>
            {step === 0 ? (
              <span>x + <span className="text-destructive">{a}</span> = <span className="text-primary">{b}</span></span>
            ) : (
              <span>x = <span className="text-primary">{b}</span> - <span className="text-destructive">{a}</span> = <span className="text-geometry">{x}</span></span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center p-6 bg-card rounded-3xl border border-border">
          <svg viewBox="0 0 400 300" className="w-full">
            {/* Base line */}
            <line x1={50} y1={250} x2={350} y2={250} className="stroke-foreground" strokeWidth={6} strokeLinecap="round" />
            {/* Pivot */}
            <polygon points="200,250 180,290 220,290" className="fill-foreground" />
            
            {/* Left Box (x + a) */}
            <g transform="translate(100, 250)">
              {/* X Box */}
              <rect x={-30} y={-40} width={60} height={40} className="fill-geometry stroke-background" strokeWidth={2} />
              <text x={0} y={-15} textAnchor="middle" className="text-xs font-black fill-geometry-foreground">x</text>
              {/* A Box */}
              <rect x={-15} y={-40 - (wX * 5)} width={30} height={wX * 5} className="fill-destructive stroke-background transition-all duration-500" strokeWidth={2} />
              {wX > 0 && <text x={0} y={-45 - (wX * 2.5)} textAnchor="middle" className="text-[10px] font-black fill-destructive-foreground">{a}</text>}
            </g>

            {/* Right Box (b) */}
            <g transform="translate(300, 250)">
              {/* B Box */}
              <rect x={-20} y={-(wB * 5)} width={40} height={wB * 5} className="fill-primary stroke-background transition-all duration-500" strokeWidth={2} />
              <text x={0} y={-(wB * 2.5) + 5} textAnchor="middle" className="text-xs font-black fill-primary-foreground">{wB}</text>
            </g>
            
            {/* Flying out blocks animation during step 1 */}
            <AnimatePresence>
              {step === 1 && (
                <motion.g initial={{y: 250 - 40 - (a*5), opacity: 1}} animate={{y: -50, opacity: 0}} transition={{duration: 1}}>
                  <rect x={100 - 15} y={0} width={30} height={a * 5} className="fill-destructive stroke-background" strokeWidth={2} />
                  <text x={100} y={(a*2.5) + 5} textAnchor="middle" className="text-[10px] font-black fill-destructive-foreground">-{a}</text>
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1.10 SCIENTIFIC NOTATION (3AM)
// ═══════════════════════════════════════════════════════════════
function ScientificWhatIf() {
  const [power, setPower] = useState(0);

  const MACRO = [
    { p: 0, label: "متر واحد — طول إنسان تقريباً", emoji: "🚶" },
    { p: 3, label: "كيلومتر — المسافة بين المدن", emoji: "🏙️" },
    { p: 6, label: "ميجامتر — مساحة قارة", emoji: "🌍" },
    { p: 9, label: "جيجامتر — قطر الشمس", emoji: "☀️" },
    { p: 12, label: "تيرامتر — النظام الشمسي", emoji: "🪐" },
  ];
  const MICRO = [
    { p: -3, label: "ميليمتر — حشرة صغيرة", emoji: "🐜" },
    { p: -6, label: "ميكرومتر — خلية بكتيرية", emoji: "🦠" },
    { p: -9, label: "نانومتر — جزيء DNA", emoji: "🧬" },
    { p: -10, label: "أنغستروم — ذرة", emoji: "⚛️" },
    { p: -15, label: "فيمتومتر — نواة الذرة", emoji: "🌌" },
  ];

  const getLabel = (p: number) => {
    const found = [...MACRO, ...MICRO].find(m => m.p === p) || [...MACRO, ...MICRO].reduce((prev, curr) => Math.abs(curr.p - p) < Math.abs(prev.p - p) ? curr : prev);
    return found;
  };

  const scaleInfo = getLabel(power);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">الكتابة العلمية ومقاييس الكون 🔬</h2>
          <p className="text-[11px] text-muted-foreground">الكتابة العلمية a × 10ⁿ تسمح بوصف المجرات البعيدة والذرات المتناهية الدقة.</p>
          
          <ParamSlider label="القوة (n)" value={power} onChange={setPower} min={-15} max={15} step={1} color={power > 0 ? "text-primary" : "text-geometry"} desc="يتحكم في عدد الأصفار ومقاس الوحدة" />
          
          <div className="text-center bg-card border border-border p-8 rounded-2xl mt-4">
            <div className="text-xs text-muted-foreground mb-4">الصيغة العلمية:</div>
            <div className="text-5xl font-black font-mono text-foreground" style={{ direction: "ltr" }}>
              10<sup className={power > 0 ? "text-primary" : "text-geometry"}>{power}</sup>
            </div>
            <div className="text-[10px] mt-4 text-muted-foreground break-all px-4" style={{ direction: "ltr" }}>
              {power >= 0 ? "1" + "0".repeat(power) : "0." + "0".repeat(Math.abs(power)-1) + "1"}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-3xl border border-border text-center overflow-hidden relative">
          <motion.div 
            key={power}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
            className="text-8xl mb-6 shadow-2xl drop-shadow-[0_0_30px_rgba(0,0,0,0.2)]"
          >
            {scaleInfo.emoji}
          </motion.div>
          <h3 className="text-lg font-black">{scaleInfo.label}</h3>
          <p className="text-xs text-muted-foreground mt-2" style={{ direction: "ltr" }}>~ 10^{scaleInfo.p} m</p>
          
          {/* Zoom lines visual effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            {Array.from({length: 10}).map((_, i) => (
              <motion.circle 
                key={i}
                cx="50%" cy="50%" 
                r={10 + i * 30} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth={1}
                animate={{ r: [10 + i * 30, 40 + i * 30] }}
                transition={{ repeat: Infinity, duration: Math.abs(power) ? 2 : 10, ease: "linear" }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1.11 PGCD EXPLORER (4AM)
// ═══════════════════════════════════════════════════════════════
function PGCDWhatIf() {
  const [a, setA] = useState(1053);
  const [b, setB] = useState(325);

  const calculatePGCD = (x: number, y: number) => {
    let steps = [];
    let A = Math.max(x, y);
    let B = Math.min(x, y);
    if (B === 0) return { pgcd: A, steps };
    
    while (B !== 0) {
      let q = Math.floor(A / B);
      let r = A % B;
      steps.push({ a: A, b: B, q, r });
      A = B;
      B = r;
    }
    return { pgcd: A, steps };
  };

  const { pgcd, steps } = calculatePGCD(a, b);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border">
          <h2 className="text-base font-black">القاسم المشترك الأكبر PGCD ➗</h2>
          <p className="text-[11px] text-muted-foreground">حوارية خوارزمية إقليدس (القسمات المتتالية). آخر باقٍ غير معدوم هو الـ PGCD.</p>
          
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground">العدد a</label>
              <input type="number" value={a} onChange={e => setA(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground">العدد b</label>
              <input type="number" value={b} onChange={e => setB(Math.max(1, parseInt(e.target.value)||1))} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold" />
            </div>
          </div>
          
          <div className="p-6 rounded-2xl bg-card border border-border mt-4 text-center">
            <h3 className="text-xs font-bold text-muted-foreground mb-2">النتيجة النهائية</h3>
            <div className="text-2xl font-black text-primary font-mono" style={{ direction: "ltr" }}>
              PGCD({a}, {b}) = {pgcd}
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="p-4 bg-muted/30 border-b border-border text-xs font-bold">خوارزمية إقليدس a = b × q + r</div>
          <div className="max-h-[300px] overflow-auto p-4 space-y-2">
            {steps.map((s, i) => (
              <div key={i} className={`flex justify-center p-3 rounded-xl border font-mono text-sm shadow-sm transition-all ${s.r === pgcd ? "bg-primary/10 border-primary" : s.r === 0 ? "bg-muted/30 border-border text-muted-foreground" : "bg-background border-border"}`} style={{ direction: "ltr" }}>
                <span className="font-bold">{s.a}</span> 
                <span className="mx-2 text-muted-foreground">=</span> 
                <span className="text-primary font-bold">{s.b}</span> 
                <span className="mx-2 text-muted-foreground">×</span> 
                <span>{s.q}</span> 
                <span className="mx-2 text-muted-foreground">+</span> 
                <span className={`font-black ${s.r === pgcd ? "text-destructive" : s.r === 0 ? "" : "text-geometry"}`}>{s.r}</span>
              </div>
            ))}
            <div className="text-center text-[10px] text-muted-foreground mt-4 pt-4 border-t border-dashed border-border/50">
              بما أن الباقي معدوم (0)، فإن آخر باقٍ غير معدوم وهو <span className="text-destructive font-bold">{pgcd}</span> يمثل القاسم المشترك الأكبر.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
