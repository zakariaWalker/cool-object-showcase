import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Trophy, Timer, Eye, ArrowLeft, Play, Loader2, TrendingUp, Lock } from "lucide-react";
import { DiagnosticProfiler } from "@/components/DiagnosticProfiler";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { useCountryGrades } from "@/hooks/useCountryGrades";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/funnelTracking";
import { CountryGradePicker } from "@/components/CountryGradePicker";

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const [isStarted, setIsStarted] = useState(false);

  const { user, isAdmin } = useAuth();
  const { countryCode, gradeCode, isComplete, loading: cLoading, setCurriculum } = useUserCurriculum();

  // Local picker state for anonymous users (and admin override)
  const [pickedCountry, setPickedCountry] = useState<string>("");
  const [pickedGrade, setPickedGrade] = useState<string>("");

  const { grades, labelOf } = useCountryGrades(pickedCountry || countryCode || "DZ");

  // Authenticated users without a curriculum get sent to onboarding.
  useEffect(() => {
    if (!cLoading && user && !isComplete) {
      navigate("/onboarding?redirect=/diagnostic");
    }
  }, [cLoading, user, isComplete, navigate]);

  // Seed picker from existing curriculum once loaded
  useEffect(() => {
    if (!pickedCountry && countryCode) setPickedCountry(countryCode);
    if (!pickedGrade && gradeCode) setPickedGrade(gradeCode);
  }, [countryCode, gradeCode, pickedCountry, pickedGrade]);

  // Funnel: page view (once per mount)
  useEffect(() => {
    trackEvent("diagnostic_viewed", { authed: !!user });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const effectiveCountry = pickedCountry || countryCode;
  const effectiveGrade = pickedGrade || gradeCode;
  const canStart = !!effectiveCountry && !!effectiveGrade;


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

              {/* HERO — minimal */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent text-white shadow-2xl shadow-primary/30"
                >
                  <Eye className="w-10 h-10" />
                </motion.div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground">
                  التشخيص الذكي
                </h1>
              </div>

              {/* Country + Grade picker — required before starting */}
              <div className="max-w-xl mx-auto bg-card border-2 border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-foreground uppercase tracking-wider">
                    اختر بلدك ومستواك
                  </p>
                  {isAdmin && (
                    <span className="text-[10px] text-primary font-bold uppercase">وضع المشرف</span>
                  )}
                </div>
                <CountryGradePicker
                  countryCode={effectiveCountry || "DZ"}
                  gradeCode={effectiveGrade || ""}
                  onChange={(c, g) => {
                    setPickedCountry(c);
                    setPickedGrade(g);
                  }}
                  />
              </div>

              {/* MAIN CTA — game-like, not "start test" */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <button
                  disabled={!canStart}
                  onClick={async () => {
                    if (!canStart) return;
                    // Persist for authed users if changed
                    if (user && (effectiveCountry !== countryCode || effectiveGrade !== gradeCode)) {
                      await setCurriculum(effectiveCountry, effectiveGrade);
                    }
                    trackEvent("diagnostic_started", {
                      grade: effectiveGrade,
                      country: effectiveCountry,
                      authed: !!user,
                    });
                    setIsStarted(true);
                  }}
                  className="w-full max-w-md mx-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent text-white font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Play className="w-5 h-5 fill-white" />
                  ابدأ التحدي الآن
                  <Zap className="w-5 h-5" />
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  بدون تسجيل · بدون نقاط حقيقية · فقط متعة الاكتشاف
                </p>
                {effectiveGrade && (
                  <p className="text-center text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> {labelOf(effectiveGrade) || effectiveGrade}
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
                level={effectiveGrade || "4AM"}
                countryCode={effectiveCountry || "DZ"}
                onClose={() => setIsStarted(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
