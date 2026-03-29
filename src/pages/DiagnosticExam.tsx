import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Brain, Zap, Target, Puzzle, ArrowLeft, Play } from "lucide-react";
import { DiagnosticProfiler } from "@/components/DiagnosticProfiler";
import { Button } from "@/components/ui/button";

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);

  return (
    <div className="h-full w-full bg-background overflow-y-auto" dir="rtl">
      <div className="max-w-3xl mx-auto p-6 md:p-12 min-h-screen flex flex-col justify-center">
        
        <AnimatePresence mode="wait">
          {!isStarted ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12"
            >
              <button 
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              >
                <ArrowLeft className="w-4 h-4 ml-1" /> العودة للرئيسية
              </button>

              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-4">
                  <Brain className="w-10 h-10" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-foreground">
                  التقييم التشخيصي <span className="text-primary">الذهني</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  هذا ليس امتحاناً مدرسياً عادياً! نحن لا نقيم صحة إجاباتك فقط، بل نحلل <strong className="text-foreground">كيف تفكر</strong>، <strong className="text-foreground">كيف تتعامل مع الفخاخ</strong>، ومستوى <strong className="text-foreground">ثقتك بنفسك</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">٤ مراحل غير تقليدية</h3>
                  <p className="text-sm text-muted-foreground">مسألة قياسية، فخ رياضي، لغز منطقي، ومسألة مفتوحة لاستكشاف إبداعك.</p>
                </div>
                
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">قياس التردد وسرعة البديهة</h3>
                  <p className="text-sm text-muted-foreground">نحلل الوقت المستغرق وتغييرات استراتيجيتك أثناء الحل.</p>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card md:col-span-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">تحديد النمط المعرفي</h3>
                  <p className="text-sm text-muted-foreground">في النهاية، سنحدد ما إذا كنت: استراتيجياً، مفاهيمياً، إجرائياً، أو تفاعلياً لتخصيص محرك AI لك.</p>
                </div>
              </div>

              <div className="flex justify-center mt-12">
                <Button 
                  size="lg" 
                  onClick={() => setIsStarted(true)}
                  className="gap-3 px-8 text-lg font-bold rounded-2xl h-14"
                >
                  <Play className="w-5 h-5" /> ابدأ التقييم الآن
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profiler"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-2xl mx-auto w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-2xl"
            >
              <DiagnosticProfiler onClose={() => setIsStarted(false)} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
