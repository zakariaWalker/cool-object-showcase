import { useEffect, useState } from "react";
import { ExerciseWorkspace } from "@/components/ExerciseWorkspace";
import { ImadrassaExercise } from "@/engine/dataset-types";
import { initTMA, loadQuestionFromTMA, resolveQuestionId, syncStudentData } from "@/lib/tma";

function detectTMA(): boolean {
  if ((window as any)?.Telegram?.WebApp) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.has("tma_id") || params.has("id")) return true;
  // try { if (sessionStorage.getItem("_tma_question_id")) return true; } catch { /* */ }
  return false;
}
const ExercisePage = () => {
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
          // Sync localStorage ↔ Supabase in background (non-blocking)
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

  // Full-screen loading while fetching
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100vh", background: "hsl(var(--background))", gap: 12,
      }}>
        <div style={{ fontSize: 36, animation: "spin 1s linear infinite" }}>⚙️</div>
        <p style={{ fontSize: 14, color: "hsl(var(--foreground))", fontWeight: 600 }} dir="rtl">
          جارٍ تحميل التمرين…
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Error state — shown when fetch failed, with a retry button
  if (tmaMode && fetchError) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "100vh", background: "hsl(var(--background))",
        padding: "0 24px", gap: 16, textAlign: "center",
      }} dir="rtl">
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "hsl(var(--foreground))", margin: 0 }}>
          تعذّر تحميل التمرين
        </h2>
        <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", maxWidth: 280, lineHeight: 1.7, margin: 0 }}>
          {fetchError}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: "12px 28px",
            background: "hsl(var(--accent))",
            color: "hsl(var(--accent-foreground))", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}
        >
          إعادة المحاولة 🔄
        </button>
      </div>
    );
  }

  return (
    <ExerciseWorkspace
      preloadedExercise={preloadedExercise}
      isTelegramMode={tmaMode}
    />
  );
};

export default ExercisePage;
