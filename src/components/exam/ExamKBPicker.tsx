// ===== KB Exercise Picker for Exam Builder =====
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAdminKBStore } from "@/components/admin/useAdminKBStore";
import { ExamExercise, TYPE_LABELS_AR } from "@/engine/exam-types";

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
    onSelect(sectionId, {
      id: `kb_${ex.id}_${Date.now()}`,
      sectionId,
      text: ex.text,
      points: 2,
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
          {filtered.map(ex => (
            <button key={ex.id} onClick={() => handleSelect(ex)}
              className="w-full text-right p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all">
              <div className="text-xs text-foreground leading-relaxed line-clamp-3">{ex.text}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {TYPE_LABELS_AR[ex.type] || ex.type}
                </span>
                <span className="text-[9px] text-muted-foreground">{ex.grade}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
