import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExerciseRenderer } from "./ExerciseRenderer";

interface ExerciseItem {
  id: string;
  source_text: string;
  domain: string;
  subdomain: string;
  difficulty: number;
  grade: string;
  solution_tree: any;
  semantic_objects: any;
  intent: any;
  relations: any;
  constraints: any;
  formulas_needed: any;
  render_plan: any;
}

interface KBExercise {
  id: string;
  text: string;
  type: string;
  chapter: string;
  grade: string;
  stream: string;
  label: string;
  source: string;
}

interface ChapterGroup {
  chapter: string;
  exercises: KBExercise[];
}

interface ExerciseLibraryProps {
  onSelectExercise: (exercise: any) => void;
}

const GRADE_LEVELS = [
  {
    id: "middle",
    label: "المتوسط",
    emoji: "🏫",
    grades: [
      { id: "middle_1", label: "1AM", sublabel: "أولى متوسط" },
      { id: "middle_2", label: "2AM", sublabel: "ثانية متوسط" },
      { id: "middle_3", label: "3AM", sublabel: "ثالثة متوسط" },
      { id: "middle_4", label: "4AM", sublabel: "رابعة متوسط (BEM)" },
    ],
  },
  {
    id: "secondary",
    label: "الثانوي",
    emoji: "🎓",
    grades: [
      { id: "secondary_1", label: "1AS", sublabel: "أولى ثانوي" },
      { id: "secondary_2", label: "2AS", sublabel: "ثانية ثانوي" },
      { id: "secondary_3", label: "3AS", sublabel: "ثالثة ثانوي (BAC)" },
    ],
  },
];

const STREAMS: Record<string, { id: string; label: string; color: string }[]> = {
  secondary_1: [
    { id: "S", label: "علوم", color: "hsl(var(--primary))" },
    { id: "L", label: "آداب", color: "hsl(var(--secondary))" },
  ],
  secondary_2: [
    { id: "S", label: "علوم تجريبية", color: "hsl(var(--primary))" },
    { id: "M", label: "رياضيات", color: "hsl(210 80% 55%)" },
    { id: "MT", label: "تقني رياضي", color: "hsl(280 60% 55%)" },
    { id: "GE", label: "تسيير و اقتصاد", color: "hsl(38 80% 50%)" },
    { id: "LE", label: "آداب و لغات", color: "hsl(160 60% 45%)" },
    { id: "LP", label: "آداب و فلسفة", color: "hsl(340 60% 50%)" },
  ],
  secondary_3: [
    { id: "S", label: "علوم تجريبية", color: "hsl(var(--primary))" },
    { id: "M", label: "رياضيات", color: "hsl(210 80% 55%)" },
    { id: "MT", label: "تقني رياضي", color: "hsl(280 60% 55%)" },
    { id: "GE", label: "تسيير و اقتصاد", color: "hsl(38 80% 50%)" },
    { id: "LE", label: "آداب و لغات", color: "hsl(160 60% 45%)" },
    { id: "LP", label: "آداب و فلسفة", color: "hsl(340 60% 50%)" },
  ],
};

export function ExerciseLibrary({ onSelectExercise }: ExerciseLibraryProps) {
  const { profile } = useAuth();

  // Initialize from profile or localStorage
  const initGrade = (() => {
    if (profile?.grade) return profile.grade;
    try { return localStorage.getItem("elmentor_grade") || "middle_4"; } catch { return "middle_4"; }
  })();
  const initStream = (() => {
    if (profile?.stream) return profile.stream;
    try { return localStorage.getItem("elmentor_stream") || ""; } catch { return ""; }
  })();

  const [selectedGrade, setSelectedGrade] = useState<string>(initGrade);
  const [selectedStream, setSelectedStream] = useState<string>(() => {
    if (initGrade.startsWith("secondary_") && STREAMS[initGrade]) {
      const valid = STREAMS[initGrade].find(s => s.id === initStream);
      return valid ? initStream : STREAMS[initGrade][0].id;
    }
    return "";
  });
  const [exercises, setExercises] = useState<KBExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sync with profile when it loads
  useEffect(() => {
    if (profile?.grade && profile.grade !== selectedGrade) {
      setSelectedGrade(profile.grade);
      if (profile.stream && profile.grade.startsWith("secondary_")) {
        setSelectedStream(profile.stream);
      } else {
        setSelectedStream("");
      }
    }
  }, [profile]);

  // Fetch exercises when grade/stream changes
  useEffect(() => {
    let cancelled = false;
    const fetchExercises = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = (supabase as any)
          .from("kb_exercises")
          .select("*")
          .eq("grade", selectedGrade)
          .order("chapter");

        // For secondary grades with streams, filter by stream
        if (selectedGrade.startsWith("secondary_") && selectedStream) {
          query = query.eq("stream", selectedStream);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (cancelled) return;

        setExercises(data?.map((e: any) => ({
          id: e.id,
          text: e.text,
          type: e.type || "",
          chapter: e.chapter || "",
          grade: e.grade || "",
          stream: e.stream || "",
          label: e.label || "",
          source: e.source || "",
        })) || []);

        // Open first chapter
        if (data && data.length > 0) {
          setOpenChapters({ [data[0].chapter]: true });
        } else {
          setOpenChapters({});
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "خطأ في تحميل التمارين");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExercises();
    try {
      localStorage.setItem("elmentor_grade", selectedGrade);
      if (selectedStream) localStorage.setItem("elmentor_stream", selectedStream);
    } catch {}
    return () => { cancelled = true; };
  }, [selectedGrade, selectedStream]);

  // When grade changes, auto-set stream for secondary
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    if (grade.startsWith("secondary_") && STREAMS[grade]) {
      setSelectedStream(STREAMS[grade][0].id);
    } else {
      setSelectedStream("");
    }
  };

  // Group exercises by chapter
  const chapterGroups: ChapterGroup[] = (() => {
    const map = new Map<string, KBExercise[]>();
    for (const ex of exercises) {
      const ch = ex.chapter || "بدون فصل";
      if (!map.has(ch)) map.set(ch, []);
      map.get(ch)!.push(ex);
    }
    return Array.from(map.entries()).map(([chapter, exercises]) => ({ chapter, exercises }));
  })();

  const toggleChapter = (ch: string) => {
    setOpenChapters(prev => ({ ...prev, [ch]: !prev[ch] }));
  };

  const handleSelectExercise = (ex: KBExercise) => {
    setSelectedId(ex.id);
    onSelectExercise({
      url: "",
      title: `${ex.source} — ${ex.chapter}`,
      statement: ex.text,
      questions: [ex.text],
      answers: [],
      _kb: { id: ex.id, type: ex.type, chapter: ex.chapter, grade: ex.grade, stream: ex.stream },
    });
  };

  const currentLevel = GRADE_LEVELS.find(l => l.grades.some(g => g.id === selectedGrade));
  const currentGrade = currentLevel?.grades.find(g => g.id === selectedGrade);
  const hasStreams = selectedGrade.startsWith("secondary_") && STREAMS[selectedGrade];

  return (
    <div className="flex flex-col h-full">
      {/* Level Tabs */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex gap-2 mb-2">
          {GRADE_LEVELS.map(level => (
            <button
              key={level.id}
              onClick={() => handleGradeChange(level.grades[0].id)}
              className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                currentLevel?.id === level.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {level.emoji} {level.label}
            </button>
          ))}
        </div>

        {/* Grade Selector */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {currentLevel?.grades.map(g => (
            <button
              key={g.id}
              onClick={() => handleGradeChange(g.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap ${
                selectedGrade === g.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stream Selector for Secondary */}
      {hasStreams && (
        <div className="px-3 py-2 border-b border-border bg-accent/10">
          <div className="text-[10px] text-muted-foreground font-semibold mb-1.5" dir="rtl">🎯 الشعبة:</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {STREAMS[selectedGrade].map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStream(s.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap ${
                  selectedStream === s.id
                    ? "text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:opacity-80"
                }`}
                style={selectedStream === s.id ? {
                  background: s.color,
                  borderColor: s.color,
                } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3 border-b border-border bg-card/50 px-4">
        <div className="flex items-center justify-between" dir="rtl">
          <div>
            <div className="text-[14px] text-primary font-bold">
              📚 {currentGrade?.sublabel || currentGrade?.label}
              {hasStreams && selectedStream && (
                <span className="text-[11px] text-muted-foreground mr-2">
                  — {STREAMS[selectedGrade]?.find(s => s.id === selectedStream)?.label}
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {chapterGroups.length} فصل — {exercises.length} تمرين
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
          <div style={{ animation: "spin 1s linear infinite", fontSize: 24 }}>⏳</div>
          <div className="text-[12px] text-muted-foreground font-semibold" dir="rtl">جاري تحميل التمارين...</div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center">
          <div className="text-[28px]">😕</div>
          <div className="text-[13px] font-bold text-foreground" dir="rtl">تعذّر تحميل التمارين</div>
          <div className="text-[11px] text-muted-foreground max-w-[220px]" dir="rtl">{error}</div>
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center">
          <div className="text-[24px] opacity-50">📂</div>
          <div className="text-[13px] text-muted-foreground font-semibold" dir="rtl">
            لا توجد تمارين لهذا المستوى{hasStreams ? " و الشعبة المحددة" : ""}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {chapterGroups.map(group => (
            <div key={group.chapter} className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
              <button
                onClick={() => toggleChapter(group.chapter)}
                className="w-full text-right p-3 bg-muted/50 hover:bg-muted transition-colors border-b border-border flex items-center justify-between"
                dir="rtl"
              >
                <div className="flex items-center gap-2">
                  <div className="text-[13px] text-foreground font-bold">{group.chapter}</div>
                  <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {group.exercises.length}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {openChapters[group.chapter] ? "▲" : "▼"}
                </div>
              </button>

              {openChapters[group.chapter] && (
                <div className="p-2 space-y-1.5 bg-muted/20">
                  {group.exercises.map(ex => {
                    const isSelected = selectedId === ex.id;
                    const isGeometry = (ex.type || "").includes("geometry") || (ex.type || "").includes("هندس");
                    return (
                      <button
                        key={ex.id}
                        onClick={() => handleSelectExercise(ex)}
                        className={`w-full text-right p-4 rounded-xl transition-all flex flex-col gap-3 group/card ${
                          isSelected 
                            ? "bg-primary/5 border-2 border-primary shadow-md" 
                            : "bg-card border border-border hover:border-primary/40 hover:shadow-sm"
                        }`}
                        dir="rtl"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover/card:bg-primary/10 group-hover/card:text-primary"
                            }`}>
                              {ex.source}
                            </span>
                            {ex.type && ex.type !== "unclassified" && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-bold border border-secondary/20">
                                {ex.type}
                              </span>
                            )}
                          </div>
                          {isGeometry && (
                            <span className="text-[14px]">📐</span>
                          )}
                        </div>
                        
                        <div className={`text-[12px] leading-relaxed text-right w-full ${isSelected ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          <ExerciseRenderer text={ex.text} className="line-clamp-3" />
                        </div>

                        {isSelected && (
                          <div className="flex justify-end pt-1">
                            <span className="text-[10px] text-primary font-black flex items-center gap-1 animate-pulse">
                              جاري الحل الآن... ⚡
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
