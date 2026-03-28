// ===== Exam Builder Panel — Template selection + exercise management + auto-scoring =====
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ALL_TEMPLATES, 
  BEM_TEMPLATE, 
  BAC_TEMPLATE, 
  GRADE_OPTIONS, 
  TYPE_LABELS_AR,
  generateExamId, 
  generateSectionId,
  COGNITIVE_LABELS_AR,
  type Exam,
  type ExamSection,
  type ExamExercise,
  type ExamFormat,
  type ExamStyleProfile,
  type ExamStructuralPattern,
  type CognitiveLevel,
  type ExerciseScoringParams
} from "@/engine/exam-types";
import { 
  detectScoringParams, 
  computeBaseScore, 
  categorizeForExam, 
  suggestPoints, 
  detectPedagogicalGaps,
  type PedagogicalGap
} from "@/engine/exercise-scoring";

import { ExamPreview } from "./ExamPreview";
import { ExamKBPicker } from "./ExamKBPicker";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  exam: Exam | null;
  onSave: (exam: Exam) => void;
  onCancel: () => void;
}

type Step = "template" | "configure" | "exercises" | "preview";

export function ExamBuilderPanel({ exam, onSave, onCancel }: Props) {
  const [step, setStep] = useState<Step>(exam ? "exercises" : "template");
  const [format, setFormat] = useState<ExamFormat>(exam?.format || "regular");
  const [grade, setGrade] = useState(exam?.grade || "middle_4");
  const [title, setTitle] = useState(exam?.title || "");
  const [duration, setDuration] = useState(exam?.duration || 60);
  const [totalPoints, setTotalPoints] = useState(exam?.totalPoints || 20);
  const [sections, setSections] = useState<ExamSection[]>(exam?.sections || []);
  const [metadata, setMetadata] = useState(exam?.metadata || {});
  const [styleProfile, setStyleProfile] = useState<ExamStyleProfile | undefined>(exam?.styleProfile);
  const [structuralPatterns, setStructuralPatterns] = useState<ExamStructuralPattern | undefined>(exam?.structuralPatterns);
  const [showKBPicker, setShowKBPicker] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [sampleSize, setSampleSize] = useState(0);
  const [version, setVersion] = useState(1);
  const [changeSummary, setChangeSummary] = useState("");
  const [gaps, setGaps] = useState<PedagogicalGap[]>([]);

  const template = ALL_TEMPLATES.find(t => t.id === format);

  const applyTemplate = () => {
    if (!template) return;
    setDuration(template.duration);
    setTotalPoints(template.totalPoints);
    setSections(template.sections.map(s => ({
      id: s.id,
      title: s.titleAr,
      points: s.points,
      exercises: [],
    })));
    fetchStyleInsights(template.format);
    setStep("configure");
  };

  const fetchStyleInsights = async (format: ExamFormat) => {
    setLoadingInsights(true);
    try {
      const { data, error } = await (supabase as any)
        .from("exam_blueprints")
        .select("aggregated_style, aggregated_patterns, sample_size, version, change_summary")
        .eq("format", format)
        .eq("grade", grade)
        .eq("is_current", true)
        .maybeSingle();

      if (data) {
        if (data.aggregated_style) setStyleProfile(data.aggregated_style as any);
        if (data.aggregated_patterns) setStructuralPatterns(data.aggregated_patterns as any);
        if (data.sample_size) setSampleSize(data.sample_size);
        if (data.version) setVersion(data.version);
        if (data.change_summary) setChangeSummary(data.change_summary);
      } else {
        // Fallback to latest upload if no blueprint yet
        const { data: latest } = await supabase
          .from("exam_uploads")
          .select("extracted_metadata, extracted_patterns")
          .eq("format", format)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (latest) {
          if (latest.extracted_metadata) setStyleProfile(latest.extracted_metadata as any);
          if (latest.extracted_patterns) setStructuralPatterns(latest.extracted_patterns as any);
          setSampleSize(1);
        }
      }
    } catch (e) {
      console.error("Error fetching insights:", e);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (structuralPatterns) {
      const detected = detectPedagogicalGaps(sections, structuralPatterns);
      setGaps(detected);
    }
  }, [sections, structuralPatterns]);

  const currentPoints = sections.reduce((sum, s) => sum + s.exercises.reduce((es, e) => es + e.points, 0), 0);

  const addExerciseToSection = (sectionId: string, exercise: ExamExercise) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, exercises: [...s.exercises, { ...exercise, sectionId }] } : s
    ));
  };

  const removeExercise = (sectionId: string, exerciseId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, exercises: s.exercises.filter(e => e.id !== exerciseId) } : s
    ));
  };

  const updateExercisePoints = (sectionId: string, exerciseId: string, points: number) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? {
        ...s,
        exercises: s.exercises.map(e => e.id === exerciseId ? { ...e, points } : e)
      } : s
    ));
  };

  const addSection = () => {
    setSections(prev => [...prev, {
      id: generateSectionId(),
      title: `التمرين ${prev.length + 1}`,
      points: 0,
      exercises: [],
    }]);
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const addManualExercise = (sectionId: string) => {
    const ex: ExamExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sectionId,
      text: "",
      points: 2,
      type: "algebra",
      grade,
      source: "manual",
    };
    addExerciseToSection(sectionId, ex);
  };

  // Auto-score an exercise when text changes
  const autoScoreExercise = (sectionId: string, exerciseId: string, text: string) => {
    if (text.length < 20) return;
    const params = detectScoringParams(text);
    const fullParams: ExerciseScoringParams = {
      difficulty: params.difficulty || 2,
      cognitiveLevel: (params.cognitiveLevel || "apply") as CognitiveLevel,
      bloomLevel: params.bloomLevel || 3,
      conceptCount: params.conceptCount || 1,
      stepCount: params.stepCount || 2,
      estimatedTimeMin: params.estimatedTimeMin || 5,
      hasSubQuestions: params.hasSubQuestions || false,
      requiresProof: params.requiresProof || false,
      requiresGraph: params.requiresGraph || false,
      requiresConstruction: params.requiresConstruction || false,
      domain: "",
      subdomain: "",
    };
    const totalEx = sections.reduce((s, sec) => s + sec.exercises.length, 0);
    const suggested = suggestPoints(fullParams, totalPoints, Math.max(totalEx, 1));
    updateExercisePoints(sectionId, exerciseId, suggested);
  };

  const updateExerciseText = (sectionId: string, exerciseId: string, text: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? {
        ...s,
        exercises: s.exercises.map(e => e.id === exerciseId ? { ...e, text } : e)
      } : s
    ));
  };

  const achievementScore = useMemo(() => {
    if (sections.length === 0) return 0;
    
    let base = 0;
    const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0);
    if (totalExercises === 0) return 0;

    // 1. Points coverage (30%)
    const pointsRatio = Math.min(currentPoints / totalPoints, 1);
    base += pointsRatio * 30;

    // 2. Section density match (40%)
    const sectionsWithExercises = sections.filter(s => s.exercises.length > 0).length;
    const sectionRatio = sectionsWithExercises / sections.length;
    base += sectionRatio * 40;

    // 3. Structural variety (30%)
    const hasVariety = sections.some(s => s.exercises.some(e => {
      const p = detectScoringParams(e.text);
      return (p.difficulty || 0) >= 3 || p.requiresProof;
    }));
    if (hasVariety) base += 30;

    // 4. Gap Penalties (Subtract from base)
    const totalPenalty = gaps.reduce((sum, gap) => {
      if (gap.severity === "critical") return sum + 15;
      if (gap.severity === "warning") return sum + 5;
      return sum;
    }, 0);

    return Math.max(Math.round(base - totalPenalty), 0);
  }, [sections, currentPoints, totalPoints, gaps]);

  const handleSave = () => {
    const examData: Exam = {
      id: exam?.id || generateExamId(),
      title: title || `${template?.labelAr || "امتحان"} — ${GRADE_OPTIONS.find(g => g.value === grade)?.label || grade}`,
      format,
      grade,
      duration,
      totalPoints,
      sections,
      createdAt: exam?.createdAt || new Date().toISOString(),
      status: "draft",
      metadata,
      styleProfile,
      structuralPatterns,
    };
    onSave(examData);
  };

  return (
    <div className="space-y-6">
      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2">
        {(["template", "configure", "exercises", "preview"] as Step[]).map((s, i) => {
          const labels = ["القالب", "الإعدادات", "التمارين", "المعاينة"];
          const icons = ["📋", "⚙️", "📝", "👁️"];
          const isActive = s === step;
          const isPast = ["template", "configure", "exercises", "preview"].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className={`w-8 h-0.5 ${isPast ? "bg-primary" : "bg-border"}`} />}
              <button onClick={() => isPast || isActive ? setStep(s) : null}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isPast ? "bg-primary/10 text-primary cursor-pointer" :
                  "bg-muted text-muted-foreground"
                }`}>
                <span>{icons[i]}</span> {labels[i]}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Template ── */}
      {step === "template" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h2 className="text-lg font-black text-foreground">اختر نوع الامتحان</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ALL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => { setFormat(t.format); }}
                className={`p-6 rounded-xl border-2 text-right transition-all hover:shadow-lg ${
                  format === t.format ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                }`}>
                <div className="text-2xl mb-2">{t.format === "bem" ? "🎓" : t.format === "bac" ? "🏆" : "📄"}</div>
                <div className="text-sm font-black text-foreground">{t.labelAr}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                  <span>⏱️ {t.duration} د</span>
                  <span>📊 /{t.totalPoints}</span>
                  <span>📝 {t.sections.length} أقسام</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={applyTemplate}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
            متابعة ←
          </button>
        </motion.div>
      )}

      {/* ── Step 2: Configure ── */}
      {step === "configure" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h2 className="text-lg font-black text-foreground">⚙️ إعدادات الامتحان</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">عنوان الامتحان</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  placeholder="مثلاً: اختبار الفصل الأول في الرياضيات" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">المستوى الدراسي</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">المدة (دقيقة)</label>
                  <input type="number" value={duration} onChange={e => setDuration(+e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">مجموع النقاط</label>
                  <input type="number" value={totalPoints} onChange={e => setTotalPoints(+e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-xs font-black text-foreground">📎 معلومات إضافية (اختياري)</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-primary">النمط البصري والتربوي</div>
                    {version > 1 && (
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">
                        v{version}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {loadingInsights ? "جاري جلب الأنماط..." : 
                     styleProfile ? `✅ تم تطبيق نمط مجمّع (${sampleSize} امتحانات)` : 
                     "⚠️ لا يوجد نمط حقيقي متاح حالياً"}
                  </div>
                  {changeSummary && version > 1 && (
                    <p className="text-[8px] text-primary/60 italic line-clamp-1 hover:line-clamp-none cursor-help transition-all">
                      ✨ {changeSummary}
                    </p>
                  )}
                  <div className="pt-2">
                    <div className="flex justify-between items-end mb-1">
                      <div className="text-[10px] font-black text-primary flex items-center gap-1">
                        🏆 مستوى ذكاء المنظمة
                        <span className="text-[8px] bg-primary/20 px-1 rounded">v{version}</span>
                      </div>
                      <div className="text-[9px] font-bold text-primary/60">
                        {Math.min(version * 10, 100)}%
                        {version >= 10 && " (الذروة ✨)"}
                      </div>
                    </div>
                    <div className="h-2 bg-primary/10 rounded-full overflow-hidden border border-primary/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(version * 10, 100)}%` }}
                        className={`h-full transition-all duration-1000 ${
                          version >= 10 ? "bg-gradient-to-l from-amber-400 via-primary to-amber-400 animate-pulse" : 
                          version >= 7 ? "bg-primary" : 
                          "bg-primary/60"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between mt-1 px-0.5">
                      <span className="text-[7px] text-muted-foreground">تأسيس</span>
                      <span className="text-[7px] text-primary/40">تدرج</span>
                      <span className="text-[7px] text-primary/80 font-bold">الذروة التربوية</span>
                    </div>
                  </div>
                </div>
                {styleProfile && (
                  <div className="text-[9px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
                    نشط
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">اسم المؤسسة</label>
                <input value={metadata.school || ""} onChange={e => setMetadata({ ...metadata, school: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">اسم الأستاذ</label>
                <input value={metadata.teacher || ""} onChange={e => setMetadata({ ...metadata, teacher: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">الفصل</label>
                  <select value={metadata.semester || ""} onChange={e => setMetadata({ ...metadata, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                    <option value="">—</option>
                    <option value="1">الفصل الأول</option>
                    <option value="2">الفصل الثاني</option>
                    <option value="3">الفصل الثالث</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">السنة</label>
                  <input value={metadata.year || ""} onChange={e => setMetadata({ ...metadata, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    placeholder="2024/2025" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("template")} className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-muted">→ رجوع</button>
            <button onClick={() => setStep("exercises")} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm">متابعة ←</button>
          </div>
        </motion.div>
      )}

      {/* ── Step 3: Exercises ── */}
      {step === "exercises" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">📝 التمارين</h2>
            <div className="flex items-center gap-4">
              {/* Achievement Score */}
              {structuralPatterns && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-primary uppercase">جودة البناء التربوي</span>
                    <span className="text-[10px] font-bold text-foreground">{achievementScore}%</span>
                  </div>
                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${achievementScore}%` }} />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  currentPoints === totalPoints ? "bg-primary/10 text-primary" :
                  currentPoints > totalPoints ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {currentPoints} / {totalPoints} نقطة
                </span>
                <button onClick={addSection}
                  className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-primary/50 text-primary font-bold hover:bg-primary/5">
                  + قسم جديد
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section, si) => (
              <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">{si + 1}</span>
                    <input value={section.title}
                      onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                      className="text-sm font-bold text-foreground bg-transparent border-none outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    {format === "regular" && (
                      <button 
                        onClick={() => {
                          const isProblem = section.id === "problem";
                          setSections(prev => prev.map(s => s.id === section.id ? { 
                            ...s, 
                            id: isProblem ? generateSectionId() : "problem",
                            title: isProblem ? "قسم جديد" : "الوضعية الإدماجية"
                          } : s));
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-all ${
                          section.id === "problem" 
                          ? "bg-black text-white border-black" 
                          : "bg-transparent text-muted-foreground border-border hover:border-black/30"
                        }`}
                      >
                        {section.id === "problem" ? "★ وضعية إدماجية" : "تحويل لوضعية؟"}
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {section.exercises.reduce((s, e) => s + e.points, 0)} ن
                    </span>
                    {format === "regular" && (
                      <button onClick={() => removeSection(section.id)}
                        className="text-destructive/60 hover:text-destructive text-xs">✕</button>
                    )}
                  </div>
                </div>

                {/* Exercises */}
                <div className="p-4 space-y-3">
                  {section.exercises.map((ex, ei) => (
                    <div key={ex.id} className="p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground mt-2">{ei + 1})</span>
                        <div className="flex-1 space-y-2">
                          <textarea value={ex.text}
                            onChange={e => updateExerciseText(section.id, ex.id, e.target.value)}
                            onBlur={() => autoScoreExercise(section.id, ex.id, ex.text)}
                            className="w-full px-2 py-1.5 rounded border border-border bg-card text-sm text-foreground resize-none min-h-[60px]"
                            placeholder="نص التمرين... (النقاط ستُحسب تلقائياً)" />
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] text-muted-foreground">النقاط:</label>
                              <input type="number" value={ex.points} min={0.5} step={0.5}
                                onChange={e => updateExercisePoints(section.id, ex.id, +e.target.value)}
                                className="w-14 px-1.5 py-0.5 rounded border border-border bg-card text-xs text-foreground" />
                            </div>
                            {ex.source && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{
                                background: ex.source === "kb" ? "hsl(var(--geometry) / 0.1)" : "hsl(var(--muted))",
                                color: ex.source === "kb" ? "hsl(var(--geometry))" : "hsl(var(--muted-foreground))",
                              }}>
                                {ex.source === "kb" ? "من KB" : ex.source === "ai" ? "AI" : "يدوي"}
                              </span>
                            )}
                            {/* Auto-detected scoring info */}
                            {ex.text.length > 20 && (() => {
                              const params = detectScoringParams(ex.text, ex.type);
                              return (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/5 text-muted-foreground border border-border">
                                  {COGNITIVE_LABELS_AR[(params.cognitiveLevel || "apply") as CognitiveLevel]} · صعوبة {params.difficulty}/5 · {params.conceptCount} مفهوم
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <button onClick={() => removeExercise(section.id, ex.id)}
                          className="text-destructive/50 hover:text-destructive text-sm mt-1">✕</button>
                      </div>
                    </div>
                  ))}

                  {/* Add exercise buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button onClick={() => addManualExercise(section.id)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
                      ✏️ إضافة يدوية
                    </button>
                    <button onClick={() => setShowKBPicker(section.id)}
                      className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all">
                      📚 اختيار من KB
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("configure")} className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-muted">→ رجوع</button>
            <button onClick={() => setShowPreview(true)}
              className="px-4 py-2 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted">
              👁️ معاينة
            </button>
            <button onClick={handleSave}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
              💾 حفظ الامتحان
            </button>
          </div>
        </motion.div>
      )}

      {/* KB Picker Modal */}
      <AnimatePresence>
        {showKBPicker && (
          <ExamKBPicker
            grade={grade}
            sectionId={showKBPicker}
            allowedTypes={template?.sections.find(s => s.id === showKBPicker)?.allowedTypes}
            targetSection={
              template?.sections.find(s => s.id === showKBPicker)?.id === "problem" ? "problem" :
              template?.sections.find(s => s.id === showKBPicker)?.id === "ex1" ? "warmup" : "core"
            }
            structuralPatterns={structuralPatterns}
            onSelect={(sectionId, exercise) => { addExerciseToSection(sectionId, exercise); setShowKBPicker(null); }}
            onClose={() => setShowKBPicker(null)}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <ExamPreview
            exam={{
              id: exam?.id || "preview",
              title: title || "امتحان",
              format, grade, duration, totalPoints, sections,
              createdAt: new Date().toISOString(),
              status: "draft",
              metadata,
              styleProfile,
              structuralPatterns,
            }}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
