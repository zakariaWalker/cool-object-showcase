import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MathExerciseRenderer } from "./MathExerciseRenderer";

/* ──────────────────────────────────────────────────────────────
   KB Exercise Sidekick
   Pulls real exercises from kb_exercises that match the active
   concept the student is exploring. Bridges the abstract
   visualization with concrete BAC/BEM practice problems.
   ──────────────────────────────────────────────────────────── */

interface KBExercise {
  id: string;
  text: string;
  chapter: string;
  source: string | null;
  type: string | null;
  difficulty: number | null;
  bloom_level: number | null;
}

interface KBExerciseSidekickProps {
  /** Grade key as stored in kb_exercises (e.g. "4AM", "1AS", "3AS"). */
  grade: string;
  /** Arabic chapter keywords; ANY match (ILIKE) qualifies an exercise. */
  chapterKeywords: string[];
  /** Optional concept title shown in the panel header. */
  conceptLabel: string;
  /** Optional accent color token (defaults to primary). */
  accent?: "primary" | "geometry" | "statistics" | "probability" | "functions" | "algebra";
}

const ACCENT_MAP: Record<NonNullable<KBExerciseSidekickProps["accent"]>, string> = {
  primary: "var(--primary)",
  geometry: "var(--geometry)",
  statistics: "var(--statistics)",
  probability: "var(--probability)",
  functions: "var(--functions)",
  algebra: "var(--algebra)",
};

export function KBExerciseSidekick({
  grade,
  chapterKeywords,
  conceptLabel,
  accent = "primary",
}: KBExerciseSidekickProps) {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<KBExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const accentVar = `hsl(${ACCENT_MAP[accent]})`;

  // Stable key for effect dep
  const keywordKey = useMemo(() => chapterKeywords.join("|"), [chapterKeywords]);

  useEffect(() => {
    let cancelled = false;
    if (!chapterKeywords.length) {
      setExercises([]);
      setLoading(false);
      return;
    }

    const fetchExercises = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build OR ILIKE query across all keywords
        const orFilter = chapterKeywords
          .map((kw) => `chapter.ilike.%${kw}%`)
          .join(",");

        const { data, error: err } = await (supabase as any)
          .from("kb_exercises")
          .select("id,text,chapter,source,type,difficulty,bloom_level")
          .eq("country_code", "DZ")
          .eq("grade", grade)
          .or(orFilter)
          .limit(8);

        if (err) throw err;
        if (cancelled) return;

        // Filter out obvious test/seed rows
        const cleaned = (data || []).filter((e: any) => {
          const t = (e.text || "").toLowerCase();
          return (
            t.length > 12 &&
            !t.includes("smoke test") &&
            !t.includes("vfre") &&
            !t.includes("test parse")
          );
        });

        setExercises(cleaned as KBExercise[]);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "تعذّر التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExercises();
    return () => {
      cancelled = true;
    };
  }, [grade, keywordKey]);

  const handleOpen = (ex: KBExercise) => {
    navigate(`/exercise?id=${ex.id}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center justify-between"
        style={{
          background: `linear-gradient(to left, ${accentVar.replace("hsl(", "hsl(")} / 0.06, transparent)`,
          // Tailwind cant do dynamic alpha through CSS var here; fallback inline:
          backgroundImage: `linear-gradient(to left, color-mix(in srgb, ${accentVar} 8%, transparent), transparent)`,
        }}
        dir="rtl"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-5 rounded-full"
            style={{ background: accentVar }}
          />
          <div>
            <div className="text-[12px] font-black text-foreground">
              تمارين من المنهاج
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {conceptLabel} · {grade}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground font-bold">
          {loading ? "…" : `${exercises.length} تمرين`}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          <div className="text-[11px] text-muted-foreground mt-2 font-medium" dir="rtl">
            جارٍ البحث عن تمارين…
          </div>
        </div>
      ) : error ? (
        <div className="p-5 text-center text-[11px] text-muted-foreground" dir="rtl">
          تعذّر التحميل · {error}
        </div>
      ) : exercises.length === 0 ? (
        <div className="p-5 text-center" dir="rtl">
          <div className="text-2xl opacity-40 mb-1">📭</div>
          <div className="text-[11px] text-muted-foreground font-medium">
            لا توجد تمارين مرتبطة بهذا المفهوم في {grade} حالياً
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {exercises.map((ex, idx) => {
              const isOpen = expandedId === ex.id;
              return (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-3 hover:bg-muted/30 transition-colors"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded text-foreground"
                      style={{ background: `color-mix(in srgb, ${accentVar} 12%, transparent)` }}
                    >
                      #{idx + 1}
                    </span>
                    {ex.source && (
                      <span className="text-[9px] text-muted-foreground font-bold">
                        {ex.source}
                      </span>
                    )}
                    {typeof ex.bloom_level === "number" && (
                      <span className="text-[9px] text-muted-foreground font-medium ml-auto">
                        Bloom {ex.bloom_level}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11.5px] leading-relaxed text-foreground ${
                      isOpen ? "" : "line-clamp-2"
                    }`}
                  >
                    <MathExerciseRenderer text={ex.text} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleOpen(ex)}
                      className="px-2.5 py-1 rounded text-[10px] font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                      style={{ background: accentVar }}
                    >
                      حلّ التمرين ←
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId((prev) => (prev === ex.id ? null : ex.id))
                      }
                      className="px-2.5 py-1 rounded text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors border border-border"
                    >
                      {isOpen ? "إخفاء" : "عرض كامل"}
                    </button>
                    <span className="text-[9px] text-muted-foreground/70 ml-auto truncate max-w-[140px]">
                      {ex.chapter}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
