import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Brain, Target, Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function KnowledgeGaps({ gaps }: { gaps: any[] }) {
  if (gaps.length === 0) {
    return (
      <Card className="rounded-3xl border-border/40 shadow-sm p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <Target className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-black">لا توجد فجوات حالياً!</CardTitle>
          <CardDescription>أنت تبلي بلاءً حسناً. استمر في حل التمارين للحفاظ على هذا المستوى.</CardDescription>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {gaps.map((gap, i) => (
        <motion.div 
          key={gap.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="rounded-[2rem] border-border/40 hover:border-primary/20 hover:shadow-lg transition-all group">
            <CardContent className="p-6 flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${gap.severity === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-foreground group-hover:text-primary transition-colors">{gap.topic}</h3>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(gap.detected_at), "d MMMM", { locale: ar })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   {gap.severity === 'high' ? 'فجوة حرجة تحتاج معالجة فورية باستخدام التدريبات المقترحة.' : 'نقطة ضعف طفيفة تم اكتشافها وتحتاج إلى بعض الصقل.'}
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex -space-x-1 space-x-reverse">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] font-bold">
                        {j}
                      </div>
                    ))}
                    <div className="text-[10px] text-muted-foreground mr-2 self-center"> تمارين مقترحة 📚</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
