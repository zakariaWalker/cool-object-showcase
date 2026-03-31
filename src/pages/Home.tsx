import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { GamificationDashboard } from "@/components/GamificationDashboard";
import { 
  Search, 
  Map, 
  PenTool, 
  Bot, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  Lock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuidingTooltip } from "@/components/ui/GuidingTooltip";

const WORKFLOW = [
  {
    step: 1,
    id: "diagnostic",
    path: "/diagnostic",
    title: "التقييم التشخيصي",
    subtitle: "اكتشف ثغراتك الحقيقية",
    description: "نبدأ بتحليل طريقة تفكيرك، ليس فقط ما تعرفه، بل كيف تحل المشكلات.",
    icon: <Search className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-400",
    shadow: "shadow-blue-500/20",
  },
  {
    step: 2,
    id: "learn",
    path: "/learn",
    title: "مسار التعلم",
    subtitle: "خطة مخصصة لك",
    description: "بناءً على نتائجك، سنرسم لك طريقاً مختصراً للنجاح يركز على نقاط ضعفك.",
    icon: <Map className="w-6 h-6" />,
    color: "from-emerald-500 to-teal-400",
    shadow: "shadow-emerald-500/20",
  },
  {
    step: 3,
    id: "exercises",
    path: "/exercises",
    title: "حل التمارين",
    subtitle: "تدرّب بذكاء",
    description: "تمارين تفاعلية مدعومة بمحررات رياضية متطورة لتجسيد تفكيرك.",
    icon: <PenTool className="w-6 h-6" />,
    color: "from-amber-500 to-orange-400",
    shadow: "shadow-amber-500/20",
  },
  {
    step: 4,
    id: "tutor",
    path: "/tutor",
    title: "المدرّس الذكي",
    subtitle: "مرافقة دائمة",
    description: "عندما تتعثر، تجد شرحاً مفكّكاً يعيد بناء المفاهيم في عقلك بوضوح.",
    icon: <Bot className="w-6 h-6" />,
    color: "from-purple-500 to-pink-400",
    shadow: "shadow-purple-500/20",
  },
  {
    step: 5,
    id: "annales",
    path: "/annales",
    title: "المواضيع السابقة",
    subtitle: "تدريب نهائي",
    description: "حل امتحانات رسمية سابقة في بيئة تحاكي الواقع لكسر حاجز الرهبة.",
    icon: <FileText className="w-6 h-6" />,
    color: "from-rose-500 to-red-400",
    shadow: "shadow-rose-500/20",
  },
];

export default function Home() {
  const [stats, setStats] = useState({ exercises: 0, patterns: 0, deconstructions: 0 });
  const [progress, setProgress] = useState<Record<string, boolean>>({
    diagnostic: false,
    learn: false,
    exercises: false,
    tutor: false,
    annales: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [ex, pat, dec, diag, prog, logs] = await Promise.all([
        (supabase as any).from("kb_exercises").select("id", { count: "exact", head: true }),
        (supabase as any).from("kb_patterns").select("id", { count: "exact", head: true }),
        (supabase as any).from("kb_deconstructions").select("id", { count: "exact", head: true }),
        supabase.from("student_activity_log").select("id").eq("student_id", user.id).eq("action", "diagnostic_completed").limit(1),
        supabase.from("student_progress").select("*").eq("student_id", user.id).maybeSingle(),
        supabase.from("student_activity_log").select("id").eq("student_id", user.id).eq("action", "tutor_session").limit(1),
      ]);

      setStats({
        exercises: ex.count || 0,
        patterns: pat.count || 0,
        deconstructions: dec.count || 0,
      });

      setProgress({
        diagnostic: (diag.data?.length ?? 0) > 0,
        learn: !!prog.data?.mastery,
        exercises: (prog.data?.total_exercises ?? 0) > 0,
        tutor: (logs.data?.length ?? 0) > 0,
        annales: false, // Default to false for now, can be linked to logs if needed
      });

      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" dir="rtl">
      
      {/* Dynamic Hero Section */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] -ml-24 -mb-24" />
        
        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 text-primary text-xs font-black shadow-lg shadow-primary/5"
          >
            <Sparkles className="w-3.5 h-3.5" /> المنصة التعليمية الأولى في الجزائر 🇩🇿
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black leading-tight tracking-tight"
          >
            حوّل تعثرك إلى <br />
            <span className="bg-gradient-to-l from-primary via-cyan-400 to-accent bg-clip-text text-transparent">تفوق رياضي ذكي</span>
          </motion.h1>

          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium"
          >
            نحن لا نعطيك الحلول فقط، نحن نعلّمك كيف يفكّر العقل الرياضي المبدع. <br />
            ابدأ رحلتك اليوم في غضون دقائق.
          </motion.p>

          <div className="flex flex-wrap items-center justify-center gap-8 pt-4">
             <StatCounter value={stats.exercises} label="تمرين مفكك" />
             <div className="w-px h-8 bg-border/50 hidden md:block" />
             <StatCounter value={stats.patterns} label="نمط إدراكي" />
             <div className="w-px h-8 bg-border/50 hidden md:block" />
             <StatCounter value={stats.deconstructions} label="درجة من التحليل" />
          </div>
        </div>
      </section>

      {/* Main Journey Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 relative">
        
        {/* Sidebar: Gamification */}
        <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
           <motion.div
             initial={{ opacity: 0, x: 20 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
           >
             <GamificationDashboard />
           </motion.div>

           <CardGradient className="p-8 space-y-4">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> هدفك القادم
              </h3>
              <p className="text-sm text-muted-foreground">أكمل التقييم التشخيصي الأول لتحصل على 100 XP وتفتح مسار تعلمك المخصص.</p>
              <GuidingTooltip 
                type="tip" 
                title="نصيحة ذكية" 
                description="ابدأ التقييم بتركيز. لا توجد إجابات خاطئة، فقط طرق تفكير مختلفة نود اكتشافها معك!"
              >
                <Button asChild className="w-full rounded-2xl h-12 font-black shadow-lg shadow-primary/20">
                  <Link to="/diagnostic">ابدأ التحدي الآن</Link>
                </Button>
              </GuidingTooltip>
           </CardGradient>
        </div>

        {/* Journey Workflow */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-12">
           <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black">رحلة التفوق</h2>
                <p className="text-sm text-muted-foreground mt-1 text-right">خطوات مدروسة لبناء عقلك الرياضي</p>
              </div>
              <div className="flex -space-x-2 space-x-reverse">
                 {[1,2,3,4,5].map(n => (
                   <div key={n} className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-black shadow-sm ${n <= (Object.values(progress).filter(Boolean).length + 1) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                     {n}
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-6 relative">
             {/* The Vertical Connector Line */}
             <div className="absolute right-[31px] top-10 bottom-10 w-1 bg-muted rounded-full overflow-hidden hidden md:block">
                <motion.div 
                   initial={{ height: 0 }}
                   animate={{ height: `${(Object.values(progress).filter(Boolean).length / 5) * 100}%` }}
                   className="w-full bg-primary"
                   transition={{ duration: 1.5, ease: "easeInOut" }}
                />
             </div>

             {WORKFLOW.map((item, i) => {
               const isCompleted = progress[item.id];
               const isActive = !isCompleted && (i === 0 || progress[WORKFLOW[i-1].id]);
               const isLocked = !isCompleted && !isActive;

               return (
                 <motion.div
                   key={item.id}
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                 >
                   <Link
                     to={item.path}
                     className={`
                        relative block rounded-[2.5rem] p-8 border-2 transition-all duration-500 overflow-hidden group
                        ${isActive ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10 scale-[1.02]' : isCompleted ? 'border-border/60 bg-card/50 opacity-80' : 'border-border/40 bg-card grayscale opacity-50 pointer-events-none'}
                        hover:border-primary/40 hover:shadow-xl
                     `}
                   >
                     {/* Completed Checkmark */}
                     {isCompleted && (
                       <div className="absolute top-6 left-6 text-emerald-500 animate-in zoom-in">
                         <CheckCircle2 className="w-8 h-8" />
                       </div>
                     )}

                     {isLocked && (
                        <div className="absolute top-6 left-6 text-muted-foreground/40">
                          <Lock className="w-6 h-6" />
                        </div>
                     )}

                     <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                       {/* Icon Circle */}
                       <div 
                         className={`
                           w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shrink-0 shadow-xl transition-all duration-500
                           bg-gradient-to-br ${item.color} ${item.shadow}
                           group-hover:rotate-6 group-hover:scale-110
                         `}
                       >
                         {item.icon}
                       </div>

                       <div className="flex-1 text-center md:text-right space-y-2">
                         <div className="space-y-1">
                           <h3 className="text-2xl font-black text-foreground">{item.title}</h3>
                           <p className="text-primary font-bold text-sm">{item.subtitle}</p>
                         </div>
                         <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                           {item.description}
                         </p>
                       </div>

                       <div className="shrink-0 flex items-center gap-2 text-primary font-black group-hover:-translate-x-2 transition-transform">
                          {isActive ? 'ابدأ كـ مهمة' : isCompleted ? 'إعادة الزيارة' : 'مغلق'} <ChevronLeft className="w-5 h-5" />
                       </div>
                     </div>
                   </Link>
                 </motion.div>
               );
             })}
           </div>
        </div>
      </section>
    </div>
  );
}

function StatCounter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center md:items-start">
      <div className="text-3xl font-black text-foreground tabular-nums">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {value.toLocaleString("ar-DZ")}
        </motion.span>
        <span className="text-primary ml-1">+</span>
      </div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
}

function CardGradient({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`relative bg-card border border-border/60 rounded-[2.5rem] overflow-hidden shadow-xl ${className}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative">{children}</div>
    </div>
  );
}
