import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Trophy, Timer, Eye, ArrowLeft, Play, Loader2, TrendingUp, Lock } from "lucide-react";
import { DiagnosticProfiler } from "@/components/DiagnosticProfiler";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { useCountryGrades } from "@/hooks/useCountryGrades";
import { useAuth } from "@/hooks/useAuth";

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);

  const { user, isAdmin } = useAuth();
  const { countryCode, gradeCode, isComplete, loading: cLoading, setCurriculum } = useUserCurriculum();
  const { grades, labelOf } = useCountryGrades(countryCode || "DZ");
  const [pendingGrade, setPendingGrade] = useState<string>("");

  // Authenticated users without a curriculum get sent to onboarding.
  // Anonymous users default to DZ / 4AM and can try the diagnostic without signup.
  useEffect(() => {
    if (!cLoading && user && !isComplete) {
      navigate("/onboarding?redirect=/diagnostic");
    }
  }, [cLoading, user, isComplete, navigate]);

  useEffect(() => {
    if (!pendingGrade && gradeCode) setPendingGrade(gradeCode);
  }, [gradeCode, pendingGrade]);

  if (cLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              className="space-y-10"
            >
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 ml-1" /> العودة
              </button>

              {/* HERO — curiosity-driven, not "test" */}
              <div className="text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent text-white shadow-2xl shadow-primary/30"
                >
                  <Eye className="w-12 h-12" />
                </motion.div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> تحدي مجاني · 3 دقائق فقط
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight">
                    وين تقدر <span className="text-primary">توصل</span><br />في الرياضيات؟
                  </h1>
                  <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed pt-2">
                    شوف الحقيقة اللي ما يقولهالك حد —<br />
                    <strong className="text-foreground">واش يخليك تخسر النقاط في الامتحان؟</strong>
                  </p>
                </div>
              </div>

              {/* WHAT YOU GET — instant rewards, not vague benefits */}
              <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
                {[
                  { icon: Timer, label: "3 دقائق", sub: "بسرعة", color: "text-cyan-600", bg: "bg-cyan-500/10" },
                  { icon: TrendingUp, label: "نتيجة فورية", sub: "مع تفسير", color: "text-emerald-600", bg: "bg-emerald-500/10" },
                  { icon: Trophy, label: "+100 XP", sub: "هدية ضمان", color: "text-amber-600", bg: "bg-amber-500/10" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="bg-card border border-border rounded-2xl p-4 text-center"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mx-auto mb-2`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-black text-foreground">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground font-bold mt-0.5">{item.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* SOCIAL PROOF — comparison hook */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-2xl p-5 max-w-xl mx-auto"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {["🎯", "🔥", "⚡", "💎"].map((e, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-sm shadow">
                        {e}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-foreground/80 font-bold">
                    أكثر من <span className="text-primary font-black">2,400 تلميذ</span> اكتشفوا مستواهم هذا الأسبوع
                  </div>
                </div>
              </motion.div>

              {/* Admin-only grade switcher */}
              {isAdmin && (
                <div className="max-w-xl mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">المستوى</p>
                    <span className="text-[10px] text-primary font-bold uppercase">وضع المشرف</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {grades.map(g => (
                      <button
                        key={g.grade_code}
                        onClick={() => setPendingGrade(g.grade_code)}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                          pendingGrade === g.grade_code ? "border-primary bg-primary/10 text-primary scale-105" : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {g.grade_label_ar}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MAIN CTA — game-like, not "start test" */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <button
                  disabled={!pendingGrade && !gradeCode}
                  onClick={async () => {
                    const finalGrade = isAdmin ? (pendingGrade || gradeCode) : gradeCode;
                    if (isAdmin && pendingGrade && pendingGrade !== gradeCode) {
                      await setCurriculum(countryCode, pendingGrade);
                    }
                    setPendingGrade(finalGrade);
                    setIsStarted(true);
                  }}
                  className="w-full max-w-md mx-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent text-white font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Play className="w-5 h-5 fill-white" />
                  ابدأ التحدي الآن
                  <Zap className="w-5 h-5" />
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  بدون تسجيل · بدون نقاط حقيقية · فقط متعة الاكتشاف
                </p>
                {!isAdmin && gradeCode && (
                  <p className="text-center text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> {labelOf(gradeCode) || gradeCode}
                  </p>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="profiler"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-2xl mx-auto w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-2xl"
            >
              <DiagnosticProfiler
                level={pendingGrade || gradeCode || "4AM"}
                countryCode={countryCode || "DZ"}
                onClose={() => setIsStarted(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
