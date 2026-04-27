import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { QEDLogo } from "@/components/QEDLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  BookOpen,
  Target,
  ShieldCheck,
  GraduationCap,
  Users,
  CheckCircle2,
  Eye,
  HelpCircle,
  Wallet,
  TrendingUp,
  Sparkles,
  Search,
  Clock,
  ArrowUpRight,
  ChevronLeft,
  Brain,
  Zap,
  LineChart,
  Trophy,
  Timer,
  Award,
  PlayCircle,
} from "lucide-react";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const STUDENT_BENEFITS = [
  {
    icon: <Brain className="w-5 h-5" />,
    title: "1. تشخيص ذكي",
    desc: "اختبار 5 دقائق مبني على برنامج BAC + BEM يحدّد مستواك بدقة جراحية.",
    step: "01",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "2. كشف الثغرات",
    desc: "نبيّنلك 20% من الأخطاء اللي تخسّرلك 80% من النقاط — بالاسم والمثال.",
    step: "02",
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "3. تمارين مخصّصة",
    desc: "خطة تمارين موجَّهة بشرح خطوة بخطوة، حتى تصير تحلّ بصح — مش حفظ.",
    step: "03",
  },
];

const PARENT_BENEFITS = [
  {
    icon: <Eye className="w-5 h-5" />,
    title: "تعرف مستوى ابنك الحقيقي",
    desc: "تقرير واضح يُظهر نقاط الضعف بدقة — بدون تخمين أو انتظار العلامات.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "متابعة التقدّم أسبوعياً",
    desc: "تشاهد تطوّر ابنك مع الوقت، وتعرف هل يتحسّن فعلاً أم لا.",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "بديل عن الدروس الخصوصية الباهظة",
    desc: "مرافقة منظّمة لابنك في الرياضيات، بجزء بسيط من تكلفة الأستاذ الخاص.",
  },
];

const STEPS = [
  { n: "01", t: "تشخيص قصير", d: "اختبار 5 دقائق يحدّد مستواك بدقة" },
  { n: "02", t: "خطة مخصّصة", d: "قائمة تمارين مرتّبة على حسب ثغراتك" },
  { n: "03", t: "تمارين موجّهة", d: "تحلّ خطوة بخطوة مع شرح عند الخطأ" },
  { n: "04", t: "تتبّع التقدّم", d: "تقرير واضح يُظهر تحسّنك أسبوعياً" },
];

const TRUST_POINTS = [
  { v: "5د", l: "تشخيص أوّلي" },
  { v: "100%", l: "متوافق مع برنامج الباك" },
  { v: "24/7", l: "متاح في أي وقت" },
];

// Filter out seed/test/demo entries that shouldn't be visible publicly.
const TEST_TITLE_PATTERNS = [
  /smoke/i,
  /\btest\b/i,
  /^vfre$/i,
  /placeholder/i,
  /demo/i,
  /sample/i,
];
const isRealTextbook = (b: { title?: string | null; description?: string | null }) => {
  const t = (b.title || "").trim();
  if (!t) return false;
  if (t.length < 4) return false;
  return !TEST_TITLE_PATTERNS.some((re) => re.test(t));
};

interface BookCard {
  id: string;
  slug: string | null;
  title: string;
  grade: string;
  description: string | null;
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function Landing() {
  const [books, setBooks] = useState<BookCard[]>([]);
  const [audience, setAudience] = useState<"student" | "parent">("student");
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("textbooks")
        .select("id, slug, title, grade, description")
        .eq("status", "completed")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);
      setBooks((data || []).filter(isRealTextbook));
    })();
  }, []);

  const grades = useMemo(() => {
    const s = new Set<string>();
    books.forEach((b) => b.grade && s.add(b.grade));
    return Array.from(s);
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesGrade = gradeFilter === "all" || b.grade === gradeFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || b.title.toLowerCase().includes(q) || (b.description?.toLowerCase().includes(q) ?? false);
      return matchesGrade && matchesQuery;
    });
  }, [books, query, gradeFilter]);

  return (
    <>
      {/* ── Page-specific styles only — brand tokens come from the design system ── */}
      <style>{`
        /* Subtle academic grid for hero — paper ledger feel */
        .qed-hero-grid {
          background-image:
            linear-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.04) 1px, transparent 1px);
          background-size: 56px 56px;
        }

        /* Soft paper noise for atmosphere */
        .qed-noise::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .benefit-card:hover .benefit-icon { transform: scale(1.05); }
        .benefit-icon { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1); }

        @keyframes qed-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        .qed-deco { animation: qed-float 9s ease-in-out infinite; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="qed-landing relative bg-background min-h-screen overflow-x-hidden" dir="rtl">
        {/* ── NAV — academic, hairline, no flashy chrome ── */}
        <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
            <QEDLogo size="md" />
            <div className="flex items-center gap-1">
              <a
                href="#textbooks"
                className="hidden md:inline-flex items-center h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                الدروس
              </a>
              <a
                href="#how"
                className="hidden md:inline-flex items-center h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                كيف يخدم
              </a>
              <span className="hidden md:block w-px h-4 bg-border mx-2" />
              <Link to="/auth" className="btn-ink h-9 px-4 text-sm">
                دخول
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO — academic editorial: serif headline, ink CTA, paper backdrop ── */}
        <section className="relative qed-hero-grid qed-noise min-h-[92vh] flex flex-col justify-center items-center px-6 pt-24 pb-10 overflow-hidden">
          {/* Floating manuscript glyphs — subtle, ink */}
          <div
            className="absolute top-32 left-12 qed-deco opacity-[0.05] select-none pointer-events-none font-display text-[10rem] text-foreground leading-none"
            style={{ animationDelay: "0s" }}
          >
            ∑
          </div>
          <div
            className="absolute bottom-28 right-16 qed-deco opacity-[0.04] select-none pointer-events-none font-display text-[8rem] text-foreground leading-none"
            style={{ animationDelay: "3s" }}
          >
            ∫
          </div>
          {/* Burgundy proof-tick decoration in the corner */}
          <div
            className="absolute top-28 right-1/4 hidden md:block pointer-events-none"
            style={{ width: 8, height: 8, background: "hsl(var(--accent))", borderRadius: 1, opacity: 0.6 }}
          />

          <div className="relative z-10 w-full max-w-3xl mx-auto space-y-10 text-center">
            {/* Eyebrow — academic label */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <span className="eyebrow inline-flex items-center gap-2.5">
                <span className="w-6 h-px bg-current opacity-50" />
                مرجع رياضيات · BAC + BEM
                <span className="w-6 h-px bg-current opacity-50" />
              </span>
            </motion.div>

            {/* Headline — Fraunces serif, ink, with burgundy accent word */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {audience === "student" ? (
                  <motion.div
                    key="student-hero"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <h1 className="display-1 text-foreground">
                      نقاطك في الرياضيات
                      <br />
                      تستحق <em className="not-italic text-accent">أحسن</em>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      اختبار قصير يكشف <span className="font-semibold text-foreground">وين تغلط بالضبط</span>،
                      ثم تمارين موجَّهة بشرح خطوة بخطوة.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="parent-hero"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <h1 className="display-1 text-foreground">
                      اعرف مستوى ابنك
                      <br />
                      <em className="not-italic text-accent">في 5 دقائق</em>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      تقرير واضح بنقاط الضعف ومتابعة أسبوعية للتقدّم.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SINGLE dominant CTA — ink button, system-defined */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center gap-5 pt-2"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={audience}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to={audience === "student" ? "/diagnostic" : "/auth"}
                    className="btn-ink group flex-col gap-1.5 px-10 py-4"
                  >
                    <span className="flex items-center gap-3 text-base">
                      {audience === "student" ? "ابدأ التشخيص — مجاناً" : "ابدأ تشخيص ابنك — مجاناً"}
                      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    </span>
                    <span className="font-mono text-[10px] tracking-wider uppercase text-primary-foreground/70">
                      5 min · 10 questions · sans inscription
                    </span>
                  </Link>
                </motion.div>
              </AnimatePresence>

              {/* Audience switcher — sober, text-link */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {audience === "student" ? (
                  <>
                    <span>ولي أمر؟</span>
                    <button
                      onClick={() => setAudience("parent")}
                      className="font-semibold text-foreground hover:text-accent underline underline-offset-4 decoration-border hover:decoration-accent transition-colors"
                    >
                      هذا التشخيص لك
                    </button>
                  </>
                ) : (
                  <>
                    <span>تلميذ؟</span>
                    <button
                      onClick={() => setAudience("student")}
                      className="font-semibold text-foreground hover:text-accent underline underline-offset-4 decoration-border hover:decoration-accent transition-colors"
                    >
                      جرّب التشخيص بنفسك
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Scroll cue — sober eyebrow style */}
          <motion.a
            href="#how"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 eyebrow hover:text-foreground transition-colors"
          >
            <span>المنهجية</span>
            <span className="w-px h-8 bg-gradient-to-b from-current to-transparent opacity-40" />
          </motion.a>
        </section>

        {/* ── PROOF STRIP — revealed on scroll, below the fold ── */}
        <section className="relative bg-background border-b border-border/40 py-12 px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_auto] gap-8 items-center">
            {/* Before/after proof card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-xl shadow-primary/10 text-right max-w-md mx-auto md:mx-0 w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  تقدّم تلميذ حقيقي
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[hsl(var(--geometry))] bg-[hsl(var(--geometry)/0.12)] px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  +3.5 نقطة
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-destructive/80 mb-1">قبل</div>
                  <div className="font-mono text-3xl font-black text-destructive">9.5</div>
                  <div className="text-[10px] text-muted-foreground mt-1">/ 20</div>
                </div>
                <div className="bg-[hsl(var(--geometry)/0.1)] border border-[hsl(var(--geometry)/0.3)] rounded-xl p-3">
                  <div className="text-[10px] font-bold text-[hsl(var(--geometry))] mb-1">بعد شهر</div>
                  <div className="font-mono text-3xl font-black text-[hsl(var(--geometry))]">13</div>
                  <div className="text-[10px] text-muted-foreground mt-1">/ 20</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                <Brain className="w-4 h-4 text-[hsl(var(--algebra))] shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  24 ثغرة مكتشفة، 3 منها تمثّل 70% من الأخطاء — تمّ علاجها بـ 12 تمريناً موجَّهاً.
                </p>
              </div>
            </motion.div>

            {/* Trust stats — vertical on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-3 md:grid-cols-1 gap-3 md:gap-2 md:min-w-[180px]"
            >
              {TRUST_POINTS.map((s, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl px-4 py-3 text-center md:text-right"
                >
                  <div className="font-mono text-xl md:text-2xl font-bold text-accent">
                    {s.v}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>


        {/* ── EXAM SIMULATION HIGHLIGHT — Algerian market trend ── */}
        <section className="relative bg-foreground text-background py-16 px-6 overflow-hidden border-y border-border/60">
          <div className="absolute inset-0 qed-hero-grid opacity-[0.05] pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-accent/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[hsl(var(--algebra)/0.18)] rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-end mb-10">
              <div className="space-y-4">
                <span className="font-mono text-xs font-bold text-[hsl(var(--probability))] uppercase tracking-widest inline-flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5" />
                  جديد · المواضيع السابقة
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-background leading-[1.1] tracking-tight">
                  حضّر <em className="not-italic text-accent">BAC / BEM</em>
                  <br />
                  بحلّ المواضيع السابقة — في البيت
                </h2>
                <p className="text-sm md:text-base text-background/70 max-w-xl leading-relaxed">
                  بدل التنقّل لدروس الدعم، شغّل وضع المحاكاة. توقيت حقيقي، تصحيح آلي،
                  وعلامة على 20 — كأنك في القاعة.
                </p>
              </div>

              <Link
                to="/exam-simulation"
                className="group inline-flex items-center gap-2.5 bg-accent text-accent-foreground px-7 py-4 rounded-full font-black text-sm hover:gap-4 transition-all shadow-2xl shadow-accent/30 hover:shadow-accent/50 whitespace-nowrap shrink-0"
              >
                <PlayCircle className="w-5 h-5" />
                ابدأ المحاكاة
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            {/* Feature triplet */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  icon: <Timer className="w-5 h-5" />,
                  t: "توقيت حقيقي",
                  d: "2س للBEM · 3س30 للBAC. لا غش، لا تمديد.",
                  c: "hsl(var(--probability))",
                },
                {
                  icon: <Award className="w-5 h-5" />,
                  t: "تصحيح آلي",
                  d: "علامة على 20 فوراً، مع تفصيل كل خطوة.",
                  c: "hsl(var(--accent))",
                },
                {
                  icon: <Brain className="w-5 h-5" />,
                  t: "تحليل ذكي",
                  d: "نبيّن المفاهيم اللي خسّرتك النقاط، مع تمارين علاج.",
                  c: "hsl(var(--algebra))",
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-background/5 border border-background/15 backdrop-blur-sm rounded-2xl p-5 hover:bg-background/10 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${f.c}26`, color: f.c }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-black text-background mb-1.5">{f.t}</h3>
                  <p className="text-xs text-background/60 leading-relaxed">{f.d}</p>
                </motion.div>
              ))}
            </div>

            {/* Bottom strip — quick stats */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-background/10">
              <div className="flex items-center gap-6 text-xs text-background/60">
                <span className="font-mono">
                  <span className="text-background font-bold">17+</span> موضوع متوفر
                </span>
                <span className="hidden sm:inline w-px h-3 bg-background/20" />
                <span className="font-mono hidden sm:inline">
                  <span className="text-background font-bold">BAC</span> + <span className="text-background font-bold">BEM</span>
                </span>
                <span className="hidden md:inline w-px h-3 bg-background/20" />
                <span className="font-mono hidden md:inline">دورات حقيقية من وزارة التربية</span>
              </div>
              <Link
                to="/annales"
                className="text-xs font-bold text-background/70 hover:text-background underline underline-offset-4 decoration-background/30 hover:decoration-accent transition-all"
              >
                أو تصفّح الأرشيف الكامل ←
              </Link>
            </div>
          </div>
        </section>


        {/* ── BENEFITS — flow: diagnose → detect → fix ── */}
        <section className="relative bg-secondary/40 border-y border-border/60">
          <div className="max-w-6xl mx-auto px-6 py-14 space-y-10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="font-mono text-xs font-bold text-[hsl(var(--algebra))] uppercase tracking-widest">3 خطوات · نتيجة واحدة</span>
              <h2 className="text-2xl md:text-4xl font-black text-foreground leading-tight tracking-tight">
                طريق واضح من <span className="text-destructive">الثغرات</span> إلى <span className="text-[hsl(var(--geometry))]">الإتقان</span>
              </h2>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={audience + "-benefits"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="grid md:grid-cols-3 gap-5 relative"
                >
                  {(audience === "student" ? STUDENT_BENEFITS : PARENT_BENEFITS).map((b: any, i) => {
                    // Semantic flow colors: red (problem) → amber (insight) → green (progress)
                    const tones = [
                      { bg: "bg-destructive/10", text: "text-destructive", border: "hover:border-destructive/50", num: "text-destructive/30" },
                      { bg: "bg-accent/15", text: "text-accent", border: "hover:border-accent/50", num: "text-accent/40" },
                      { bg: "bg-[hsl(var(--geometry)/0.12)]", text: "text-[hsl(var(--geometry))]", border: "hover:border-[hsl(var(--geometry)/0.5)]", num: "text-[hsl(var(--geometry)/0.4)]" },
                    ];
                    const tone = tones[i % tones.length];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative"
                      >
                        {/* Flow arrow connector — desktop only */}
                        {i < 2 && (
                          <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:flex w-6 h-6 items-center justify-center z-10 pointer-events-none">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div
                          className={`benefit-card group bg-card border border-border rounded-2xl p-6 ${tone.border} hover:shadow-xl hover:shadow-primary/5 transition-all cursor-default h-full relative overflow-hidden`}
                        >
                          <span className={`font-mono absolute top-3 left-4 text-3xl font-black leading-none ${tone.num}`}>
                            {b.step || `0${i + 1}`}
                          </span>
                          <div className={`benefit-icon w-12 h-12 rounded-2xl ${tone.bg} ${tone.text} flex items-center justify-center mb-5 transition-colors`}>
                            {b.icon}
                          </div>
                          <h3 className="text-base font-black text-foreground mb-2.5 leading-snug">{b.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS — timeline style ── */}
        <section id="how" className="relative bg-foreground text-background py-20 px-6 overflow-hidden">
          <div className="absolute inset-0 qed-hero-grid opacity-[0.04] pointer-events-none" />
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/30 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="font-mono text-xs font-bold text-[hsl(var(--probability))] uppercase tracking-widest">كيف يخدم</span>
              <h2 className="text-3xl md:text-5xl font-black text-background leading-tight tracking-tight">4 خطوات بسيطة، نتيجة واضحة</h2>
              <p className="text-sm text-background/60 max-w-md mx-auto">
                نفس الطريقة اللي يستعملها أحسن الأساتذة — لكن مهيكَلة ومتاحة 24/7.
              </p>
            </div>

            {/* Timeline grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  {i < STEPS.length - 1 && (
                    <div className="absolute top-6 left-0 hidden md:block w-full h-px bg-gradient-to-l from-transparent via-background/20 to-background/20 pointer-events-none -z-10" />
                  )}
                  <div className="bg-background/5 border border-background/15 backdrop-blur-sm rounded-2xl p-6 hover:bg-background/10 hover:border-[hsl(var(--probability)/0.5)] transition-all">
                    <div className="font-mono text-2xl font-bold text-[hsl(var(--probability))] mb-4 leading-none">{s.n}</div>
                    <h3 className="text-sm font-black text-background mb-2">{s.t}</h3>
                    <p className="text-xs text-background/60 leading-relaxed">{s.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PARENT REASSURANCE — always rendered, animated in/out ── */}
        <AnimatePresence>
          {audience === "parent" && (
            <motion.section
              key="parent-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="max-w-4xl mx-auto px-6 py-16">
                <div className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-primary/20 rounded-3xl p-8 md:p-12 space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    لولي الأمر
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight tracking-tight">
                    لست مضطراً لاختيار بين تكلفة باهظة أو ترك ابنك بلا متابعة
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {[
                      {
                        e: "📊",
                        t: "شفافية كاملة",
                        d: "تصلك تقارير دورية تُظهر بالضبط ما الذي يفهمه ابنك، وما الذي يحتاج تعزيزه.",
                      },
                      { e: "💰", t: "توفير حقيقي", d: "مرافقة شاملة بسعر أقل بكثير من ساعة واحدة من الدروس الخصوصية." },
                      {
                        e: "🇩🇿",
                        t: "محتوى جزائري",
                        d: "متوافق 100% مع برنامج الجيل الثاني، باك وبيام — وليس محتوى أجنبي مترجَم.",
                      },
                      {
                        e: "🤝",
                        t: "لا يلغي دور الأستاذ",
                        d: "أداة مكمّلة تساعد ابنك على التدرّب الذاتي، ليصبح أكثر استعداداً في القسم.",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-2xl leading-none mt-0.5">{item.e}</span>
                        <div className="space-y-1">
                          <div className="text-sm font-black text-foreground">{item.t}</div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── TEXTBOOKS FEED ── */}
        <section id="textbooks" className="max-w-5xl mx-auto px-6 py-16 space-y-8">
          <div className="space-y-3">
            <span className="font-mono text-xs font-bold text-[hsl(var(--algebra))] uppercase tracking-widest">المكتبة</span>
            <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight tracking-tight">
              دروس مبسّطة، تمارين باك،
              <br />
              <span className="text-muted-foreground/60">حلول مفهومة.</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl">
              محتوى مهيكَل حسب البرنامج الرسمي — اقرأ، تدرّب، وافهم في نفس المكان.
            </p>
          </div>

          {/* Sticky filter bar — single layer, cleaner */}
          <div className="sticky top-16 bg-background/85 backdrop-blur-2xl py-3 -mx-6 px-6 border-b border-border/40 z-30 space-y-3">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن درس أو موضوع..."
                className="w-full bg-muted/50 border border-border rounded-xl pr-11 pl-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:bg-background transition-all"
              />
            </div>
            {grades.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                <button
                  onClick={() => setGradeFilter("all")}
                  className={`shrink-0 px-3.5 py-1 rounded-full text-xs font-black transition-all ${
                    gradeFilter === "all"
                      ? "bg-foreground text-background"
                      : "bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الكل
                </button>
                {grades.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    className={`shrink-0 px-3.5 py-1 rounded-full text-xs font-black uppercase transition-all ${
                      gradeFilter === g
                        ? "bg-foreground text-background"
                        : "bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Feed */}
          {filteredBooks.length > 0 ? (
            <div className="divide-y divide-border/50">
              {filteredBooks.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: Math.min(i * 0.04, 0.25) }}
                >
                  <Link
                    to={`/textbooks/${b.slug || b.id}`}
                    className="group flex items-center gap-5 py-5 hover:bg-muted/25 -mx-3 px-3 rounded-2xl transition-all"
                  >
                    {/* Icon */}
                    <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[hsl(var(--algebra)/0.12)] text-[hsl(var(--algebra))] flex items-center justify-center group-hover:scale-105 group-hover:bg-[hsl(var(--algebra)/0.2)] transition-all">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.grade && (
                          <span className="font-mono text-[10px] font-bold text-[hsl(var(--algebra))] bg-[hsl(var(--algebra)/0.1)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {b.grade}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          درس تفاعلي
                        </span>
                      </div>
                      <h3 className="text-base md:text-lg font-black text-foreground leading-snug group-hover:text-[hsl(var(--algebra))] transition-colors line-clamp-1">
                        {b.title}
                      </h3>
                      {b.description && (
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-1">
                          {b.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow — RTL correct */}
                    <div className="shrink-0 text-muted-foreground/40 group-hover:text-[hsl(var(--algebra))] group-hover:translate-x-1 transition-all">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border/60 rounded-2xl p-16 text-center space-y-3">
              <BookOpen className="w-9 h-9 mx-auto opacity-15" />
              <div className="text-sm font-bold text-foreground">
                {query || gradeFilter !== "all" ? "ما لقيناش نتائج لهذا البحث" : "دروس جديدة تُضاف قريباً"}
              </div>
              {(query || gradeFilter !== "all") && (
                <button
                  onClick={() => {
                    setQuery("");
                    setGradeFilter("all");
                  }}
                  className="text-xs font-black text-[hsl(var(--algebra))] hover:underline"
                >
                  مسح التصفية
                </button>
              )}
            </div>
          )}

          {filteredBooks.length > 0 && (
            <div className="text-center pt-2">
              <Link
                to="/textbooks"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted hover:bg-muted/70 text-foreground text-sm font-black transition-colors border border-border/50"
              >
                تصفّح كل المكتبة
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        {/* ── FINAL CTA ── */}
        <section className="relative py-20 px-6 overflow-hidden bg-gradient-to-br from-[hsl(var(--algebra)/0.08)] via-secondary/40 to-[hsl(var(--probability)/0.08)] border-t border-border/60">
          <div className="absolute inset-0 qed-hero-grid opacity-40 pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[hsl(var(--algebra)/0.15)] rounded-full blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10 max-w-2xl mx-auto text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--algebra)/0.1)] border border-[hsl(var(--algebra)/0.2)] text-[hsl(var(--algebra))] text-xs font-black">
              <TrendingUp className="w-3.5 h-3.5" />
              تشخيص مجاني · 5 دقائق
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-foreground leading-tight tracking-tight">
              جاهز تعرف مستواك
              <br />
              <span className="text-accent">بالضبط؟</span>
            </h2>

            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              تشخيص مجاني، بدون تسجيل معقّد، يعطيك صورة واضحة على نقاط القوة والضعف.
            </p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/diagnostic"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg text-primary-foreground bg-primary shadow-2xl shadow-[hsl(var(--algebra)/0.35)] hover:shadow-[hsl(var(--probability)/0.4)] transition-all"
              >
                ابدأ التشخيص المجاني
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 px-6 text-center">
          <div className="flex items-center justify-center gap-3 text-muted-foreground/60 text-xs">
            <QEDLogo size="sm" />
            <span>© {new Date().getFullYear()} QED — منصّة الرياضيات للتلميذ الجزائري</span>
          </div>
        </footer>
      </div>
    </>
  );
}
