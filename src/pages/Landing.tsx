import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QEDLogo } from "@/components/QEDLogo";
import { ArrowLeft, Search, TrendingUp, Users } from "lucide-react";

const RESULTS = [
  {
    icon: <Search className="w-7 h-7" />,
    title: "نعرفك بالضبط علاش تخسر النقاط",
    description: "تقييم تشخيصي ذكي يحلل أخطاءك ويكتشف الثغرات المخفية في طريقة تفكيرك — مش بس الإجابات الخاطئة.",
    color: "from-blue-500 to-cyan-400",
    shadowColor: "shadow-blue-500/20",
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    title: "نرسملك خطة تحسين مباشرة",
    description: "تمارين مستهدفة مرتبة من الأسهل للأصعب، كل وحدة تسد ثغرة محددة. ما تضيعش وقتك في حاجة تعرفها.",
    color: "from-emerald-500 to-teal-400",
    shadowColor: "shadow-emerald-500/20",
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: "ولي الأمر يتابع كل شيء",
    description: "تقارير واضحة توري الأب بالضبط وين ابنه ضعيف، وكيفاش يتحسن أسبوعياً — بلا ما يحتاج يسأل.",
    color: "from-amber-500 to-orange-400",
    shadowColor: "shadow-amber-500/20",
  },
];

const TESTIMONIALS = [
  { text: "قبل QED كنت نراجع كلش عشوائي. دابا نعرف بالضبط وين مشكلتي.", name: "سارة، 3AS" },
  { text: "ولدي طلع معدله من 8 لـ 13 في شهرين فقط.", name: "أم أنس، ولية أمر" },
  { text: "أحسن حاجة هي التقييم التشخيصي. وراني أخطاء ما كنتش حاسب بيها.", name: "يوسف، BAC 2025" },
];

export default function Landing() {
  return (
    <div className="relative bg-background min-h-screen overflow-x-hidden" dir="rtl">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <QEDLogo size="md" />
          <Link
            to="/auth"
            className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            دخول ←
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 pt-24 text-center">
        {/* Subtle bg */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-destructive/5 rounded-full blur-[150px] -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -ml-48 -mb-48 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl space-y-8"
        >
          {/* Problem hook */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black">
            ⚠️ ٪٧٠ من الطلاب يخسرون نقاط في حاجات يقدرو يتجنبوها
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1]">
            راك تخسر نقاط
            <br />
            في الرياضيات...
            <br />
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              و ماكش عارف فين
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium">
            QED يوريك <strong className="text-foreground">بالضبط وين تخسر</strong> — و يعطيك خطة مباشرة باش تربحهم.
          </p>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/home"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg text-primary-foreground shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all bg-gradient-to-l from-primary to-primary/80"
            >
              اكتشف وين تضيع نقاطك
              <span className="text-xs font-bold opacity-75 bg-primary-foreground/20 px-2 py-0.5 rounded-full">دقيقتين فقط</span>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>

          <p className="text-xs text-muted-foreground/60">مجاني بالكامل · بدون تسجيل إلزامي · نتائج فورية</p>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-9 rounded-full border-2 border-foreground/10 flex items-start justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="w-1 h-1 rounded-full bg-foreground/20"
            />
          </div>
        </motion.div>
      </section>

      {/* ── 3 RESULTS (not features) ── */}
      <section className="max-w-5xl mx-auto px-6 py-24 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-black text-foreground">
            كيفاش QED يرفع معدلك؟
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            ثلاث خطوات بسيطة — نتائج ملموسة
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {RESULTS.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative bg-card border border-border rounded-3xl p-8 space-y-5 hover:border-primary/30 hover:shadow-xl transition-all duration-500 group"
            >
              {/* Step number */}
              <div className="absolute -top-4 -right-2 w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center text-sm font-black shadow-lg">
                {i + 1}
              </div>

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} ${r.shadowColor} shadow-xl flex items-center justify-center text-white group-hover:rotate-6 group-hover:scale-110 transition-transform duration-500`}>
                {r.icon}
              </div>

              <h3 className="text-lg font-black text-foreground leading-snug">
                {r.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {r.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-muted/30 border-y border-border py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              طلاب حقيقيين، نتائج حقيقية
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 space-y-4"
              >
                <p className="text-sm text-foreground/80 leading-relaxed italic">
                  "{t.text}"
                </p>
                <p className="text-xs font-bold text-muted-foreground">— {t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
            معدلك يقدر يتحسن
            <br />
            <span className="bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              ابدأ من هنا
            </span>
          </h2>

          <p className="text-muted-foreground max-w-md mx-auto">
            دقيقتين تقييم — و تعرف بالضبط وين لازم تركز. بلا تضييع وقت.
          </p>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              to="/home"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg text-primary-foreground shadow-2xl shadow-primary/25 transition-all bg-gradient-to-l from-primary to-primary/80"
            >
              اكتشف ثغراتك الآن
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>

          <p className="text-xs text-muted-foreground/50">
            مجاني · بدون بطاقة بنكية · نتائج فورية
          </p>
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
