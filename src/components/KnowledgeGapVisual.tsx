import { motion } from "framer-motion";
import { KnowledgeBase } from "@/engine/knowledge/types";
import { ParsedExercise } from "@/engine/exercise-parser";
import { Brain, Zap, AlertCircle, Sparkles } from "lucide-react";
import { getExpressionSignature } from "@/engine/knowledge/analyzer";

interface KnowledgeGapVisualProps {
  exercise: ParsedExercise;
  kb: KnowledgeBase;
  onJumpToKB: (gapId: string) => void;
  onTrainGap?: (gapId: string) => void;
}

export function KnowledgeGapVisual({ exercise, kb, onJumpToKB, onTrainGap }: KnowledgeGapVisualProps) {
  const sig = exercise.semanticObjects.expressions[0] 
    ? getExpressionSignature(exercise.semanticObjects.expressions[0])
    : exercise.classification.subdomain;
    
  const gap = kb.learningGaps.find(g => g.signature === sig);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/60 border border-white/5 p-12 text-center min-h-[450px] flex flex-col items-center justify-center">
      {/* Background Neural Map (Dotted Grid) */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Animated Connections (Lines) */}
      <svg className="absolute inset-0 w-full h-full opacity-5 pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <motion.line
                key={i}
                x1={`${Math.random() * 100}%`} y1={`${Math.random() * 100}%`}
                x2="50%" y2="50%"
                stroke="white" strokeWidth="1"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
            />
        ))}
      </svg>

      {/* Central "Void" / Gap Analysis */}
      <div className="relative z-10 max-w-md w-full">
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-white/10"
        >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <Brain className="w-10 h-10 text-primary opacity-80" />
            
            {/* The "Gap" marker */}
            <motion.div 
                className="absolute -top-2 -right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center border-4 border-black shadow-lg"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <AlertCircle className="w-4 h-4 text-white" />
            </motion.div>
        </motion.div>

        <h3 className="text-[26px] font-bold text-foreground mb-4 leading-tight tracking-tight">نقطة عمياء في المحرك 🧠</h3>
        <p className="text-[15px] text-muted-foreground/80 leading-relaxed mb-10 text-balance" dir="rtl">
            تم تحليل تمرينك بنجاح، لكن هذا النمط الرياضي يمثل "فجوة" في قاعدة معرفتي الحالية. سأحتاج لتعلم قواعد جديدة لحل هذا النوع من المسائل مستقبلاً.
        </p>

        {/* Gap Details Card */}
        <div className="space-y-3 text-right">
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                <span className="text-[13px] font-mono text-primary/90 font-bold bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                    {sig.length > 20 ? sig.substring(0, 18) + "..." : sig}
                </span>
                <div className="text-right">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">نمط غير مكتشف</div>
                    <div className="text-[10px] text-muted-foreground/40 mt-0.5">Signature Identifier</div>
                </div>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold text-foreground">{gap?.frequency || 1}</span>
                    <span className="text-[12px] text-muted-foreground">مرات الظهور اليوم</span>
                </div>
                <div className="text-right">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">إحصائيات الفجوة</div>
                    <div className="text-[10px] text-muted-foreground/40 mt-0.5">Frequency Metrics</div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onTrainGap?.(gap?.id || sig)}
                className="py-4 bg-primary text-primary-foreground rounded-2xl text-[14px] font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 border border-primary/20"
            >
                <Sparkles className="w-4 h-4" />
                تدريب المحرك الآن
            </motion.button>

            <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onJumpToKB(gap?.id || sig)}
                className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[14px] font-bold transition-all border border-white/10 flex items-center justify-center gap-3 backdrop-blur-xl"
            >
                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                استكشاف في الخريطة
            </motion.button>
        </div>
        <p className="mt-6 text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">Topology::Neural_Gap_Marker #gap-{sig.substring(0,4)}</p>
      </div>

      {/* Grid of Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full ${i % 5 === 0 ? 'bg-destructive/60' : 'bg-primary/20'}`}
                style={{ 
                    left: `${Math.random() * 100}%`, 
                    top: `${Math.random() * 100}%` 
                }}
                animate={{ 
                    opacity: [0.1, 0.4, 0.1],
                    y: [0, Math.random() * 50 - 25, 0]
                }}
                transition={{ duration: 5 + Math.random() * 5, repeat: Infinity }}
            />
          ))}
      </div>
    </div>
  );
}
