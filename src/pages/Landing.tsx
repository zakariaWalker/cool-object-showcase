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
} from "lucide-react";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const STUDENT_BENEFITS = [
  {
    icon: <Brain className="w-5 h-5" />,
    title: "١. تشخيص ذكي",
    desc: "اختبار ٥ دقائق مبني على برنامج BAC + BEM يحدّد مستواك بدقة جراحية.",
    step: "01",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "٢. كشف الثغرات",
    desc: "نبيّنلك ٢٠٪ من الأخطاء اللي تخسّرلك ٨٠٪ من النقاط — بالاسم والمثال.",
    step: "02",
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "٣. تمارين مخصّصة",
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
      {/* ── Injected design tokens & custom styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=IBM+Plex+Mono:wght@400;700&display=swap');

        /* Unified typography for the entire landing page */
        .qed-landing, .qed-landing * {
          font-family: 'Tajawal', 'Inter', system-ui, sans-serif;
        }
        .qed-landing .qed-mono { font-family: 'IBM Plex Mono', monospace; }

        /* Brand gradient — matches the QED logo (algebra → probability) */
        .qed-brand-gradient {
          background-image: linear-gradient(135deg, hsl(var(--algebra)), hsl(var(--probability)));
        }
        .qed-brand-text {
          background-image: linear-gradient(135deg, hsl(var(--algebra)), hsl(var(--probability)));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .qed-hero-grid {
          background-image:
            linear-gradient(hsl(var(--algebra) / 0.05) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--algebra) / 0.05) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .qed-noise::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .benefit-card:hover .benefit-icon {
          transform: scale(1.1) rotate(-6deg);
        }
        .benefit-icon { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1); }

        @keyframes qed-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        .qed-deco { animation: qed-float 8s ease-in-out infinite; }

        @keyframes qed-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .qed-pulse-ring {
          animation: qed-pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="qed-landing relative bg-background min-h-screen overflow-x-hidden" dir="rtl">
        {/* ── NAV ── */}
        <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-2xl bg-background/75 border-b border-border/40">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
            <QEDLogo size="md" />
            <div className="flex items-center gap-2">
              <a
                href="#textbooks"
                className="hidden md:inline-flex items-center h-9 px-4 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                الدروس
              </a>
              <a
                href="#how"
                className="hidden md:inline-flex items-center h-9 px-4 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                كيف يخدم
              </a>
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-black text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                دخول
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO — single dominant CTA, minimal above the fold ── */}
        <section className="relative qed-hero-grid qed-noise min-h-[92vh] flex flex-col justify-center items-center px-6 pt-24 pb-10 overflow-hidden bg-gradient-to-b from-secondary/40 via-background to-background">
          {/* Ambient blobs */}
          <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/20 rounded-full blur-[110px] pointer-events-none" />

          {/* Floating decorative math symbols */}
          <div
            className="absolute top-32 left-12 qed-deco opacity-[0.07] select-none pointer-events-none qed-mono text-[8rem] font-bold text-foreground leading-none"
            style={{ animationDelay: "0s" }}
          >
            ∑
          </div>
          <div
            className="absolute bottom-24 right-16 qed-deco opacity-[0.05] select-none pointer-events-none qed-mono text-[6rem] font-bold text-foreground leading-none"
            style={{ animationDelay: "3s" }}
          >
            ∫
          </div>

          <div className="relative z-10 w-full max-w-3xl mx-auto space-y-8 text-center">
            {/* Single proof badge — combined */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--algebra)/0.1)] border border-[hsl(var(--algebra)/0.25)] text-[hsl(var(--algebra))] text-[11px] font-black">
                <Sparkles className="w-3 h-3" />
                مبني على برنامج BAC + BEM الجزائري
              </span>
            </motion.div>

            {/* Headline — concrete promise (single, audience-aware) */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {audience === "student" ? (
                  <motion.div
                    key="student-hero"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-5"
                  >
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight">
                      نقاطك في الرياضيات
                      <br />
                      تستحق <span className="qed-brand-text">أحسن</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      اختبار قصير يكشف <span className="font-black text-foreground">وين تغلط بالضبط</span>،
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
                    className="space-y-5"
                  >
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight">
                      اعرف مستوى ابنك
                      <br />
                      <span className="qed-brand-text">في 5 دقائق</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      تقرير واضح بنقاط الضعف ومتابعة أسبوعية للتقدّم.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SINGLE dominant CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center gap-4 pt-2"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={audience}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    to={audience === "student" ? "/diagnostic" : "/auth"}
                    className="relative group inline-flex flex-col items-center gap-1 px-12 py-5 rounded-2xl font-black text-white qed-brand-gradient shadow-2xl shadow-[hsl(var(--algebra)/0.4)] ring-2 ring-[hsl(var(--algebra)/0.25)] hover:ring-[hsl(var(--probability)/0.5)] hover:shadow-[hsl(var(--probability)/0.4)] transition-all"
                  >
                    <span className="absolute inset-0 rounded-2xl qed-pulse-ring border-2 border-[hsl(var(--probability))] opacity-60 group-hover:opacity-100" />
                    <span className="relative flex items-center gap-3 text-lg">
                      {audience === "student" ? "ابدأ التشخيص — مجاناً" : "ابدأ تشخيص ابنك — مجاناً"}
                      <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    </span>
                    <span className="relative text-[11px] font-medium text-white/85">
                      5 دقائق · 10 أسئلة · بدون تسجيل
                    </span>
                  </Link>
                </motion.div>
              </AnimatePresence>

              {/* Audience switcher — small, BELOW the CTA, text-link style */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {audience === "student" ? (
                  <>
                    <span>ولي أمر؟</span>
                    <button
                      onClick={() => setAudience("parent")}
                      className="font-black text-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                    >
                      اضغط هنا
                    </button>
                  </>
                ) : (
                  <>
                    <span>تلميذ؟</span>
                    <button
                      onClick={() => setAudience("student")}
                      className="font-black text-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                    >
                      اضغط هنا
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Scroll cue — invites the user to discover more below */}
          <motion.a
            href="#how"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <span>كيف يخدم</span>
            <span className="w-px h-8 bg-gradient-to-b from-muted-foreground/40 to-transparent" />
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
                <span className="qed-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
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
                  <div className="qed-mono text-3xl font-black text-destructive">9.5</div>
                  <div className="text-[10px] text-muted-foreground mt-1">/ 20</div>
                </div>
                <div className="bg-[hsl(var(--geometry)/0.1)] border border-[hsl(var(--geometry)/0.3)] rounded-xl p-3">
                  <div className="text-[10px] font-bold text-[hsl(var(--geometry))] mb-1">بعد شهر</div>
                  <div className="qed-mono text-3xl font-black text-[hsl(var(--geometry))]">13</div>
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
                  <div className="qed-mono text-xl md:text-2xl font-bold qed-brand-text">
                    {s.v}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>


        {/* ── BENEFITS — flow: diagnose → detect → fix ── */}
        <section className="relative bg-secondary/40 border-y border-border/60">
          <div className="max-w-6xl mx-auto px-6 py-14 space-y-10">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="qed-mono text-xs font-bold text-[hsl(var(--algebra))] uppercase tracking-widest">3 خطوات · نتيجة واحدة</span>
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
                          <span className={`qed-mono absolute top-3 left-4 text-3xl font-black leading-none ${tone.num}`}>
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
              <span className="qed-mono text-xs font-bold text-[hsl(var(--probability))] uppercase tracking-widest">كيف يخدم</span>
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
                    <div className="qed-mono text-2xl font-bold text-[hsl(var(--probability))] mb-4 leading-none">{s.n}</div>
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
                  <h2 className="qed-serif text-2xl md:text-3xl font-bold text-foreground leading-tight">
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
            <span className="qed-mono text-xs font-bold text-[hsl(var(--algebra))] uppercase tracking-widest">المكتبة</span>
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
                    <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary flex items-center justify-center group-hover:scale-105 group-hover:from-primary/25 transition-all">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.grade && (
                          <span className="qed-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {b.grade}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          درس تفاعلي
                        </span>
                      </div>
                      <h3 className="text-base md:text-lg font-black text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                        {b.title}
                      </h3>
                      {b.description && (
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-1">
                          {b.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow — RTL correct */}
                    <div className="shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all">
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
                  className="text-xs font-black text-primary hover:underline"
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
        <section className="relative py-20 px-6 overflow-hidden bg-gradient-to-br from-primary/8 via-secondary/40 to-accent/8 border-t border-border/60">
          <div className="absolute inset-0 qed-hero-grid opacity-40 pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10 max-w-2xl mx-auto text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black">
              <TrendingUp className="w-3.5 h-3.5" />
              ابدأ التشخيص — تشوف نتيجتك في 15 دقيقة
            </div>

            <h2 className="qed-serif text-4xl md:text-6xl font-bold text-foreground leading-tight">
              وقّاش تعرف مستواك
              <br />
              <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">بالضبط؟</span>
            </h2>

            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              تشخيص مجاني، بدون تسجيل معقّد، يعطيك صورة واضحة على نقاط القوة والضعف.
            </p>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/diagnostic"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg text-primary-foreground bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all"
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
