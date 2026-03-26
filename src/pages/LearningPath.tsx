import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseRenderer } from "@/components/ExerciseRenderer";

interface Exercise {
  id: string; text: string; type: string; grade: string;
}
interface Pattern {
  id: string; name: string; type: string; steps: string[]; concepts: string[];
}
interface Deconstruction {
  exercise_id: string; pattern_id: string; needs: string[]; steps: string[];
}

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};

const GRADE_ORDER = ["middle_1", "middle_2", "middle_3", "middle_4", "secondary_1", "secondary_2", "secondary_3"];

const TYPE_LABELS: Record<string, string> = {
  arithmetic: "حساب", algebra: "جبر", fractions: "كسور", equations: "معادلات",
  geometry_construction: "هندسة", statistics: "إحصاء", probability: "احتمالات",
  functions: "دوال", trigonometry: "مثلثات", sequences: "متتاليات", calculus: "تحليل",
  systems: "جمل معادلات", proportionality: "تناسبية", transformations: "تحويلات",
};

export default function LearningPath() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [deconstructions, setDeconstructions] = useState<Deconstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState("middle_1");
  const [selectedType, setSelectedType] = useState("");
  const [completedExIds, setCompletedExIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const PAGE = 1000;
    const allEx: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase.from("kb_exercises").select("*").order("grade").range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allEx.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const allDecon: any[] = [];
    from = 0;
    while (true) {
      const { data } = await supabase.from("kb_deconstructions").select("*").range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      allDecon.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const { data: pats } = await supabase.from("kb_patterns").select("*");
    setExercises(allEx.map((e: any) => ({ id: e.id, text: e.text, type: e.type || "", grade: e.grade || "" })));
    setPatterns((pats || []).map((p: any) => ({ id: p.id, name: p.name, type: p.type || "", steps: p.steps || [], concepts: p.concepts || [] })));
    setDeconstructions(allDecon.map((d: any) => ({ exercise_id: d.exercise_id, pattern_id: d.pattern_id, needs: d.needs || [], steps: d.steps || [] })));
    setLoading(false);
  }

  const types = useMemo(() => {
    const typeSet = new Set(exercises.filter(e => e.grade === selectedGrade).map(e => e.type).filter(t => t && t !== "unclassified"));
    return [...typeSet].sort();
  }, [exercises, selectedGrade]);

  // Build learning path: group exercises by pattern, ordered by dependency (needs)
  const learningPath = useMemo(() => {
    const deconMap = new Map<string, Deconstruction[]>();
    deconstructions.forEach(d => {
      const list = deconMap.get(d.exercise_id) || [];
      list.push(d);
      deconMap.set(d.exercise_id, list);
    });

    // Filter exercises by grade and type
    const filtered = exercises.filter(e => {
      if (e.grade !== selectedGrade) return false;
      if (selectedType && e.type !== selectedType) return false;
      return deconMap.has(e.id); // Only deconstructed exercises
    });

    // Group by pattern
    const patternGroups = new Map<string, { pattern: Pattern; exercises: Exercise[]; avgNeeds: number }>();
    filtered.forEach(ex => {
      const decons = deconMap.get(ex.id) || [];
      decons.forEach(d => {
        const pat = patterns.find(p => p.id === d.pattern_id);
        if (!pat) return;
        const group = patternGroups.get(pat.id) || { pattern: pat, exercises: [], avgNeeds: 0 };
        group.exercises.push(ex);
        group.avgNeeds = d.needs?.length || 0;
        patternGroups.set(pat.id, group);
      });
    });

    // Sort by complexity (fewer needs = earlier in path)
    return [...patternGroups.values()].sort((a, b) => a.avgNeeds - b.avgNeeds);
  }, [exercises, patterns, deconstructions, selectedGrade, selectedType]);

  const totalExercises = learningPath.reduce((sum, g) => sum + g.exercises.length, 0);
  const completedCount = learningPath.reduce((sum, g) => sum + g.exercises.filter(e => completedExIds.has(e.id)).length, 0);
  const progress = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const toggleComplete = (id: string) => {
    setCompletedExIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
      <div className="bg-gradient-to-l from-emerald-400/25 via-teal-300/15 to-background border-b border-emerald-300/40 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📚</span>
            <h1 className="text-2xl font-black text-foreground">مسار التعلم</h1>
          </div>
          <p className="text-muted-foreground text-sm">تسلسل تمارين مرتب حسب التعقيد — من الأسهل إلى الأصعب — بناءً على المفاهيم المطلوبة</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {GRADE_ORDER.map(g => (
              <button key={g} onClick={() => { setSelectedGrade(g); setSelectedType(""); }}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all border"
                style={{
                  background: selectedGrade === g ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: selectedGrade === g ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  borderColor: selectedGrade === g ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}>
                {GRADE_LABELS[g]}
              </button>
            ))}
          </div>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs">
            <option value="">كل الأنواع</option>
            {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
          </select>
        </div>

        {/* Progress bar */}
        <div className="mb-8 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground">تقدمك في {GRADE_LABELS[selectedGrade]}</span>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{completedCount} / {totalExercises} تمرين</span>
            <span>{learningPath.length} نمط</span>
          </div>
        </div>

        {/* Learning path timeline */}
        <div className="space-y-6">
          {learningPath.map((group, gi) => {
            const groupCompleted = group.exercises.filter(e => completedExIds.has(e.id)).length;
            const groupDone = groupCompleted === group.exercises.length;

            return (
              <div key={gi} className="relative">
                {/* Connection line */}
                {gi < learningPath.length - 1 && (
                  <div className="absolute right-[19px] top-[48px] bottom-[-24px] w-0.5 bg-border" />
                )}

                <div className="flex gap-4">
                  {/* Step marker */}
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2"
                      style={{
                        background: groupDone ? "hsl(var(--primary))" : "hsl(var(--card))",
                        color: groupDone ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                        borderColor: groupDone ? "hsl(var(--primary))" : "hsl(var(--border))",
                      }}>
                      {groupDone ? "✓" : gi + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 rounded-xl border border-border/50 shadow-sm"
                    style={{
                      background: [
                        "linear-gradient(135deg, hsl(40 60% 96%), hsl(45 50% 92%))",
                        "linear-gradient(135deg, hsl(200 50% 96%), hsl(210 40% 92%))",
                        "linear-gradient(135deg, hsl(150 40% 96%), hsl(160 35% 92%))",
                        "linear-gradient(135deg, hsl(280 40% 96%), hsl(290 35% 92%))",
                        "linear-gradient(135deg, hsl(20 50% 96%), hsl(15 45% 92%))",
                        "linear-gradient(135deg, hsl(340 40% 96%), hsl(350 35% 92%))",
                      ][gi % 6],
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{group.pattern.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{group.pattern.type}</span>
                          <span className="text-[10px] text-muted-foreground">{groupCompleted}/{group.exercises.length} تمرين</span>
                        </div>
                      </div>
                      {group.pattern.concepts && group.pattern.concepts.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-end">
                          {group.pattern.concepts.slice(0, 4).map((c, ci) => (
                            <span key={ci} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Steps */}
                    {group.pattern.steps.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {group.pattern.steps.map((s, si) => (
                          <div key={si} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold">{si + 1}</span>
                            {s}
                            {si < group.pattern.steps.length - 1 && <span className="text-border mr-1">→</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Exercises */}
                    <div className="space-y-1.5">
                      {group.exercises.slice(0, 5).map((ex, ei) => (
                        <div key={ei} onClick={() => toggleComplete(ex.id)}
                          className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all border"
                          style={{
                            background: completedExIds.has(ex.id) ? "hsl(var(--primary) / 0.05)" : "hsl(var(--muted) / 0.3)",
                            borderColor: completedExIds.has(ex.id) ? "hsl(var(--primary) / 0.2)" : "transparent",
                          }}>
                          <div className="w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5"
                            style={{
                              borderColor: completedExIds.has(ex.id) ? "hsl(var(--primary))" : "hsl(var(--border))",
                              background: completedExIds.has(ex.id) ? "hsl(var(--primary))" : "transparent",
                              color: completedExIds.has(ex.id) ? "hsl(var(--primary-foreground))" : "transparent",
                            }}>✓</div>
                          <div className="text-xs text-foreground line-clamp-2 flex-1" style={{
                            textDecoration: completedExIds.has(ex.id) ? "line-through" : "none",
                            opacity: completedExIds.has(ex.id) ? 0.5 : 1,
                          }}>{ex.text}</div>
                          <a href={`/tutor`} onClick={e => e.stopPropagation()}
                            className="text-[9px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold flex-shrink-0 hover:bg-primary/20 transition-all">
                            🤖 شرح
                          </a>
                        </div>
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
