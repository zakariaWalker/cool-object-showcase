import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Brain, Zap, Target, ArrowLeft, Play, Loader2, Lock } from "lucide-react";
import { DiagnosticProfiler } from "@/components/DiagnosticProfiler";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { useCountryGrades } from "@/hooks/useCountryGrades";
import { useAuth } from "@/hooks/useAuth";

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const { isAdmin } = useAuth();
  const { countryCode, gradeCode, isComplete, loading: cLoading, setCurriculum } = useUserCurriculum();
  const { grades, labelOf, cycles } = useCountryGrades(countryCode || "DZ");
  const [pendingGrade, setPendingGrade] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth?redirect=/diagnostic");
        return;
      }
      setSignedIn(true);
      setIsCheckingAuth(false);
    })();
  }, [navigate]);

  // If user has no curriculum yet, push them to onboarding
  useEffect(() => {
    if (!cLoading && signedIn && !isComplete) {
      navigate("/onboarding?redirect=/diagnostic");
    }
  }, [cLoading, signedIn, isComplete, navigate]);

  // Default the picker to user's grade
  useEffect(() => {
    if (!pendingGrade && gradeCode) setPendingGrade(gradeCode);
  }, [gradeCode, pendingGrade]);

  if (isCheckingAuth || cLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group grades by cycle for cleaner UX
  const byCycle: Record<string, typeof grades> = {};
  grades.forEach(g => {
    const k = g.cycle || "other";
    (byCycle[k] = byCycle[k] || []).push(g);
  });
  const cycleLabel: Record<string, string> = {
    primary: "ابتدائي", middle: "متوسط/إعدادي", secondary: "ثانوي", other: "مستويات أخرى",
  };

  return (
    <div className="h-full w-full bg-background overflow-y-auto" dir="rtl">
      <div className="max-w-3xl mx-auto p-6 md:p-12 min-h-screen flex flex-col justify-center">

        <AnimatePresence mode="wait">
          {!isStarted ? (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-12">
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
                  مُعدّ خصيصاً لمنهج <strong className="text-foreground">{countryCode === "DZ" ? "الجزائر 🇩🇿" : countryCode === "OM" ? "سلطنة عُمان 🇴🇲" : countryCode}</strong>
                  {" "}— نقيس كيف تفكر، كيف تتعامل مع الفخاخ، ومستوى ثقتك بنفسك.
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
                  <h3 className="font-bold text-foreground mb-1">يقيس وفق منهج بلدك</h3>
                  <p className="text-sm text-muted-foreground">المهارات المختارة من قاعدة معرفة منهج {countryCode === "DZ" ? "الجزائر" : "عُمان"} الرسمي.</p>
                </div>
              </div>

              {/* Level — locked for students, editable for admins */}
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">مستواك الحالي</p>
                  {isAdmin && (
                    <span className="text-[10px] text-primary font-bold uppercase">وضع المشرف</span>
                  )}
                </div>

                {!isAdmin ? (
                  // Locked badge for students — level comes from registered profile, cannot be changed here
                  <div className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-primary/5 border-2 border-primary/20">
                    <Lock className="w-5 h-5 text-primary/60" />
                    <div className="text-center">
                      <div className="text-lg font-black text-primary">{labelOf(gradeCode) || gradeCode}</div>
                      <div className="text-[10px] text-muted-foreground font-bold mt-0.5">
                        المستوى المسجَّل في حسابك
                      </div>
                    </div>
                  </div>
                ) : cycles.length > 1 ? (
                  <div className="space-y-3">
                    {cycles.map(cyc => (
                      <div key={cyc}>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground/70 mb-1.5">{cycleLabel[cyc] || cyc}</p>
                        <div className="flex flex-wrap gap-2">
                          {(byCycle[cyc] || []).map(g => (
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
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {grades.map(g => (
                      <button
                        key={g.grade_code}
                        onClick={() => setPendingGrade(g.grade_code)}
                        className={`px-4 py-3 rounded-xl border-2 font-black transition-all text-sm ${
                          pendingGrade === g.grade_code ? "border-primary bg-primary/10 text-primary scale-105" : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {g.grade_label_ar}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-12">
                <Button
                  size="lg"
                  disabled={!pendingGrade && !gradeCode}
                  onClick={async () => {
                    // Students always use registered grade. Only admins may switch.
                    const finalGrade = isAdmin ? (pendingGrade || gradeCode) : gradeCode;
                    if (isAdmin && pendingGrade && pendingGrade !== gradeCode) {
                      await setCurriculum(countryCode, pendingGrade);
                    }
                    setPendingGrade(finalGrade);
                    setIsStarted(true);
                  }}
                  className="gap-3 px-8 text-lg font-bold rounded-2xl h-14"
                >
                  <Play className="w-5 h-5" /> ابدأ التقييم المخصص ({labelOf(isAdmin ? (pendingGrade || gradeCode) : gradeCode) || gradeCode})
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
