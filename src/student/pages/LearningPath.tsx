import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { useUserCurriculum } from "@/hooks/useUserCurriculum"; // FIX: was useAuth
import { motion, AnimatePresence } from "framer-motion";

interface Exercise {
  id: string;
  text: string;
  type: string;
  grade: string;
}
interface Pattern {
  id: string;
  name: string;
  type: string;
  steps: string[];
  concepts: string[];
}
interface Deconstruction {
  exercise_id: string;
  pattern_id: string;
  needs: string[];
  steps: string[];
}

// kb_exercises.grade uses old-format keys
const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM",
  middle_2: "2AM",
  middle_3: "3AM",
  middle_4: "4AM",
  secondary_1: "1AS",
  secondary_2: "2AS",
  secondary_3: "3AS",
};

const GRADE_ORDER = ["middle_1", "middle_2", "middle_3", "middle_4", "secondary_1", "secondary_2", "secondary_3"];

// FIX: reverse map from new grade_code format ("4AM") to old KB key ("middle_4")
const GRADE_CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(GRADE_LABELS).map(([k, v]) => [v, k]),
);

const TYPE_LABELS: Record<string, string> = {
  arithmetic: "حساب",
  algebra: "جبر",
  fractions: "كسور",
  equations: "معادلات",
  geometry_construction: "هندسة",
  statistics: "إحصاء",
  probability: "احتمالات",
  functions: "دوال",
  trigonometry: "مثلثات",
  sequences: "متتاليات",
  calculus: "تحليل",
  systems: "جمل معادلات",
  proportionality: "تناسبية",
  transformations: "تحويلات",
};

import { Lightbulb, MessageSquare, Brain } from "lucide-react";

function ExerciseItem({ ex, isCompleted, onToggle }: { ex: Exercise; isCompleted: boolean; onToggle: () => void }) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="relative group">
      <div
        onClick={onToggle}
        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border bg-card hover:shadow-md"
        style={{
          background: isCompleted ? "hsl(var(--primary) / 0.04)" : "hsl(var(--card))",
          borderColor: isCompleted ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border))",
        }}
      >
        <div
          className="w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 transition-all"
          style={{
            borderColor: isCompleted ? "hsl(var(--primary))" : "hsl(var(--border))",
            background: isCompleted ? "hsl(var(--primary))" : "transparent",
            color: isCompleted ? "hsl(var(--primary-foreground))" : "transparent",
          }}
        >
          {isCompleted && "✓"}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-xs text-foreground font-medium leading-relaxed"
            style={{
              textDecoration: isCompleted ? "line-through" : "none",
              opacity: isCompleted ? 0.6 : 1,
            }}
          >
            <MathExerciseRenderer text={ex.text} />
          </div>

          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2 overflow-hidden"
              >
                <Brain size={12} className="text-primary mt-0.5" />
                <p className="text-[10px] text-primary/80 font-bold leading-tight">
                  تلميح: حاول البدء بتحديد المجهول الأساسي أولاً (عادة ما يكون أصغر طول) ثم عبّر عن البقية بدلالته.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowHint(!showHint);
            }}
            className={`p-1.5 rounded-lg transition-all ${showHint ? "bg-primary text-primary-foreground shadow-inner" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"}`}
            title="تلميح للتفكير"
          >
            <Lightbulb size={14} />
          </button>
          <a
            href={`/tutor`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-black hover:bg-primary/20 transition-all"
          >
            <MessageSquare size={12} />
            شرح
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LearningPath() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [deconstructions, setDeconstructions] = useState<Deconstruction[]>([]);
  const [loading, setLoading] = useState(true);

  // FIX: was useAuth().profile?.grade (old format, empty for new users)
  // Now uses useUserCurriculum() which reads grade_code ("4AM") and maps to old KB key
  const { gradeCode } = useUserCurriculum();
  const defaultGradeKey = GRADE_CODE_TO_KEY[gradeCode] || "middle_4";
  const [selectedGrade, setSelectedGrade] = useState(defaultGradeKey);
  const [selectedType, setSelectedType] = useState("");
  const [completedExIds, setCompletedExIds] = useState<Set<string>>(new Set());

  // FIX: sync selectedGrade when gradeCode loads from Supabase (async)
  useEffect(() => {
    if (gradeCode && GRADE_CODE_TO_KEY[gradeCode]) {
      setSelectedGrade(GRADE_CODE_TO_KEY[gradeCode]);
    }
  }, [gradeCode]);

  useEffect(() => {
    loadData();
  }, []);

  // Log learning path visit so Home.tsx can detect it
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("student_activity_log")
        .insert({
          student_id: user.id,
          action: "learning_path_opened",
          xp_earned: 0,
          metadata: { grade: selectedGrade },
        })
        .then(() => {})
        .catch(() => {});
    })();
  }, []); // once on mount

  async function loadData() {
    setLoading(true);
    const PAGE = 1000;
    const allEx: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("kb_exercises")
        .select("*")
        .order("grade")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allEx.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const allDecon: any[] = [];
    from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("kb_deconstructions")
        .select("*")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allDecon.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const { data: pats } = await (supabase as any).from("kb_patterns").select("*");
    setExercises(allEx.map((e: any) => ({ id: e.id, text: e.text, type: e.type || "", grade: e.grade || "" })));
    setPatterns(
      (pats || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type || "",
        steps: p.steps || [],
        concepts: p.concepts || [],
      })),
    );
    setDeconstructions(
      allDecon.map((d: any) => ({
        exercise_id: d.exercise_id,
        pattern_id: d.pattern_id,
        needs: d.needs || [],
        steps: d.steps || [],
      })),
    );
    setLoading(false);
  }

  const types = useMemo(() => {
    const typeSet = new Set(
      exercises
        .filter((e) => e.grade === selectedGrade)
        .map((e) => e.type)
        .filter((t) => t && t !== "unclassified"),
    );
    return [...typeSet].sort();
  }, [exercises, selectedGrade]);

  const learningPath = useMemo(() => {
    const deconMap = new Map<string, Deconstruction[]>();
    deconstructions.forEach((d) => {
      const list = deconMap.get(d.exercise_id) || [];
      list.push(d);
      deconMap.set(d.exercise_id, list);
    });

    const filtered = exercises.filter((e) => {
      if (e.grade !== selectedGrade) return false;
      if (selectedType && e.type !== selectedType) return false;
      return deconMap.has(e.id);
    });

    const patternGroups = new Map<string, { pattern: Pattern; exercises: Exercise[]; avgNeeds: number }>();
    filtered.forEach((ex) => {
      const decons = deconMap.get(ex.id) || [];
      decons.forEach((d) => {
        const pat = patterns.find((p) => p.id === d.pattern_id);
        if (!pat) return;
        const group = patternGroups.get(pat.id) || { pattern: pat, exercises: [], avgNeeds: 0 };
        group.exercises.push(ex);
        group.avgNeeds = d.needs?.length || 0;
        patternGroups.set(pat.id, group);
      });
    });

    return [...patternGroups.values()].sort((a, b) => a.avgNeeds - b.avgNeeds);
  }, [exercises, patterns, deconstructions, selectedGrade, selectedType]);

  const totalExercises = learningPath.reduce((sum, g) => sum + g.exercises.length, 0);
  const completedCount = learningPath.reduce(
    (sum, g) => sum + g.exercises.filter((e) => completedExIds.has(e.id)).length,
    0,
  );
  const progress = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const toggleComplete = (id: string) => {
    setCompletedExIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">جاري بناء مسار التعلم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background" dir="rtl">
      {/* Header */}
      <div
        className="border-b border-border px-6 py-8"
        style={{
          background:
            "linear-gradient(to left, hsl(var(--geometry) / 0.12), hsl(var(--geometry) / 0.04), hsl(var(--background)))",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📚</span>
            <h1 className="text-2xl font-black text-foreground">مسار التعلم</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            تسلسل تمارين مرتب حسب التعقيد — من الأسهل إلى الأصعب — بناءً على المفاهيم المطلوبة
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {GRADE_ORDER.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setSelectedGrade(g);
                  setSelectedType("");
                }}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all border"
                style={{
                  background: selectedGrade === g ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: selectedGrade === g ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  borderColor: selectedGrade === g ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
              >
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs"
          >
            <option value="">كل الأنواع</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>

        {/* Progress bar */}
        <div className="mb-8 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground">تقدمك في {GRADE_LABELS[selectedGrade]}</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>
              {completedCount} / {totalExercises} تمرين
            </span>
            <span>{learningPath.length} نمط</span>
          </div>
        </div>

        {/* Learning path timeline */}
        <div className="space-y-6">
          {learningPath.map((group, gi) => {
            const groupCompleted = group.exercises.filter((e) => completedExIds.has(e.id)).length;
            const groupDone = groupCompleted === group.exercises.length;

            return (
              <div key={gi} className="relative">
                {gi < learningPath.length - 1 && (
                  <div className="absolute right-[19px] top-[48px] bottom-[-24px] w-0.5 bg-border" />
                )}

                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2"
                      style={{
                        background: groupDone ? "hsl(var(--primary))" : "hsl(var(--card))",
                        color: groupDone ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                        borderColor: groupDone ? "hsl(var(--primary))" : "hsl(var(--border))",
                      }}
                    >
                      {groupDone ? "✓" : gi + 1}
                    </div>
                  </div>

                  <div
                    className="flex-1 p-4 rounded-xl border border-border bg-card shadow-sm"
                    style={{
                      background: [
                        "linear-gradient(135deg, hsl(var(--statistics) / 0.06), hsl(var(--card)))",
                        "linear-gradient(135deg, hsl(var(--algebra) / 0.06), hsl(var(--card)))",
                        "linear-gradient(135deg, hsl(var(--geometry) / 0.06), hsl(var(--card)))",
                        "linear-gradient(135deg, hsl(var(--probability) / 0.06), hsl(var(--card)))",
                        "linear-gradient(135deg, hsl(var(--accent) / 0.06), hsl(var(--card)))",
                        "linear-gradient(135deg, hsl(var(--functions) / 0.06), hsl(var(--card)))",
                      ][gi % 6],
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                          {group.pattern.name}
                          {!groupDone && gi === 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                          )}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                            {TYPE_LABELS[group.pattern.type] || group.pattern.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {groupCompleted}/{group.exercises.length} تمرين
                          </span>
                        </div>
                      </div>
                      {group.pattern.concepts && group.pattern.concepts.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {group.pattern.concepts.slice(0, 4).map((c, ci) => (
                            <span
                              key={ci}
                              className="text-[9px] px-2 py-1 rounded-lg bg-card border border-border/50 text-muted-foreground font-bold shadow-sm flex items-center gap-1"
                            >
                              <Brain size={10} className="text-primary/40" />
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {group.pattern.steps.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                        {group.pattern.steps.map((s, si) => (
                          <div
                            key={si}
                            className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all shadow-subtle min-h-[40px]"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                              {si + 1}
                            </span>
                            <span className="text-[10px] text-foreground leading-tight font-medium">{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      {group.exercises.slice(0, 5).map((ex) => (
                        <ExerciseItem
                          key={ex.id}
                          ex={ex}
                          isCompleted={completedExIds.has(ex.id)}
                          onToggle={() => toggleComplete(ex.id)}
                        />
                      ))}
                      {group.exercises.length > 5 && (
                        <div className="text-[10px] text-muted-foreground text-center py-1">
                          +{group.exercises.length - 5} تمرين إضافي
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {learningPath.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-4xl mb-4">📚</div>
            <p>لا توجد تمارين مفكّكة لهذا المستوى بعد. يجب تفكيك التمارين أولاً من لوحة الإدارة.</p>
          </div>
        )}
      </div>
    </div>
  );
}
