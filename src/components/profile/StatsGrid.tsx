import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, Award, History, TrendingUp, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

export function StatsGrid({ progress, gapsCount }: any) {
  const stats = [
    {
      label: "معدل الإتقان",
      value: `${progress?.total_correct && progress?.total_exercises ? Math.round((progress.total_correct / progress.total_exercises) * 100) : 0}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      desc: "دقة الإجابات الكلية"
    },
    {
      label: "أطول سلسلة",
      value: `${progress?.streak_days || 0} أيام`,
      icon: <Zap className="w-5 h-5" />,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      desc: "الالتزام اليومي المستمر"
    },
    {
      label: "فجوات مكتشفة",
      value: gapsCount,
      icon: <Target className="w-5 h-5" />,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      desc: "مواضيع تحتاج مراجعة"
    },
    {
      label: "أوسمة مستحقة",
      value: Object.keys(progress?.badges || {}).length,
      icon: <Award className="w-5 h-5" />,
      color: "text-primary",
      bg: "bg-primary/10",
      desc: "إنجازات قمت بتحقيقها"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
    >
      {stats.map((stat, i) => (
        <motion.div key={i} variants={item}>
          <Card className="rounded-[2rem] border-border/40 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className="space-y-0.5">
                  <span className="text-2xl md:text-3xl font-black text-foreground">{stat.value}</span>
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                </div>
                <div className="pt-2 flex items-center gap-1 text-[9px] text-muted-foreground/60">
                   <HelpCircle className="w-2.5 h-2.5" /> {stat.desc}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
