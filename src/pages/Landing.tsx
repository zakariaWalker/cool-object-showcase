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
    icon: <Eye className="w-5 h-5" />,
    title: "نكتشفولك وين راك تغلط",
    desc: "تقييم قصير يبيّنلك بالضبط نقاط الضعف اللي تخسّرلك النقاط في الباك.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "تمارين على قد مستواك",
    desc: "ما نضيّعوش وقتك في تمارين تعرفها — كلش مرتّب حسب احتياجك.",
  },
  {
    icon: <HelpCircle className="w-5 h-5" />,
    title: "نشرحولك حتى تفهم",
    desc: "ما نعطيوكش الحل ديركت — نمشيو معاك خطوة بخطوة باش تفهم بصح.",
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
  { n: "01", t: "تشخيص قصير", d: "تقييم 15 دقيقة يحدّد مستواك بدقة" },
  { n: "02", t: "خطة مخصّصة", d: "قائمة تمارين مرتّبة على حسب ثغراتك" },
  { n: "03", t: "تمارين موجّهة", d: "تحلّ خطوة بخطوة مع شرح عند الخطأ" },
  { n: "04", t: "تتبّع التقدّم", d: "تقرير واضح يُظهر تحسّنك أسبوعياً" },
];

const TRUST_POINTS = [
  { v: "١٥د", l: "تشخيص أوّلي" },
  { v: "١٠٠٪", l: "متوافق مع برنامج الباك" },
  { v: "٢٤/٧", l: "متاح في أي وقت" },
];

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
        .limit(30);
      setBooks(data || []);
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
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;700&display=swap');

        .qed-hero-grid {
          background-image:
            linear-gradient(rgba(var(--primary-rgb, 99 102 241) / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(var(--primary-rgb, 99 102 241) / 0.04) 1px, transparent 1px);
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

        .qed-step-line::before {
          content: '';
          position: absolute;
          top: 24px;
          right: -50%;
          width: 100%;
          height: 1px;
          background: linear-gradient(to left, transparent, hsl(var(--primary) / 0.25));
        }

        .qed-mono { font-family: 'IBM Plex Mono', monospace; }
        .qed-serif { font-family: 'Amiri', serif; }

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

      <div className="relative bg-background min-h-screen overflow-x-hidden" dir="rtl">
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

        {/* ── HERO ── */}
        <section className="relative qed-hero-grid qed-noise min-h-[88vh] flex flex-col justify-center items-center px-6 pt-24 pb-12 overflow-hidden bg-gradient-to-b from-secondary/40 via-background to-background">
          {/* Ambient blobs — stronger */}
          <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/20 rounded-full blur-[110px] pointer-events-none" />
          <div className="absolute top-1/2 right-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

          {/* Floating decorative math symbols */}
          <div
            className="absolute top-32 left-12 qed-deco opacity-[0.07] select-none pointer-events-none qed-serif text-[8rem] font-bold text-foreground leading-none"
            style={{ animationDelay: "0s" }}
          >
            ∑
          </div>
          <div
            className="absolute bottom-24 right-16 qed-deco opacity-[0.05] select-none pointer-events-none qed-serif text-[6rem] font-bold text-foreground leading-none"
            style={{ animationDelay: "3s" }}
          >
            ∫
          </div>
          <div
            className="absolute top-1/2 left-1/4 qed-deco opacity-[0.04] select-none pointer-events-none qed-serif text-[10rem] font-bold text-foreground leading-none hidden lg:block"
            style={{ animationDelay: "5s" }}
          >
            π
          </div>

          <div className="relative z-10 w-full max-w-3xl mx-auto space-y-7 text-center">
            {/* Proof Badges row */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-black">
                <Sparkles className="w-3 h-3" />
                برنامج BAC + BEM الجزائري
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-black">
                <Zap className="w-3 h-3" />
                تشخيص في 5 دقائق
              </span>
            </motion.div>

            {/* Audience switcher — pill style */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/70 border border-border/60 backdrop-blur-sm"
            >
              {[
                { id: "student" as const, label: "أنا تلميذ", Icon: GraduationCap },
                { id: "parent" as const, label: "ولي الأمر", Icon: Users },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setAudience(id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-colors ${
                    audience === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {audience === id && (
                    <motion.div
                      layoutId="audience-pill"
                      className="absolute inset-0 rounded-xl bg-foreground shadow-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                </button>
              ))}
            </motion.div>

            {/* Headline — concrete promise with number */}
            <div className="relative min-h-[200px] md:min-h-[240px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {audience === "student" ? (
                  <motion.div
                    key="student-hero"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                  >
                    <h1 className="qed-serif text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1]">
                      ارفع معدّلك بـ
                      <span className="bg-gradient-to-l from-primary via-primary to-accent bg-clip-text text-transparent"> +3 نقاط </span>
                      <br />
                      في الرياضيات خلال شهر
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      اختبار قصير يكشف <span className="font-black text-foreground">وين تغلط بالضبط</span>، ثم تمارين موجَّهة بشرح خطوة بخطوة — مش حفظ، فهم بصح.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="parent-hero"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                  >
                    <h1 className="qed-serif text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1]">
                      اعرف مستوى ابنك الحقيقي
                      <br />
                      <span className="bg-gradient-to-l from-primary via-primary to-accent bg-clip-text text-transparent">في 15 دقيقة</span>
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      تقرير واضح بنقاط الضعف، متابعة أسبوعية للتقدّم، وبديل ذكي عن الدروس الخصوصية الباهظة.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTAs — stronger, with microcopy */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
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
                    className="relative group inline-flex flex-col items-center gap-0.5 px-10 py-4 rounded-2xl font-black text-primary-foreground bg-gradient-to-l from-primary via-primary to-primary/90 hover:from-primary hover:to-accent shadow-2xl shadow-primary/40 ring-2 ring-primary/20 hover:ring-accent/40 transition-all"
                  >
                    <span className="absolute inset-0 rounded-2xl qed-pulse-ring border-2 border-accent opacity-60 group-hover:opacity-100" />
                    <span className="relative flex items-center gap-3 text-base">
                      {audience === "student" ? "ابدأ الآن — مجاناً" : "سجّل لمتابعة ابنك"}
                      <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    </span>
                    <span className="relative text-[11px] font-medium text-primary-foreground/80">
                      {audience === "student" ? "5 دقائق فقط · 10 أسئلة · بدون تسجيل" : "تقرير فوري · بدون بطاقة بنكية"}
                    </span>
                  </Link>
                </motion.div>
              </AnimatePresence>
              <a
                href="#how"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm text-foreground border-2 border-border hover:border-primary/40 hover:bg-muted/40 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                كيف يخدم؟
              </a>
            </motion.div>

            {/* Trust micro-copy with semantic colors */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
            >
              {[
                { t: "بدون تسجيل معقّد", c: "text-primary" },
                { t: "بدون بطاقة بنكية", c: "text-accent" },
                { t: "نتيجة فورية", c: "text-[hsl(var(--geometry))]" },
              ].map(({ t, c }) => (
                <span key={t} className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${c}`} />
                  {t}
                </span>
              ))}
            </motion.div>

            {/* Visual proof card — before/after */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="pt-6 max-w-md mx-auto"
            >
              <div className="bg-card border border-border rounded-2xl p-5 shadow-2xl shadow-primary/10 text-right">
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
                    <div className="qed-mono text-3xl font-black text-destructive">٩٫٥</div>
                    <div className="text-[10px] text-muted-foreground mt-1">/ ٢٠</div>
                  </div>
                  <div className="bg-[hsl(var(--geometry)/0.1)] border border-[hsl(var(--geometry)/0.3)] rounded-xl p-3">
                    <div className="text-[10px] font-bold text-[hsl(var(--geometry))] mb-1">بعد شهر</div>
                    <div className="qed-mono text-3xl font-black text-[hsl(var(--geometry))]">١٣</div>
                    <div className="text-[10px] text-muted-foreground mt-1">/ ٢٠</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                  <Brain className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    ٢٤ ثغرة مكتشفة، ٣ منها تمثّل ٧٠٪ من الأخطاء — تمّ علاجها بـ ١٢ تمريناً موجَّهاً.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="relative z-10 mt-14 w-full max-w-lg mx-auto"
          >
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border/50 bg-card border border-border rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
              {TRUST_POINTS.map((s, i) => (
                <div key={i} className="text-center py-5 px-4">
                  <div className="qed-mono text-2xl md:text-3xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                    {s.v}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 font-medium">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── BENEFITS — audience-aware, no layout shift ── */}
        <section className="relative bg-secondary/40 border-y border-border/60">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={audience + "-benefits"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="grid md:grid-cols-3 gap-5"
                >
                  {(audience === "student" ? STUDENT_BENEFITS : PARENT_BENEFITS).map((b, i) => {
                    const tones = [
                      { bg: "bg-primary/10", text: "text-primary", border: "hover:border-primary/40" },
                      { bg: "bg-accent/15", text: "text-accent", border: "hover:border-accent/40" },
                      { bg: "bg-[hsl(var(--geometry)/0.15)]", text: "text-[hsl(var(--geometry))]", border: "hover:border-[hsl(var(--geometry)/0.4)]" },
                    ];
                    const tone = tones[i % tones.length];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`benefit-card group bg-card border border-border rounded-2xl p-7 ${tone.border} hover:shadow-xl hover:shadow-primary/5 transition-all cursor-default`}
                      >
                        <div className={`benefit-icon w-12 h-12 rounded-2xl ${tone.bg} ${tone.text} flex items-center justify-center mb-5 transition-colors`}>
                          {b.icon}
                        </div>
                        <h3 className="text-base font-black text-foreground mb-2.5 leading-snug">{b.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
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
              <span className="qed-mono text-xs font-bold text-accent uppercase tracking-widest">كيف يخدم</span>
              <h2 className="qed-serif text-3xl md:text-5xl font-bold text-background">4 خطوات بسيطة، نتيجة واضحة</h2>
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
                  <div className="bg-background/5 border border-background/15 backdrop-blur-sm rounded-2xl p-6 hover:bg-background/10 hover:border-accent/40 transition-all">
                    <div className="qed-mono text-2xl font-bold text-accent mb-4 leading-none">{s.n}</div>
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
            <span className="qed-mono text-xs font-bold text-primary uppercase tracking-widest">المكتبة</span>
            <h2 className="qed-serif text-3xl md:text-5xl font-bold text-foreground leading-tight">
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
