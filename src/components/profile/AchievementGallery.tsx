import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Zap, Target, History, Trophy, Star, Sparkles, BookCheck, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ALL_BADGES = {
  streak_3: { id: "streak_3", title: "شعلة الأمل", desc: "سلسلة دخول ٣ أيام متتالية", icon: <Zap className="w-8 h-8 text-amber-500" />, bg: "bg-amber-500/10" },
  diagnostic_done: { id: "diagnostic_done", title: "مستكشف الذكاء", desc: "أتممت أول تقييم تشخيصي", icon: <Brain className="w-8 h-8 text-primary" />, bg: "bg-primary/10" },
  solved_10: { id: "solved_10", title: "بطل الحلول", desc: "حل ١٠ تمارين صحيحة", icon: <BookCheck className="w-8 h-8 text-emerald-500" />, bg: "bg-emerald-500/10" },
  confidence_high: { id: "confidence_high", title: "واثق الخطى", desc: "إجابة صحيحة بثقة ١٠٠%", icon: <Star className="w-8 h-8 text-cyan-500" />, bg: "bg-cyan-500/10" },
  strategic_mind: { id: "strategic_mind", title: "عقل استراتيجي", desc: "مصنف كنمط تفكير استراتيجي", icon: <Trophy className="w-8 h-8 text-purple-500" />, bg: "bg-purple-500/10" },
};

export function AchievementGallery({ progress }: any) {
  const userBadges = progress?.badges || {};
  const badgeIds = Object.keys(userBadges);

  if (badgeIds.length === 0) {
    return (
      <Card className="rounded-3xl border-border/40 shadow-sm p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-muted/20 text-muted-foreground rounded-full flex items-center justify-center mx-auto grayscale opacity-40">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-black">رحلة الألف ميل تبدأ بوسام!</CardTitle>
          <CardDescription>أكمل التمارين والتقييمات لتحصل على وسامك الأول.</CardDescription>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> معرض الإنجازات
          </h2>
          <p className="text-xs text-muted-foreground">لقد فتحت {badgeIds.length} من أصل {Object.keys(ALL_BADGES).length} أوسمة متاحة.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Object.values(ALL_BADGES).map((badge, i) => {
          const isLocked = !userBadges[badge.id];
          return (
            <motion.div 
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`
                rounded-[2.5rem] border-border/40 transition-all duration-500 h-full relative overflow-hidden group
                ${isLocked ? 'opacity-40 grayscale blur-[1px] cursor-not-allowed' : 'hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer'}
              `}>
                <CardContent className="p-6 pt-10 flex flex-col items-center text-center space-y-4 h-full">
                  {!isLocked && (
                     <div className="absolute top-4 right-4 text-[10px] font-black text-primary animate-pulse flex items-center gap-1">
                       <Sparkles className="w-3 h-3" /> تم الحصول
                     </div>
                  )}
                  
                  <div className={`
                    w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-transform duration-500
                    ${badge.bg} ${!isLocked && 'group-hover:scale-110 group-hover:rotate-6'}
                  `}>
                    {badge.icon}
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    <h3 className="font-black text-foreground">{badge.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed px-4">{badge.desc}</p>
                  </div>

                  {isLocked && (
                     <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                        <div className="p-2 rounded-full bg-card border border-border shadow-md">
                          <Award className="w-4 h-4 text-muted-foreground" />
                        </div>
                     </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
