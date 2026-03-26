// ═══════════════════════════════════════════════════════════════════════
//  Landing.tsx — QED · صفحة الهبوط
//  Real platform features: KB, math solving, gap detection, learning path
// ═══════════════════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { QEDLogo } from "@/components/QEDLogo";

// ─── Feature Sections ───────────────────────────────────────────────────
const FEATURES = [
  {
    id: "kb",
    emoji: "🧩",
    title: "قاعدة معرفة رياضية ذكية",
    subtitle: "أنماط حل مصنّفة ومنظّمة — جاهزة لتفكيك أي تمرين",
    description: "قاعدة المعرفة (KB) تحتوي على مئات الأنماط الرياضية المصنّفة: جبر، هندسة، دوال، احتمالات. كل نمط فيه خطوات الحل، المفاهيم المطلوبة، والأخطاء الشائعة.",
    details: ["أنماط مصنّفة حسب المنهج الجزائري", "خطوات حل واضحة لكل نمط", "ربط المفاهيم ببعضها"],
    colorVar: "--algebra",
  },
  {
    id: "solve",
    emoji: "⚡",
    title: "محرك حل التمارين",
    subtitle: "أدخل أي تمرين واحصل على الحل كاملاً مع الشرح",
    description: "محرك SOTA يحل التمارين محلياً — جبر، هندسة، إحصاء، احتمالات، دوال. يكشف الأخطاء المفاهيمية ويشرح كل خطوة بالتفصيل.",
    details: ["حل محلي بدون إنترنت", "كشف الأخطاء المفاهيمية", "شرح كل خطوة بالعربية"],
    colorVar: "--geometry",
  },
  {
    id: "gaps",
    emoji: "🔍",
    title: "كاشف الثغرات الذكي",
    subtitle: "يحلل إجاباتك ويحدد بالضبط أين الخلل في فهمك",
    description: "بدل ما تضيع وقتك في مراجعة كل شيء، الكاشف يحدد الأنماط الضعيفة والمفاهيم الغائبة — ويقترح تمارين مستهدفة لسد كل ثغرة.",
    details: ["تحليل أنماط الأخطاء", "خريطة ثغرات بصرية", "تمارين مستهدفة لكل ثغرة"],
    colorVar: "--functions",
  },
  {
    id: "path",
    emoji: "📚",
    title: "مسار تعلّم مخصص",
    subtitle: "تسلسل تمارين مرتّب من الأسهل إلى الأصعب",
    description: "بعد التشخيص، QED يرسم لك مسار تعلم مرتّب حسب التعقيد — يبدأ من الأساسيات ويصعد تدريجياً حتى تُتقن كل مفهوم في المنهج.",
    details: ["ترتيب حسب المتطلبات المسبقة", "تتبع التقدم في كل مفهوم", "تمارين متدرجة الصعوبة"],
    colorVar: "--statistics",
  },
  {
    id: "deconstruct",
    emoji: "🔬",
    title: "تفكيك التمارين خطوة بخطوة",
    subtitle: "تفكيك بصري يربط كل خطوة بالمفهوم الرياضي المناسب من KB",
    description: "اكتب أي تمرين وشاهد تفكيكه البصري: مخطط تدفق يوضح كل خطوة حل مع القانون المستخدم والسبب — مباشرة من قاعدة المعرفة.",
    details: ["مخطط تدفق بصري تفاعلي", "ربط كل خطوة بنمط KB", "عرض الصيغ الرياضية بـ LaTeX"],
    colorVar: "--probability",
  },
  {
    id: "parent",
    emoji: "👨‍👩‍👧",
    title: "لوحة ولي الأمر",
    subtitle: "تابع تقدّم ابنك بشفافية كاملة — بدون انتظار النتائج",
    description: "تقارير واضحة عن التقدم اليومي، خريطة الثغرات، مؤشر التحسن الأسبوعي. اعرف بالضبط أين يحتاج ابنك للمساعدة.",
    details: ["تقارير يومية وأسبوعية", "خريطة ثغرات بصرية", "مقارنة التقدم عبر الزمن"],
    colorVar: "--accent",
  },
];

// ─── Stat component ─────────────────────────────────────────────────────
function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center px-5">
      <div className="text-2xl lg:text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 font-semibold">{label}</div>
    </div>
  );
}

// ─── Feature Card ───────────────────────────────────────────────────────
function FeatureCard({ feature, index, isVisible }: { feature: typeof FEATURES[number]; index: number; isVisible: boolean }) {
  const flip = index % 2 !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0.1, y: 30 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex flex-col ${flip ? "lg:flex-row-reverse" : "lg:flex-row"} items-stretch gap-8 lg:gap-12 rounded-3xl overflow-hidden transition-all duration-700`}
      style={{
        background: isVisible ? `hsl(var(${feature.colorVar}) / 0.06)` : "transparent",
        border: isVisible ? "1px solid hsl(var(--border))" : "1px solid transparent",
      }}
    >
      {/* Text side */}
      <div className="flex-1 min-w-0 p-8 lg:p-10 text-right" dir="rtl">
        <div className="text-4xl mb-4">{feature.emoji}</div>
        <h2 className={`text-2xl lg:text-3xl font-black leading-tight mb-3 transition-colors duration-500 ${
          isVisible ? "text-foreground" : "text-muted-foreground/20"
        }`}>
          {feature.title}
        </h2>
        <p className={`text-sm lg:text-base font-bold mb-3 transition-colors duration-500 ${
          isVisible ? "text-foreground/70" : "text-foreground/10"
        }`}>
          {feature.subtitle}
        </p>
        <p className={`text-sm leading-relaxed mb-6 transition-colors duration-500 ${
          isVisible ? "text-muted-foreground" : "text-muted-foreground/10"
        }`}>
          {feature.description}
        </p>

        {/* Detail chips */}
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {feature.details.map((d, i) => (
              <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full bg-foreground/5 text-foreground/70 border border-border">
                ✓ {d}
              </span>
            ))}
          </motion.div>
        )}
      </div>

      {/* Visual side — gradient block */}
      <div className="flex-shrink-0 w-full lg:w-[320px] flex items-center justify-center p-8 relative overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(var(${feature.colorVar})), hsl(var(${feature.colorVar}) / 0.7))` }}>
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Grid pattern */}
            {Array.from({ length: 8 }).map((_, i) => (
              <g key={i}>
                <line x1={i * 28} y1="0" x2={i * 28} y2="200" stroke="white" strokeWidth="0.5" opacity="0.3" />
                <line x1="0" y1={i * 28} x2="200" y2={i * 28} stroke="white" strokeWidth="0.5" opacity="0.3" />
              </g>
            ))}
          </svg>
        </div>
        <div className="relative text-center text-white z-10">
          <div className="text-6xl mb-3">{feature.emoji}</div>
          <div className="text-sm font-black opacity-90">{feature.title.split(" ").slice(0, 3).join(" ")}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Domain Tags ────────────────────────────────────────────────────────
const DOMAINS = [
  { name: "الجبر", colorVar: "--algebra", icon: "📐" },
  { name: "الهندسة", colorVar: "--geometry", icon: "📏" },
  { name: "الدوال", colorVar: "--functions", icon: "📈" },
  { name: "الإحصاء", colorVar: "--statistics", icon: "📊" },
  { name: "الاحتمالات", colorVar: "--probability", icon: "🎲" },
];

// ═══════════════════════════════════════════════════════════════════════
//  Main Landing Component
// ═══════════════════════════════════════════════════════════════════════
export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(-1);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });

  // Intersection observer for features
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.3) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!isNaN(idx)) setActiveFeature(idx);
          }
        });
      },
      { threshold: 0.3 }
    );
    featureRefs.current.forEach((el) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const featureCount = useTransform(scrollYProgress, [0, 1], [0, FEATURES.length]);
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    const unsub = featureCount.on("change", (v) => setDisplayCount(Math.round(v)));
    return unsub;
  }, [featureCount]);

  return (
    <div ref={containerRef} className="relative bg-background min-h-screen" dir="rtl">

      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-50 origin-right bg-gradient-to-l from-[hsl(243_75%_58%)] to-[hsl(158_64%_40%)]"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Feature counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/90 text-background text-xs backdrop-blur-md"
      >
        <div className="w-2 h-2 rounded-full bg-[hsl(158_64%_40%)] animate-pulse" />
        <span className="font-mono font-bold">ميزات مكتشفة:</span>
        <span className="font-black">{displayCount}</span>
      </motion.div>

      {/* Progress dots */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-40">
        {FEATURES.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              i <= activeFeature
                ? "bg-foreground scale-125"
                : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* ── Fixed top bar with QED logo ── */}
      <div className="fixed top-0 right-0 z-40 p-4">
        <QEDLogo size="md" />
      </div>

      {/* ── Hero ── */}
      <div className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center">
        {/* Background math symbols */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
          <div className="absolute text-[200px] font-black text-foreground -top-10 -right-10 rotate-12">∑</div>
          <div className="absolute text-[180px] font-black text-foreground bottom-20 -left-10 -rotate-12">∫</div>
          <div className="absolute text-[150px] font-black text-foreground top-1/3 left-1/4 rotate-6">π</div>
          <div className="absolute text-[120px] font-black text-foreground bottom-1/3 right-1/4 -rotate-6">√</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 max-w-2xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-foreground/20" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-foreground/50 uppercase font-bold">
              QED · محرك الرياضيات الذكي
            </span>
            <div className="h-px w-10 bg-foreground/20" />
          </div>

          <div className="text-5xl mb-4">🧠</div>

          <h1 className="text-4xl lg:text-6xl font-black text-foreground leading-[1.1] mb-6">
            تعلّم الرياضيات
            <br />
            <span className="bg-gradient-to-l from-[hsl(243_75%_58%)] to-[hsl(158_64%_40%)] bg-clip-text text-transparent">
              بطريقة ذكية
            </span>
          </h1>

          <p className="text-foreground/60 text-sm lg:text-base max-w-lg mx-auto leading-relaxed mb-6">
            قاعدة معرفة رياضية + محرك حل ذكي + كاشف ثغرات + مسار تعلّم مخصص.
            <br />
            كل ما تحتاجه لإتقان الرياضيات في مكان واحد.
          </p>

          {/* Domain tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {DOMAINS.map((d) => (
              <span key={d.name} className="text-xs font-bold px-3 py-1.5 rounded-full border border-border bg-card" style={{ color: d.color }}>
                {d.icon} {d.name}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-1 mb-10">
            <StatBadge value="+٥٠٠" label="نمط في KB" color="hsl(243 75% 58%)" />
            <div className="w-px h-8 bg-border mx-2" />
            <StatBadge value="٥ مجالات" label="رياضية" color="hsl(158 64% 40%)" />
            <div className="w-px h-8 bg-border mx-2" />
            <StatBadge value="مجاني" label="بالكامل" color="hsl(340 80% 52%)" />
          </div>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/home"
              className="inline-block px-10 py-4 rounded-2xl font-black text-lg text-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_14px_50px_rgba(0,0,0,0.25)] transition-shadow bg-gradient-to-l from-[hsl(243_75%_58%)] to-[hsl(158_64%_40%)]"
            >
              ابدأ الآن — مجاني ←
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-foreground/15 flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="w-1 h-1 rounded-full bg-foreground/30"
            />
          </div>
          <span className="font-mono text-[8px] tracking-[0.2em] text-foreground/20 font-bold">اكتشف الميزات</span>
        </motion.div>
      </div>

      {/* ── Feature Sections ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        {FEATURES.map((feature, idx) => (
          <div
            key={feature.id}
            ref={(el) => { featureRefs.current[idx] = el; }}
            data-idx={idx}
            className="min-h-[70vh] flex flex-col justify-center py-10"
          >
            <FeatureCard feature={feature} index={idx} isVisible={activeFeature >= idx} />

            {idx < FEATURES.length - 1 && (
              <div className="flex justify-center my-6">
                <motion.div
                  initial={{ height: 0 }}
                  animate={activeFeature >= idx ? { height: 50 } : { height: 0 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="w-px bg-gradient-to-b from-foreground/20 to-transparent"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Final CTA ── */}
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-xl"
        >
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-3xl lg:text-5xl font-black text-foreground leading-tight mb-6">
            جاهز تبدأ؟
            <br />
            <span className="bg-gradient-to-l from-[hsl(243_75%_58%)] to-[hsl(158_64%_40%)] bg-clip-text text-transparent">
              اكتشف ثغراتك الآن
            </span>
          </h2>
          <p className="text-muted-foreground text-sm lg:text-base mb-10 leading-relaxed">
            قاعدة معرفة + محرك حل + كاشف ثغرات + مسار تعلّم — كلها مجانية.
            <br />
            بدون حساب · بدون بطاقة بنكية · نتائج فورية.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              to="/home"
              className="inline-block px-12 py-5 rounded-2xl font-black text-xl text-white shadow-[0_0_50px_rgba(79,70,229,0.2),0_16px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_0_70px_rgba(79,70,229,0.35),0_20px_60px_rgba(0,0,0,0.15)] transition-shadow bg-gradient-to-l from-[hsl(243_75%_58%)] to-[hsl(158_64%_40%)]"
            >
              ابدأ الآن — مجاني ←
            </Link>
          </motion.div>
          <div className="mt-4 text-[10px] text-muted-foreground/40 font-mono tracking-wider">
            بدون حساب · بدون بطاقة بنكية · نتائج فورية
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-[10px] text-muted-foreground/40 font-mono tracking-[0.15em]">
          © 2025 QED ALGERIA · MATH LEARNING ENGINE · مبني بحب للطالب الجزائري 🇩🇿
        </p>
      </div>
    </div>
  );
}
