import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  ArrowUpLeft,
} from "lucide-react";

// ── Two audience tracks ──
// Student: darija, baccalauréat-focused, concrete
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

// Parent: formal Arabic, trust-building, financial relief
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

// Honest, modest stats — no inflated promises
const TRUST_POINTS = [
  { v: "15د", l: "تشخيص أوّلي" },
  { v: "100%", l: "متوافق مع برنامج الباك" },
  { v: "24/7", l: "متاح في أي وقت" },
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
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.description?.toLowerCase().includes(q) ?? false);
      return matchesGrade && matchesQuery;
    });
  }, [books, query, gradeFilter]);

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
              كيف يخدم
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
          {/* Algerian context badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            مصمَّم خصّيصاً للبرنامج الجزائري — باك وبيام
          </div>

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
              ولي الأمر
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
                  للباك والبيام
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                نكتشفولك وين راك تغلط، نمدّولك تمارين على قد مستواك، ونشرحولك حتى تفهم بصح — مش حفظ.
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
                مرافقة ابنك في الرياضيات
                <br />
                <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                  بدون قلق
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium">
                تعرف مستوى ابنك الحقيقي، تتابع تقدّمه أسبوعياً، وتوفّر على نفسك تكلفة الدروس الخصوصية.
              </p>
            </motion.div>
          )}

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={audience === "student" ? "/diagnostic" : "/auth"}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base text-primary-foreground shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all bg-gradient-to-l from-primary to-primary/80"
              >
                {audience === "student" ? "ابدأ التشخيص — مجاناً" : "سجّل لمتابعة ابنك"}
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </motion.div>
            <a
              href="#textbooks"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm text-foreground border-2 border-border hover:border-foreground/30 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {audience === "student" ? "شوف الدروس" : "تصفّح المحتوى"}
            </a>
          </div>

          {/* Trust line */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> بدون تسجيل معقّد</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> بدون بطاقة بنكية</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> النتيجة فورية</span>
          </div>
        </motion.div>

        {/* Trust points strip — honest, no inflated numbers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4 md:gap-12 mt-16 max-w-2xl mx-auto"
        >
          {TRUST_POINTS.map((s, i) => (
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
            <span className="text-xs font-black text-primary uppercase tracking-wider">كيف يخدم</span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              4 خطوات بسيطة، نتيجة واضحة
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              نفس الطريقة اللي يستعملها أحسن الأساتذة — لكن مهيكَلة ومتاحة 24/7.
            </p>
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

      {/* ── Parent reassurance section (only shown when parent audience) ── */}
      {audience === "parent" && (
        <section className="max-w-4xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-primary/20 rounded-3xl p-8 md:p-12 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
              <ShieldCheck className="w-3.5 h-3.5" />
              لولي الأمر
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
              لست مضطراً لاختيار بين تكلفة باهظة أو ترك ابنك بلا متابعة
            </h2>
            <div className="grid md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <div className="text-sm font-black text-foreground">📊 شفافية كاملة</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  تصلك تقارير دورية تُظهر بالضبط ما الذي يفهمه ابنك، وما الذي يحتاج تعزيزه.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-black text-foreground">💰 توفير حقيقي</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  مرافقة شاملة بسعر أقل بكثير من ساعة واحدة من الدروس الخصوصية.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-black text-foreground">🇩🇿 محتوى جزائري</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  متوافق 100% مع برنامج الجيل الثاني، باك وبيام — وليس محتوى أجنبي مترجَم.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-black text-foreground">🤝 لا يلغي دور الأستاذ</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  أداة مكمّلة تساعد ابنك على التدرّب الذاتي، ليصبح أكثر استعداداً في القسم.
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ── Textbooks / Blog section ── */}
      <section id="textbooks" className="max-w-6xl mx-auto px-6 py-24 space-y-12">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <span className="text-xs font-black text-primary uppercase tracking-wider">المكتبة</span>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              دروس مبسّطة، تمارين باك، حلول مفهومة
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              محتوى مهيكَل حسب البرنامج الرسمي — اقرأ، تدرّب، وافهم في نفس المكان.
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
            ابدأ التشخيص — تشوف نتيجتك في 15 دقيقة
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
            وقّاش تعرف مستواك
            <br />
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              بالضبط؟
            </span>
          </h2>

          <p className="text-muted-foreground max-w-md mx-auto">
            تشخيص مجاني، بدون تسجيل معقّد، يعطيك صورة واضحة على نقاط القوة والضعف.
          </p>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/diagnostic"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg text-primary-foreground shadow-2xl shadow-primary/25 transition-all bg-gradient-to-l from-primary to-primary/80"
            >
              ابدأ التشخيص المجاني
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-3 text-muted-foreground text-xs">
          <QEDLogo size="sm" />
          <span>© {new Date().getFullYear()} QED — منصّة الرياضيات للتلميذ الجزائري</span>
        </div>
      </footer>
    </div>
  );
}
