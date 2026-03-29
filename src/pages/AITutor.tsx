import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExerciseRenderer } from "@/components/ExerciseRenderer";

interface Exercise {
  id: string; text: string; type: string; grade: string;
}

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};

const TYPE_LABELS: Record<string, string> = {
  arithmetic: "حساب", algebra: "جبر", fractions: "كسور", equations: "معادلات",
  geometry_construction: "هندسة", statistics: "إحصاء", probability: "احتمالات",
  functions: "دوال", trigonometry: "مثلثات", sequences: "متتاليات", calculus: "تحليل",
  systems: "جمل معادلات", proportionality: "تناسبية", transformations: "تحويلات",
};

export default function AITutor() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);
  const [studentLevel, setStudentLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [mode, setMode] = useState<"solve" | "hint" | "errors">("solve");
  const [explanation, setExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // KB-driven state
  const [kbDecon, setKbDecon] = useState<any>(null);
  const [kbPattern, setKbPattern] = useState<any>(null);
  const [kbLoading, setKbLoading] = useState(false);

  useEffect(() => { 
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.grade) {
        setGradeFilter(user.user_metadata.grade);
      }
      loadExercises();
    }
    init();
  }, []);

  async function loadExercises() {
    setLoading(true);
    const PAGE = 1000;
    const all: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await (supabase as any)
        .from("kb_exercises")
        .select("id,text,type,grade")
        .order("grade")
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setExercises(all);
    setLoading(false);
  }

  const types = useMemo(() => [...new Set(exercises.map(e => e.type).filter(t => t && t !== "unclassified"))].sort(), [exercises]);

  const filtered = useMemo(() => exercises.filter(e => {
    if (gradeFilter && e.grade !== gradeFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).slice(0, 100), [exercises, gradeFilter, typeFilter, search]);

  const askTutor = async () => {
    if (!selectedEx) return;
    setAiLoading(true);
    setExplanation("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-tutor", {
        body: { exerciseId: selectedEx.id, studentLevel, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExplanation(data.explanation || "لم يتم الحصول على شرح");
    } catch (err: any) {
      setExplanation(`❌ خطأ: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // KB-driven: load deconstruction and pattern when exercise is selected
  const loadKBData = async (exId: string) => {
    setKbLoading(true);
    setKbDecon(null);
    setKbPattern(null);
    try {
      const { data: deconData } = await (supabase as any)
        .from("kb_deconstructions")
        .select("*")
        .eq("exercise_id", exId)
        .limit(1)
        .single();
      if (deconData) {
        setKbDecon(deconData);
        if (deconData.pattern_id) {
          const { data: patData } = await (supabase as any)
            .from("kb_patterns")
            .select("*")
            .eq("id", deconData.pattern_id)
            .single();
          if (patData) setKbPattern(patData);
        }
      }
    } catch (e) {
      console.error("KB load error:", e);
    } finally {
      setKbLoading(false);
    }
  };

  // Render markdown-like AI response with LaTeX
  const renderExplanation = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("###")) return <h4 key={i} className="text-sm font-bold text-foreground mt-4 mb-1">{line.replace(/^###\s*/, "")}</h4>;
      if (line.startsWith("##")) return <h3 key={i} className="text-base font-bold text-foreground mt-4 mb-2">{line.replace(/^##\s*/, "")}</h3>;
      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-sm font-bold text-foreground my-1">{line.replace(/\*\*/g, "")}</p>;
      if (!line.trim()) return <div key={i} className="h-2" />;
      const stepMatch = line.match(/^(\d+)\.\s*(.*)/);
      if (stepMatch) {
        return (
          <div key={i} className="flex items-start gap-3 my-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{stepMatch[1]}</div>
            <div className="text-sm text-foreground leading-relaxed flex-1">{stepMatch[2]}</div>
          </div>
        );
      }
      return <p key={i} className="text-sm text-foreground/80 leading-relaxed my-1">{line}</p>;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">جاري تحميل التمارين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b border-border px-6 py-8" style={{ background: "linear-gradient(to left, hsl(var(--accent) / 0.08), hsl(var(--accent) / 0.03), hsl(var(--background)))" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🤖</span>
            <h1 className="text-2xl font-black text-foreground">المدرّس الآلي</h1>
          </div>
          <p className="text-muted-foreground text-sm">اختر تمريناً → يشرحه لك خطوة بخطوة بالعربية مع ذكر المفهوم المستخدم في كل خطوة</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>
          {/* Exercise selection */}
          <div className="w-[380px] flex-shrink-0 space-y-3">
            <input type="text" placeholder="ابحث عن تمرين..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm" />
            <div className="flex gap-2">
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                className="flex-1 px-2 py-2 rounded-lg border border-border bg-card text-foreground text-xs">
                <option value="">كل المستويات</option>
                {Object.entries(GRADE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="flex-1 px-2 py-2 rounded-lg border border-border bg-card text-foreground text-xs">
                <option value="">كل الأنواع</option>
                {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
            </div>

            <div className="overflow-y-auto space-y-1.5" style={{ maxHeight: "calc(100vh - 380px)" }}>
              {filtered.map(ex => (
                <div key={ex.id} onClick={() => { setSelectedEx(ex); setExplanation(""); loadKBData(ex.id); }}
                  className="p-3 rounded-lg cursor-pointer transition-all text-sm border"
                  style={{
                    background: selectedEx?.id === ex.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                    borderColor: selectedEx?.id === ex.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{GRADE_LABELS[ex.grade] || ex.grade}</span>
                    <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[ex.type] || ex.type}</span>
                  </div>
                  <div className="text-foreground line-clamp-2 text-xs leading-relaxed">{ex.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tutor panel */}
          <div className="flex-1 space-y-4">
            {selectedEx ? (
              <>
                {/* Exercise display */}
                <div className="p-5 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{GRADE_LABELS[selectedEx.grade] || selectedEx.grade}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{TYPE_LABELS[selectedEx.type] || selectedEx.type}</span>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <ExerciseRenderer text={selectedEx.text} />
                  </div>
                </div>

                {/* KB Deconstruction (no AI needed) */}
                {kbLoading ? (
                  <div className="p-6 rounded-xl border border-border bg-card flex items-center justify-center gap-3">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="text-sm text-muted-foreground">جاري تحميل التفكيك من قاعدة المعارف...</span>
                  </div>
                ) : kbDecon && kbDecon.steps && kbDecon.steps.length > 0 ? (
                  <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📖</span>
                        <h3 className="text-sm font-bold text-primary">خطوات الحل من قاعدة المعارف</h3>
                      </div>
                      {kbPattern && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold">
                          النمط: {kbPattern.name}
                        </span>
                      )}
                    </div>

                    {kbPattern?.description && (
                      <p className="text-xs text-muted-foreground mb-4 border-r-2 border-primary/30 pr-3">{kbPattern.description}</p>
                    )}

                    <div className="space-y-3">
                      {kbDecon.steps.map((step: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                          <div className="text-sm text-foreground leading-relaxed flex-1">{step}</div>
                        </div>
                      ))}
                    </div>

                    {kbDecon.needs && kbDecon.needs.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-primary/10">
                        <h4 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">المتطلبات المسبقة</h4>
                        <div className="flex gap-1.5 flex-wrap">
                          {kbDecon.needs.map((need: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent-foreground font-medium">{need}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {kbPattern?.concepts && kbPattern.concepts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-primary/10">
                        <h4 className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">المفاهيم الأساسية</h4>
                        <div className="flex gap-1.5 flex-wrap">
                          {kbPattern.concepts.map((c: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {kbDecon.notes && (
                      <p className="text-[11px] text-muted-foreground mt-3 italic">📝 {kbDecon.notes}</p>
                    )}

                    <a href={`/solve/${selectedEx.id}`}
                      className="mt-4 block w-full py-2.5 rounded-lg text-sm font-bold text-center text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                      ✍️ حل هذا التمرين تفاعلياً
                    </a>
                  </div>
                ) : !kbLoading ? (
                  <div className="p-4 rounded-xl border border-border bg-card text-center">
                    <p className="text-xs text-muted-foreground">لم يتم تفكيك هذا التمرين في قاعدة المعارف بعد.</p>
                  </div>
                ) : null}

                {/* AI Controls (optional fallback) */}
                <details className="rounded-xl border border-border bg-card overflow-hidden">
                  <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                    🤖 شرح إضافي بالذكاء الاصطناعي (اختياري)
                  </summary>
                  <div className="p-4 border-t border-border">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">المستوى</label>
                        <select value={studentLevel} onChange={e => setStudentLevel(e.target.value as any)}
                          className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-xs">
                          <option value="beginner">مبتدئ</option>
                          <option value="intermediate">متوسط</option>
                          <option value="advanced">متقدم</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">الوضع</label>
                        <select value={mode} onChange={e => setMode(e.target.value as any)}
                          className="w-full px-2 py-2 rounded-lg border border-border bg-background text-foreground text-xs">
                          <option value="solve">حل كامل</option>
                          <option value="hint">تلميح فقط</option>
                          <option value="errors">الأخطاء الشائعة</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button onClick={askTutor} disabled={aiLoading}
                          className="w-full py-2.5 rounded-lg text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all disabled:opacity-50">
                          {aiLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full" />
                              جاري الشرح...
                            </span>
                          ) : "🤖 اشرح لي"}
                        </button>
                      </div>
                    </div>
                  </div>
                </details>

                {/* AI Explanation */}
                {explanation && (
                  <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 520px)" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">🤖</span>
                      <h3 className="text-sm font-bold text-primary">شرح المدرّس الآلي</h3>
                    </div>
                    <div className="prose-sm">{renderExplanation(explanation)}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="text-6xl">🤖</div>
                  <h3 className="text-lg font-bold text-foreground">اختر تمريناً</h3>
                  <p className="text-sm text-muted-foreground">اختر تمريناً من القائمة وسيقوم المدرّس الآلي بشرحه لك خطوة بخطوة مع ذكر المفهوم المستخدم في كل خطوة.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-4 left-4 flex gap-2 z-50">
        <a href="/" className="px-4 py-2 rounded-lg text-xs font-bold bg-card border border-border text-foreground hover:bg-accent transition-all">🏠 الرئيسية</a>
        <a href="/gaps" className="px-4 py-2 rounded-lg text-xs font-bold bg-card border border-border text-foreground hover:bg-accent transition-all">🔍 كاشف الثغرات</a>
        <a href="/learn" className="px-4 py-2 rounded-lg text-xs font-bold bg-card border border-border text-foreground hover:bg-accent transition-all">📚 مسار التعلم</a>
      </div>
    </div>
  );
}
