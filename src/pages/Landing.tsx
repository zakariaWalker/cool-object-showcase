// ═══════════════════════════════════════════════════════════════════════
//  Landing.tsx — QED Premium · صفحة الهبوط المطورة
// ═══════════════════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { QEDLogo } from "@/components/QEDLogo";
import { Brain, Zap, Target, BookOpen, CheckCircle2, ChevronDown, Sparkles, GraduationCap } from "lucide-react";

// Assets (Using absolute paths from artifact dir)
const ASSETS = {
  hero: "/C:/Users/lenovo/.gemini/antigravity/brain/90f3bcb0-01ed-4d9c-986b-6ff0fccf994c/qed_hero_concept_1774708805136.png",
  kb: "/C:/Users/lenovo/.gemini/antigravity/brain/90f3bcb0-01ed-4d9c-986b-6ff0fccf994c/qed_feature_kb_mockup_1774708941274.png",
  tutor: "/C:/Users/lenovo/.gemini/antigravity/brain/90f3bcb0-01ed-4d9c-986b-6ff0fccf994c/qed_feature_tutor_mockup_1774709105988.png",
};

const FEATURES = [
  {
    id: "kb",
    icon: <Brain className="w-8 h-8" />,
    title: "قاعدة معرفة ذكية (KB)",
    subtitle: "تفكيك رياضي كامل لكل الأنماط",
    description: "أكثر من 500 نمط حل مصنف حسب المنهج الجزائري. لا مزيد من الحفظ الصم، افهم 'لماذا' و 'كيف' لكل خطوة حل.",
    img: ASSETS.kb,
    color: "hsl(var(--algebra))",
  },
  {
    id: "tutor",
    icon: <Sparkles className="w-8 h-8" />,
    title: "المدرّس الذكي SOTA",
    subtitle: "توجيه تفاعلي خطوة بخطوة",
    description: "محرك حل محلي يحلل إجابتك، يكتشف ثغراتك، ويشرح لك المفاهيم بأسلوب مبسط وممتع عبر شات تفاعلي.",
    img: ASSETS.tutor,
    color: "hsl(var(--geometry))",
  },
];

const SUCCESS_STEPS = [
  { id: 1, title: "التشخيص الذكي", desc: "كشف الثغرات المعرفية فورا", icon: <Target className="w-6 h-6" /> },
  { id: 2, title: "المسار المخصص", desc: "خطة دراسية ذكية للـ BAC", icon: <BookOpen className="w-6 h-6" /> },
  { id: 3, title: "الإتقان الكامل", desc: "تجاوز كل الصعوبات والتميز", icon: <GraduationCap className="w-6 h-6" /> },
];

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => setIsLoaded(true), []);

  return (
    <div ref={containerRef} className="relative bg-[#020617] text-white min-h-screen font-['Inter',_sans-serif] selection:bg-primary/30" dir="rtl">
      
      {/* ── Background Layers ── */}
      <div className="fixed inset-0 z-0">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center mix-blend-overlay"
          style={{ backgroundImage: `url(${ASSETS.hero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-[#020617]/90 to-[#020617]" />
        
        {/* Particle/Star effect */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 stars-container" />
        </div>
      </div>

      {/* ── Fixed Nav ── */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between px-6 lg:px-12 py-5 backdrop-blur-2xl border-b border-white/5 bg-black/20"
      >
        <div className="flex items-center gap-4">
          <QEDLogo size="sm" white />
          <div className="hidden md:block h-6 w-px bg-white/10" />
          <div className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-widest font-black opacity-40">
            <span>SOTA Engine v2.0</span>
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span>BAC 2025 Algeria</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-black opacity-60 hover:opacity-100 transition-all ml-4">دخول</Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/home" className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)] transition-all">
              ابدأ الآن — مجاناً
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 px-6 text-center z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[180px] opacity-30 animate-pulse pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-10 shadow-xl">
            <Zap className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">المستقبل التعليمي للطالب الجزائري</span>
          </div>

          <h1 className="text-5xl lg:text-[7.5rem] font-black leading-[0.9] tracking-tighter mb-10 selection:text-primary">
            تخطّى حدود
            <br />
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-2xl">
              الفهم التقليدي
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg lg:text-2xl text-white/50 leading-relaxed font-medium mb-16 px-4">
            أول منصة ذكية تفكك شفرات الرياضيات للمنهج الجزائري.
            <br className="hidden md:block" />
            حول تعثراتك إلى تميز حقيقي في <span className="text-white font-black underline decoration-primary/50 underline-offset-4">BAC 2025</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/home" 
                className="group relative px-12 py-6 rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-[0_20px_60px_-15px_rgba(var(--primary-rgb),0.4)] overflow-hidden block"
              >
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                ابدأ رحلة النجاح مجاناً ←
              </Link>
            </motion.div>
            <Link 
              to="/gaps" 
              className="px-10 py-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl font-black text-xl hover:bg-white/10 transition-all flex items-center gap-3 group"
            >
              <Target className="w-6 h-6 text-primary group-hover:rotate-45 transition-transform" />
              التقييم التشخيصي
            </Link>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 15, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-30"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-primary to-transparent" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">اكتشف المزيد</span>
        </motion.div>
      </section>

      {/* ── ROADMAP SECTION ── */}
      <section className="relative py-40 px-6 z-10 bg-[#020617]/50 backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SUCCESS_STEPS.map((step) => (
              <motion.div
                key={step.id}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 30 }}
                viewport={{ once: true }}
                transition={{ delay: step.id * 0.2 }}
                className="group relative p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/5 rounded-full blur-[40px] group-hover:bg-primary/10 transition-all" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-black mb-4">{step.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed font-bold">{step.desc}</p>
                </div>
                <div className="absolute bottom-0 right-0 p-6 text-6xl font-black text-white/[0.02] pointer-events-none">0{step.id}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CINEMATIC FEATURES ── */}
      <section className="relative py-40 px-6 z-10 space-y-40">
        {FEATURES.map((f, idx) => (
          <div key={f.id} className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-20 max-w-7xl mx-auto`}>
            {/* Image side with floating animation */}
            <motion.div 
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -100 : 100, rotateY: idx % 2 === 0 ? 10 : -10 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="flex-1 relative perspective-1000"
            >
              <div className="absolute inset-0 bg-primary/20 blur-[120px] opacity-20" />
              <img 
                src={f.img} 
                alt={f.title}
                className="rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 hover:scale-[1.03] transition-transform duration-700"
              />
              {/* Scanline decoration */}
              <div className="absolute inset-x-0 h-[2px] bg-primary/40 top-1/4 blur-sm animate-scan" />
            </motion.div>

            {/* Content Side */}
            <div className="flex-1 text-right" dir="rtl">
              <motion.div
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-10 shadow-inner">
                  {f.icon}
                </div>
                <h3 className="text-4xl lg:text-7xl font-black mb-8 leading-tight tracking-tighter">
                  {f.title}
                </h3>
                <p className="text-2xl text-primary font-black mb-6 italic opacity-80">{f.subtitle}</p>
                <p className="text-xl text-white/40 leading-relaxed font-medium mb-12">
                  {f.description}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="text-sm font-black text-white/70">ميزة تكنولوجية رقم {i}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        ))}
      </section>

      {/* ── CTA FINAL ── */}
      <section className="relative py-60 px-6 z-10 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[200px] pointer-events-none" />
        
        <motion.div
          whileInView={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.9 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <h2 className="text-5xl lg:text-8xl font-black mb-12 leading-none tracking-tighter shrink-0">
            العلامة الكاملة في الـ 
            <span className="text-primary italic"> BAC </span>
            <br />
            ليست حلماً بعد الآن.
          </h2>
          <p className="text-xl lg:text-3xl text-white/40 mb-20 font-medium">
            انضم للثورة التعليمية الأذكى في الجزائر.
          </p>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link 
              to="/home" 
              className="px-16 py-8 rounded-[2.5rem] bg-primary text-primary-foreground font-black text-3xl shadow-[0_30px_90px_-15px_rgba(var(--primary-rgb),0.6)]"
            >
              ابدأ تجربتك المجانية ←
            </Link>
          </motion.div>
          
          <div className="mt-12 flex justify-center gap-12 text-white/20 font-black text-xs uppercase tracking-widest">
            <span>دقة عالية</span>
            <span>ذكاء جزائري 🇩🇿</span>
            <span>مجاني للأبد</span>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 px-6 lg:px-12 z-10 border-t border-white/5 bg-black/60 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <QEDLogo size="md" white />
            <p className="text-white/30 text-[11px] font-bold max-w-xs text-center md:text-right">
              نظام QED التعليمي هو ثمرة تعاون لتطوير طرق تعلم الرياضيات في الجزائر.
            </p>
          </div>
          
          <div className="flex gap-16">
            <div className="flex flex-col gap-4 text-right">
              <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">الدعم</span>
              <Link to="#" className="text-sm font-bold opacity-60 hover:text-primary transition-all">الأسئلة الشائعة</Link>
              <Link to="#" className="text-sm font-bold opacity-60 hover:text-primary transition-all">تواصل معنا</Link>
            </div>
            <div className="flex flex-col gap-4 text-right">
              <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">القانونية</span>
              <Link to="#" className="text-sm font-bold opacity-60 hover:text-primary transition-all">الشروط</Link>
              <Link to="#" className="text-sm font-bold opacity-60 hover:text-primary transition-all">الخصوصية</Link>
            </div>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] text-white/10 font-mono tracking-widest uppercase">
            Designed & Engineered for BAC 2025 Excellence • © QED ALGERIA
          </p>
        </div>
      </footer>

      {/* Global CSS */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .stars-container {
          background-image: 
            radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 150px 150px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 80px 250px, #fff, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 300px 400px;
          animation: stars 120s linear infinite;
        }
        @keyframes stars {
          from { transform: translateY(0); }
          to { transform: translateY(-1200px); }
        }
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(600px); opacity: 0; }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        :root {
          --primary-rgb: 59, 130, 246; /* Blue 500 */
        }
      `}</style>
    </div>
  );
}
