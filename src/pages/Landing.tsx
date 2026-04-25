import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QEDLogo } from "@/components/QEDLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  BookOpen,
  Target,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Brain,
  LineChart,
} from "lucide-react";

// ── Two audience tracks: Student (energetic) + Parent (trust) ──
const STUDENT_BENEFITS = [
  {
    icon: <Brain className="w-5 h-5" />,
    title: "تشخيص ذكي يكشف ثغراتك",
    desc: "تقييم قصير يحلل طريقة تفكيرك مش بس إجاباتك.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "خطة مخصصة لك وحدك",
    desc: "تمارين مرتبة حسب نقاط ضعفك — بلا تضييع وقت.",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "AI يشرحلك خطوة بخطوة",
    desc: "مدرس ذكي معاك 24/7 يفهمك حتى تفهم.",
  },
];

const PARENT_BENEFITS = [
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "تقارير أسبوعية شفافة",
    desc: "تعرف مستوى ابنك الحقيقي بدون تخمين أو سؤال.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "متابعة دقيقة للتقدم",
    desc: "نُحدّد نقاط الضعف ونعالجها قبل أن تتراكم.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "وقت مدروس، نتائج ملموسة",
    desc: "20 دقيقة يومياً مركّزة أفضل من ساعات عشوائية.",
  },
];

const STEPS = [
  { n: "01", t: "تشخيص", d: "تقييم ذكي يحدّد مستواك بدقة" },
  { n: "02", t: "خطة", d: "مسار تعلّم مخصص لثغراتك" },
  { n: "03", t: "تطبيق", d: "تمارين تفاعلية مع AI tutor" },
  { n: "04", t: "تقدّم", d: "تحسّن قابل للقياس أسبوعياً" },
];

const STATS = [
  { v: "+5", l: "نقاط معدّل في الشهر" },
  { v: "70%", l: "ثغرات مكتشفة آلياً" },
  { v: "24/7", l: "مدرس AI متاح" },
];

interface BookCard {
  id: string;
  slug: string | null;
  title: string;
  grade: string;
  description: string | null;
}

export default function Landing() {
  const [books, setBooks] = useState<BookCard[]>([]);
  const [audience, setAudience] = useState<"student" | "parent">("student");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("textbooks")
        .select("id, slug, title, grade, description")
        .eq("status", "completed")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(6);
      setBooks(data || []);
    })();
  }, []);

  return (
    <div className="relative bg-background min-h-screen overflow-x-hidden" dir="rtl">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <QEDLogo size="md" />
          <div className="flex items-center gap-6">
            <a href="#textbooks" className="hidden md:inline text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              الدروس
            </a>
            <a href="#how" className="hidden md:inline text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              كيف يعمل
            </a>
            <Link to="/auth" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
              دخول ←
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO with audience switcher ── */}
      <section className="relative min-h-[92vh] flex flex-col justify-center items-center px-6 pt-24 pb-12 text-center">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] -ml-48 -mb-48 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl space-y-8"
        >
          {/* Audience tabs */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/60 border border-border/50">
            <button
              onClick={() => setAudience("student")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                audience === "student"
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              أنا تلميذ
            </button>
            <button
              onClick={() => setAudience("parent")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                audience === "parent"
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              أنا ولي أمر
            </button>
          </div>

          {audience === "student" ? (
            <motion.div
              key="student"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-7"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1]">
                ارفع معدّلك في الرياضيات
                <br />
                <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                  بطريقة ذكية
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                AI شخصي يكتشف ثغراتك، يبنيلك خطة، و يدربك خطوة بخطوة. مش حفظ — فهم حقيقي.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="parent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-7"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1]">
                تابع تقدّم ابنك
                <br />
                <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                  بشفافية كاملة
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium">
                تقارير أسبوعية واضحة تُظهر نقاط الضعف والتحسّن. أنت دائماً في صورة ما يحدث.
              </p>
            </motion.div>
          )}

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={audience === "student" ? "/home" : "/auth"}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base text-primary-foreground shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all bg-gradient-to-l from-primary to-primary/80"
              >
                {audience === "student" ? "ابدأ التشخيص المجاني" : "أنشئ حساب ولي أمر"}
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </motion.div>
            <a
              href="#textbooks"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm text-foreground border-2 border-border hover:border-foreground/30 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              تصفّح الدروس
            </a>
          </div>

          {/* Trust line */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> مجاني للبدء</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> بدون بطاقة بنكية</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> نتائج فورية</span>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4 md:gap-12 mt-16 max-w-2xl mx-auto"
        >
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-4xl font-black bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-[11px] md:text-xs text-muted-foreground mt-1 font-medium">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Audience-specific benefits ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          key={audience}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-5"
        >
          {(audience === "student" ? STUDENT_BENEFITS : PARENT_BENEFITS).map((b, i) => (
            <motion.div
              key={`${audience}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                {b.icon}
              </div>
              <h3 className="text-base font-black text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="bg-muted/30 border-y border-border py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-primary uppercase tracking-wider">العملية</span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              4 خطوات نحو تحسّن حقيقي
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-card border border-border rounded-2xl p-6"
              >
                <div className="text-3xl font-black text-primary/20 mb-3">{s.n}</div>
                <h3 className="text-base font-black text-foreground mb-1.5">{s.t}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Textbooks / Blog section ── */}
      <section id="textbooks" className="max-w-6xl mx-auto px-6 py-24 space-y-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-wider">المكتبة</span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              دروس الرياضيات تفاعلية
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              كتب مدرسية معاد بناؤها كمدوّنة حيّة — أمثلة، رسوم، تمارين تفاعلية.
            </p>
          </div>
          <Link
            to="/textbooks"
            className="inline-flex items-center gap-2 text-sm font-black text-primary hover:text-primary/80 transition-colors"
          >
            كل الدروس
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {books.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {books.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/textbooks/${b.slug || b.id}`}
                  className="block bg-card border border-border rounded-2xl p-6 h-full hover:border-primary/40 hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    {b.grade && (
                      <span className="text-[10px] font-black text-muted-foreground bg-muted px-2.5 py-1 rounded-full uppercase">
                        {b.grade}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {b.title}
                  </h3>
                  {b.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {b.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    اقرأ الدرس
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center text-sm text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
            دروس جديدة تُضاف قريباً
          </div>
        )}
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black">
            <TrendingUp className="w-3.5 h-3.5" />
            ابدأ اليوم — نتائج خلال أسبوعين
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
            معدّل أعلى يبدأ
            <br />
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              من دقيقتين
            </span>
          </h2>

          <p className="text-muted-foreground max-w-md mx-auto">
            تشخيص مجاني، خطة مخصصة، ونتائج قابلة للقياس. بلا التزام.
          </p>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/home"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg text-primary-foreground shadow-2xl shadow-primary/25 transition-all bg-gradient-to-l from-primary to-primary/80"
            >
              ابدأ التقييم المجاني
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3 text-muted-foreground text-xs">
          <QEDLogo size="sm" />
          <span>© {new Date().getFullYear()} QED — محرك الرياضيات الذكي</span>
        </div>
      </footer>
    </div>
  );
}
