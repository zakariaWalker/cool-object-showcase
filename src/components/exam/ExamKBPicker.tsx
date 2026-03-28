// ===== KB Exercise Picker for Exam Builder — with scoring info =====
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAdminKBStore } from "@/components/admin/useAdminKBStore";
import { ExamExercise, TYPE_LABELS_AR } from "@/engine/exam-types";
import { detectScoringParams, computeBaseScore, categorizeForExam, suggestPoints, COGNITIVE_LABELS_AR, type ExerciseScoringParams, type CognitiveLevel } from "@/engine/exercise-scoring";

interface Props {
  grade: string;
  sectionId: string;
  allowedTypes?: string[];
  onSelect: (sectionId: string, exercise: ExamExercise) => void;
  onClose: () => void;
}

export function ExamKBPicker({ grade, sectionId, allowedTypes, onSelect, onClose }: Props) {
  const { exercises } = useAdminKBStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = exercises.filter(e => e.grade === grade);
    if (allowedTypes && allowedTypes.length > 0) {
      list = list.filter(e => allowedTypes.includes(e.type));
    }
    if (typeFilter !== "all") {
      list = list.filter(e => e.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e => e.text.toLowerCase().includes(q));
    }
    return list.slice(0, 50);
  }, [exercises, grade, allowedTypes, typeFilter, search]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    exercises.filter(e => e.grade === grade).forEach(e => { if (e.type) types.add(e.type); });
    if (allowedTypes) return allowedTypes.filter(t => types.has(t));
    return [...types].sort();
  }, [exercises, grade, allowedTypes]);

  const handleSelect = (ex: typeof exercises[0]) => {
    // Auto-compute points based on scoring params
    const params = detectScoringParams(ex.text, ex.type);
    const fullParams: ExerciseScoringParams = {
      difficulty: params.difficulty || 2,
      cognitiveLevel: (params.cognitiveLevel || "apply") as CognitiveLevel,
      bloomLevel: 3,
      conceptCount: params.conceptCount || 1,
      stepCount: params.stepCount || 2,
      estimatedTimeMin: params.estimatedTimeMin || 5,
      hasSubQuestions: params.hasSubQuestions || false,
      requiresProof: params.requiresProof || false,
      requiresGraph: params.requiresGraph || false,
      requiresConstruction: params.requiresConstruction || false,
      domain: ex.type,
      subdomain: "",
    };
    const baseScore = computeBaseScore(fullParams);
    
    onSelect(sectionId, {
      id: `kb_${ex.id}_${Date.now()}`,
      sectionId,
      text: ex.text,
      points: Math.max(baseScore, 1),
      type: ex.type,
      grade: ex.grade,
      source: "kb",
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[80vh] rounded-xl border border-border bg-card overflow-hidden flex flex-col" dir="rtl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-foreground">📚 اختيار تمرين من قاعدة المعرفة</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{filtered.length} تمرين متاح</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground"
            placeholder="🔍 بحث في التمارين..." />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground">
            <option value="all">كل الأنواع</option>
            {availableTypes.map(t => (
              <option key={t} value={t}>{TYPE_LABELS_AR[t] || t}</option>
            ))}
          </select>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">لا توجد تمارين مطابقة</p>
          )}
          {filtered.map(ex => {
            const params = detectScoringParams(ex.text, ex.type);
            const category = categorizeForExam({
              difficulty: params.difficulty || 2,
              cognitiveLevel: (params.cognitiveLevel || "apply") as CognitiveLevel,
              bloomLevel: 3,
              conceptCount: params.conceptCount || 1,
              stepCount: params.stepCount || 2,
              estimatedTimeMin: params.estimatedTimeMin || 5,
              hasSubQuestions: params.hasSubQuestions || false,
              requiresProof: params.requiresProof || false,
              requiresGraph: params.requiresGraph || false,
              requiresConstruction: params.requiresConstruction || false,
              domain: ex.type,
              subdomain: "",
            });
            return (
            <button key={ex.id} onClick={() => handleSelect(ex)}
              className="w-full text-right p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all">
              <div className="text-xs text-foreground leading-relaxed line-clamp-3">{ex.text}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {TYPE_LABELS_AR[ex.type] || ex.type}
                </span>
                <span className="text-[9px] text-muted-foreground">{ex.grade}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                  {COGNITIVE_LABELS_AR[(params.cognitiveLevel || "apply") as CognitiveLevel]} · ≈{category.suggestedPoints}ن
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: category.section === "warmup" ? "hsl(var(--geometry) / 0.1)" :
                      category.section === "core" ? "hsl(var(--primary) / 0.1)" :
                      category.section === "challenge" ? "hsl(var(--statistics) / 0.1)" :
                      "hsl(var(--destructive) / 0.1)",
                    color: category.section === "warmup" ? "hsl(var(--geometry))" :
                      category.section === "core" ? "hsl(var(--primary))" :
                      category.section === "challenge" ? "hsl(var(--statistics))" :
                      "hsl(var(--destructive))",
                  }}>
                  {category.sectionLabelAr}
                </span>
              </div>
            </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
