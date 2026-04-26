import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MathExerciseRenderer } from "./MathExerciseRenderer";

/* ──────────────────────────────────────────────────────────────
   KB Exercise Sidekick (enriched)
   Three tabs over the same concept context:
     • Exercises   — real problems from kb_exercises
     • Compétences — kb_skills matching the keywords
     • Erreurs     — kb_skill_errors for those skills
   Bridges the abstract visualization with concrete BAC/BEM
   practice and named pedagogical units.
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

interface KBSkill {
  id: string;
  name: string;
  name_ar: string | null;
  domain: string | null;
  subdomain: string | null;
  bloom_level: number | null;
}

interface KBSkillError {
  id: string;
  skill_id: string;
  error_description: string;
  fix_hint: string | null;
  severity: string | null;
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

type SidekickTab = "exercises" | "skills" | "errors";

export function KBExerciseSidekick({
  grade,
  chapterKeywords,
  conceptLabel,
  accent = "primary",
}: KBExerciseSidekickProps) {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<KBExercise[]>([]);
  const [skills, setSkills] = useState<KBSkill[]>([]);
  const [errors, setErrors] = useState<KBSkillError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SidekickTab>("exercises");

  const accentVar = `hsl(${ACCENT_MAP[accent]})`;

  const keywordKey = useMemo(() => chapterKeywords.join("|"), [chapterKeywords]);

  useEffect(() => {
    let cancelled = false;
    if (!chapterKeywords.length) {
      setExercises([]);
      setSkills([]);
      setErrors([]);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const orFilterEx = chapterKeywords.map((kw) => `chapter.ilike.%${kw}%`).join(",");
        const orFilterSk = chapterKeywords
          .flatMap((kw) => [`name_ar.ilike.%${kw}%`, `name.ilike.%${kw}%`])
          .join(",");

        const [exRes, skRes] = await Promise.all([
          (supabase as any)
            .from("kb_exercises")
            .select("id,text,chapter,source,type,difficulty,bloom_level")
            .eq("country_code", "DZ")
            .eq("grade", grade)
            .or(orFilterEx)
            .limit(8),
          (supabase as any)
            .from("kb_skills")
            .select("id,name,name_ar,domain,subdomain,bloom_level,grade")
            .eq("grade", grade)
            .or(orFilterSk)
            .limit(8),
        ]);

        if (exRes.error) throw exRes.error;
        if (cancelled) return;

        const cleanedEx = (exRes.data || []).filter((e: any) => {
          const t = (e.text || "").toLowerCase();
          return (
            t.length > 12 &&
            !t.includes("smoke test") &&
            !t.includes("vfre") &&
            !t.includes("test parse")
          );
        });
        const cleanedSk = (skRes.data || []) as KBSkill[];

        setExercises(cleanedEx as KBExercise[]);
        setSkills(cleanedSk);

        // Fetch errors for the discovered skills
        if (cleanedSk.length > 0) {
          const skillIds = cleanedSk.map((s) => s.id);
          const errRes = await (supabase as any)
            .from("kb_skill_errors")
            .select("id,skill_id,error_description,fix_hint,severity")
            .in("skill_id", skillIds)
            .limit(10);
          if (!cancelled && !errRes.error) {
            setErrors((errRes.data || []) as KBSkillError[]);
          }
        } else {
          setErrors([]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "تعذّر التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [grade, keywordKey]);

  const handleOpen = (ex: KBExercise) => {
    navigate(`/exercise?id=${ex.id}`);
  };

  const counts = {
    exercises: exercises.length,
    skills: skills.length,
    errors: errors.length,
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-border"
        style={{
          backgroundImage: `linear-gradient(to left, color-mix(in srgb, ${accentVar} 8%, transparent), transparent)`,
        }}
        dir="rtl"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-5 rounded-full" style={{ background: accentVar }} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-black text-foreground truncate">
              من قاعدة المعرفة
            </div>
            <div className="text-[10px] text-muted-foreground font-medium truncate">
              {conceptLabel} · {grade}
            </div>
          </div>
        </div>

        {/* Tab pills */}
        <nav className="flex gap-1" role="tablist">
          {[
            { id: "exercises" as const, label: "تمارين", count: counts.exercises },
            { id: "skills" as const, label: "كفاءات", count: counts.skills },
            { id: "errors" as const, label: "أخطاء", count: counts.errors },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className="flex-1 px-2 py-1 text-[10px] font-bold rounded-md transition-colors border"
                style={{
                  background: active ? accentVar : "transparent",
                  color: active ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                  borderColor: active ? accentVar : "hsl(var(--border))",
                }}
              >
                {t.label} {!loading && <span className="opacity-70">{t.count}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Body */}
      {loading ? (
        <div className="p-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          <div className="text-[11px] text-muted-foreground mt-2 font-medium" dir="rtl">
            جارٍ البحث في قاعدة المعرفة…
          </div>
        </div>
      ) : error ? (
        <div className="p-5 text-center text-[11px] text-muted-foreground" dir="rtl">
          تعذّر التحميل · {error}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === "exercises" && (
            <motion.div
              key="ex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-border max-h-[420px] overflow-y-auto"
            >
              {exercises.length === 0 ? (
                <EmptyState icon="📭" message={`لا توجد تمارين مرتبطة بهذا المفهوم في ${grade} حالياً`} />
              ) : (
                exercises.map((ex, idx) => {
                  const isOpen = expandedId === ex.id;
                  return (
                    <div
                      key={ex.id}
                      className="p-3 hover:bg-muted/30 transition-colors"
                      dir="rtl"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded text-foreground"
                          style={{
                            background: `color-mix(in srgb, ${accentVar} 12%, transparent)`,
                          }}
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
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {tab === "skills" && (
            <motion.div
              key="sk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-border max-h-[420px] overflow-y-auto"
            >
              {skills.length === 0 ? (
                <EmptyState icon="🎯" message="لا توجد كفاءات مرتبطة محدّدة بعد" />
              ) : (
                skills.map((sk) => (
                  <div key={sk.id} className="p-3" dir="rtl">
                    <div className="text-[12px] font-bold text-foreground leading-snug mb-0.5">
                      {sk.name_ar || sk.name}
                    </div>
                    {sk.name_ar && sk.name && (
                      <div className="text-[10px] text-muted-foreground" dir="ltr">
                        {sk.name}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {sk.subdomain && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: `color-mix(in srgb, ${accentVar} 12%, transparent)`,
                            color: accentVar,
                          }}
                        >
                          {sk.subdomain}
                        </span>
                      )}
                      {typeof sk.bloom_level === "number" && (
                        <span className="text-[9px] text-muted-foreground font-medium">
                          Bloom {sk.bloom_level}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === "errors" && (
            <motion.div
              key="err"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-border max-h-[420px] overflow-y-auto"
            >
              {errors.length === 0 ? (
                <EmptyState icon="✓" message="لا توجد أخطاء شائعة موثّقة لهذا المفهوم" />
              ) : (
                errors.map((er) => (
                  <div key={er.id} className="p-3" dir="rtl">
                    <div className="flex items-start gap-2 text-[11.5px] text-foreground leading-relaxed">
                      <span className="text-destructive font-black mt-0.5">✗</span>
                      <span className="flex-1">{er.error_description}</span>
                    </div>
                    {er.fix_hint && (
                      <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed mt-1.5">
                        <span style={{ color: accentVar }} className="font-black mt-0.5">
                          ✓
                        </span>
                        <span className="flex-1">{er.fix_hint}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="p-6 text-center" dir="rtl">
      <div className="text-2xl opacity-40 mb-1">{icon}</div>
      <div className="text-[11px] text-muted-foreground font-medium">{message}</div>
    </div>
  );
}
