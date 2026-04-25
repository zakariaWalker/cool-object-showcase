import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExerciseWorkspace } from "@/components/ExerciseWorkspace";
import { ExerciseLibrary } from "@/components/ExerciseLibrary";
import { ImadrassaExercise } from "@/engine/dataset-types";
import { initTMA, loadQuestionFromTMA, resolveQuestionId, syncStudentData } from "@/lib/tma";
import { Sparkles, BookOpen } from "lucide-react";

function detectTMA(): boolean {
  if ((window as any)?.Telegram?.WebApp) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.has("tma_id") || params.has("id")) return true;
  return false;
}

const ExercisePage = () => {
  const navigate = useNavigate();
  const [preloadedExercise, setPreloadedExercise] = useState<ImadrassaExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [tmaMode, setTmaMode] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        initTMA();
        const isTma = detectTMA();

        if (isTma) {
          const qid = resolveQuestionId();
          if (!qid) {
            setTmaMode(false);
            setLoading(false);
            return;
          }
          setTmaMode(true);
          syncStudentData().catch(() => {});
          const exercise = await loadQuestionFromTMA();
          if (exercise) {
            setPreloadedExercise(exercise);
          } else {
            setFetchError(`تعذّر تحميل التمرين (${qid}). تحقق من الاتصال وأعد المحاولة.`);
          }
        }
      } catch (err) {
        setFetchError("خطأ غير متوقع أثناء تحميل التمرين.");
        console.error("[ExercisePage] init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Full-screen loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground" dir="rtl">
          جارٍ تحميل التمارين…
        </p>
      </div>
    );
  }

  // TMA error
  if (tmaMode && fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background" dir="rtl">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-lg font-extrabold text-foreground">تعذّر تحميل التمرين</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-7 py-3 bg-accent text-accent-foreground rounded-xl text-sm font-bold"
        >
          إعادة المحاولة 🔄
        </button>
      </div>
    );
  }

  // TMA mode keeps the full Telegram experience
  if (tmaMode) {
    return <ExerciseWorkspace preloadedExercise={preloadedExercise} isTelegramMode={true} />;
  }

  // ── Student web experience: clean, single-column, library-first ─────────
  const handlePick = (exercise: any) => {
    const id = exercise?._kb?.id;
    if (id) {
      navigate(`/solve/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-foreground mb-1">التمارين</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                اختر تمريناً لتحلّه خطوة بخطوة مع المدرّس التفاعلي.
              </p>
            </div>
          </div>

          {/* Hint chip */}
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>اضغط على أي تمرين لبدء الحل التفاعلي</span>
          </div>
        </div>
      </div>

      {/* Library — the only thing the student sees */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <ExerciseLibrary onSelectExercise={handlePick} />
        </div>
      </div>
    </div>
  );
};

export default ExercisePage;
