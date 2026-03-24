import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Users, BarChart3, Brain, Trophy, Star, ArrowLeft, Layers, Target, Sparkles } from "lucide-react";

const features = [
  { icon: Brain, title: "ذكاء اصطناعي تكيّفي", desc: "مسارات تعلم مخصصة حسب مستوى كل طالب", color: "bg-primary" },
  { icon: Layers, title: "بطاقات تعليمية", desc: "تكرار متباعد لترسيخ المفاهيم والصيغ", color: "bg-secondary" },
  { icon: Target, title: "اختبارات تفاعلية", desc: "أسئلة متعددة الخيارات وتمارين عملية", color: "bg-accent" },
  { icon: Trophy, title: "نظام الشارات", desc: "نقاط خبرة وسلاسل إنجاز ولوحة متصدرين", color: "bg-success" },
  { icon: BarChart3, title: "تحليلات متقدمة", desc: "تقارير مفصلة للمعلمين وأولياء الأمور", color: "bg-info" },
  { icon: Sparkles, title: "تقييم تشخيصي", desc: "تحديد الفجوات المعرفية وبناء خطة علاج", color: "bg-warning" },
];

const roles = [
  { path: "/student", icon: GraduationCap, title: "الطالب", desc: "ادخل وابدأ رحلتك التعليمية", color: "bg-primary" },
  { path: "/teacher", icon: BookOpen, title: "المعلم", desc: "أنشئ المناهج وتابع طلابك", color: "bg-secondary" },
  { path: "/admin", icon: Users, title: "المدير", desc: "إدارة المنصة والمستخدمين", color: "bg-accent" },
  { path: "/parent", icon: Star, title: "ولي الأمر", desc: "تابع تقدم أبنائك", color: "bg-success" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">ر+</span>
            </div>
            <span className="text-xl font-bold text-foreground">رياضيات+</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              تسجيل الدخول
            </Link>
            <Link
              to="/auth"
              className="text-sm bg-gradient-hero text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                🎓 منصة تعليمية بالذكاء الاصطناعي
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
                تعلّم الرياضيات
                <br />
                <span className="text-gradient-hero">بطريقة ذكية</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
                مسارات تعلم مخصصة، بطاقات تعليمية بالتكرار المتباعد، اختبارات تفاعلية،
                ونظام تحفيز يجعل التعلم ممتعاً ومثمراً
              </p>
            </motion.div>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Link
                to="/student"
                className="bg-gradient-hero text-primary-foreground px-8 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                ابدأ التعلم الآن
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link
                to="/teacher"
                className="bg-card border border-border text-foreground px-8 py-4 rounded-xl text-lg font-medium hover:bg-muted transition-colors"
              >
                أنا معلم
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">لماذا رياضيات+؟</h2>
            <p className="text-muted-foreground text-lg">أدوات متكاملة لتجربة تعليمية فريدة</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-card rounded-2xl p-6 border border-border hover-lift cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">اختر دورك</h2>
            <p className="text-muted-foreground text-lg">كل مستخدم يحصل على تجربة مصممة خصيصاً له</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {roles.map((r, i) => (
              <motion.div
                key={r.path}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Link
                  to={r.path}
                  className="block bg-card rounded-2xl p-6 border border-border hover-lift text-center group"
                >
                  <div className={`w-16 h-16 rounded-2xl ${r.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <r.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{r.title}</h3>
                  <p className="text-muted-foreground text-sm">{r.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© 2026 رياضيات+ — منصة تعليم الرياضيات التفاعلية</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
