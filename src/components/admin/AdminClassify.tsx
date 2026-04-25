import { useState, useMemo } from "react";
import { Exercise } from "./useAdminKBStore";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCountryGrades } from "@/hooks/useCountryGrades";

interface Props {
  exercises: Exercise[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  gradeFilter: string;
  setGradeFilter: (g: string) => void;
  onClassify: (id: string, type: string) => void;
  countryCode: string;
}

const TYPES = [
  { value: "compute", label: "حساب", emoji: "🔢" },
  { value: "simplify", label: "تبسيط", emoji: "✂️" },
  { value: "expand", label: "نشر", emoji: "📖" },
  { value: "factor", label: "تفكيك", emoji: "🧩" },
  { value: "solve_equation", label: "حل معادلة", emoji: "⚖️" },
  { value: "solve_inequality", label: "حل متراجحة", emoji: "↕️" },
  { value: "prove", label: "برهان", emoji: "📝" },
  { value: "geometry", label: "هندسة", emoji: "📐" },
  { value: "statistics", label: "إحصاء", emoji: "📊" },
  { value: "probability", label: "احتمالات", emoji: "🎲" },
  { value: "functions", label: "دوال", emoji: "📈" },
  { value: "other", label: "أخرى", emoji: "❓" },
];

const PAGE_SIZE = 30;

export function AdminClassify({ exercises, searchQuery, setSearchQuery, gradeFilter, setGradeFilter, onClassify, countryCode }: Props) {
  const { grades: countryGrades, shortLabel } = useCountryGrades(countryCode);
  const GRADES = useMemo(
    () => [{ value: "", label: "الكل" }, ...countryGrades.map(g => ({ value: g.grade_code, label: shortLabel(g.grade_code) }))],
    [countryGrades, shortLabel]
  );
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState({ done: 0, total: 0 });

  const filtered = exercises.filter(e => {
    if (gradeFilter && e.grade !== gradeFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (searchQuery && !e.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkClassify = (type: string) => {
    selectedIds.forEach(id => onClassify(id, type));
    setSelectedIds(new Set());
  };

  // Heuristic auto-classifier (keyword based) for unclassified exercises
  const autoClassifyAll = async () => {
    const targets = filtered.filter(e => !e.type || e.type === "unclassified" || e.type === "other");
    if (targets.length === 0) {
      toast({ title: "لا توجد تمارين غير مصنفة في الفلتر الحالي" });
      return;
    }
    if (!confirm(`سيتم تصنيف ${targets.length} تمرين تلقائياً بناء على الكلمات المفتاحية. متابعة؟`)) return;

    setAutoRunning(true);
    setAutoProgress({ done: 0, total: targets.length });

    const guess = (text: string): string => {
      const t = text.toLowerCase();
      // Expansion / development
      if (/(انشر|طوّر|انشُر|وسّع|développ|expand)/i.test(t)) return "expand";
      // Factoring
      if (/(حلّل|عامل|فكّك|إلى عوامل|factoris|factor)/i.test(t)) return "factor";
      // Inequalities (Algerian: تراجح / Omani: متباينة)
      if (/(تراجح|متباين|متباينة|متباينات|inéquation|inequal|≤|≥|<|>)/i.test(t)) return "solve_inequality";
      // Equations
      if (/(معادل|عادل|équation|equation|حلّ.*معادل|أوجد قيم|أوجد قيمة س)/i.test(t)) return "solve_equation";
      // Proofs
      if (/(برهن|أثبت|بيّن أن|استنتج أن|démontr|prove)/i.test(t)) return "prove";
      // Geometry (incl. Omani: مجسّم، رؤوس، ضلع، محيط، مساحة)
      if (/(مثلث|دائر|مستقيم|زاوي|مجسّم|مجسم|رؤوس|أوجه|أضلاع|محيط|مساحة|حجم|متوازي|مستطيل|مربّع|مربع|triangle|cercle|géométr|cube|prism)/i.test(t)) return "geometry";
      // Statistics (incl. Omani: تمثيل بياني، جدول تكراري، نسبة، تحويل وحدات)
      if (/(تكرار|متوسط|وسيط|منوال|تمثيل بياني|جدول تكراري|بيانات|إحصاء|moyenne|médiane|نسبة|تناسب|تحويل|أسعار|سعر)/i.test(t)) return "statistics";
      // Probability
      if (/(احتمال|احتمالات|عشوائي|probabilit)/i.test(t)) return "probability";
      // Functions (incl. Omani: اقتران، تمثيل دالة)
      if (/(دالة|دوال|اقتران|اقترانات|fonction|f\(x\)|g\(x\))/i.test(t)) return "functions";
      // Simplify
      if (/(بسّط|بسط|اختزل|simplif)/i.test(t)) return "simplify";
      // Compute / evaluate
      if (/(احسب|أوجد قيمة|قدّر|calcul|compute|ناتج)/i.test(t)) return "compute";
      return "other";
    };

    let done = 0;
    for (const ex of targets) {
      const type = guess(ex.text);
      try {
        await onClassify(ex.id, type);
      } catch (e) { console.error(e); }
      done++;
      if (done % 5 === 0) setAutoProgress({ done, total: targets.length });
    }
    setAutoProgress({ done, total: targets.length });
    setAutoRunning(false);
    toast({ title: `تم تصنيف ${done} تمرين تلقائياً` });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="ابحث في التمارين..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        />
        <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
          {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
          <option value="">كل الأنواع</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
        </select>
        <button
          onClick={autoClassifyAll}
          disabled={autoRunning}
          className="px-3 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
          title="تصنيف تلقائي لكل التمارين غير المصنفة في الفلتر الحالي بناءً على الكلمات المفتاحية"
        >
          {autoRunning ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {autoProgress.done}/{autoProgress.total}</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> تصنيف تلقائي للكل</>
          )}
        </button>
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30"
          style={{ background: "hsl(var(--primary) / 0.08)" }}>
          <span className="text-sm font-bold text-primary">{selectedIds.size} محدد</span>
          <span className="text-xs text-muted-foreground">→ صنّف الكل:</span>
          <div className="flex gap-1 flex-wrap">
            {TYPES.slice(0, 6).map(t => (
              <button key={t.value} onClick={() => bulkClassify(t.value)}
                className="px-2 py-1 text-[11px] rounded border border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedIds(new Set())}
            className="mr-auto text-xs text-destructive font-medium">إلغاء</button>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-2">
        {pageItems.map(ex => (
          <div key={ex.id}
            className="glass-card rounded-lg p-4 flex gap-3 items-start transition-all"
            style={{ borderRight: selectedIds.has(ex.id) ? "3px solid hsl(var(--primary))" : "3px solid transparent" }}>
            <input type="checkbox" checked={selectedIds.has(ex.id)}
              onChange={() => toggleSelect(ex.id)}
              className="mt-1 accent-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-sm leading-relaxed line-clamp-3" dir="rtl"><MathExerciseRenderer text={ex.text} /></div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {ex.grade} {ex.stream && `• ${ex.stream}`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {ex.chapter}
                </span>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap max-w-[200px]">
              {TYPES.slice(0, 8).map(t => (
                <button key={t.value}
                  onClick={() => onClassify(ex.id, t.value)}
                  className="px-2 py-1 text-[10px] rounded border transition-all"
                  style={{
                    background: ex.type === t.value ? "hsl(var(--primary))" : "hsl(var(--card))",
                    color: ex.type === t.value ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                    borderColor: ex.type === t.value ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}>
                  {t.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {pageItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {exercises.length === 0 ? "لم يتم تحميل التمارين بعد" : "لا توجد نتائج مطابقة"}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="w-8 h-8 rounded text-xs font-semibold transition-all"
              style={{
                background: page === p ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: page === p ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                border: `1px solid ${page === p ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
              }}>
              {p}
            </button>
          ))}
          {totalPages > 10 && <span className="text-muted-foreground text-xs self-center">...</span>}
        </div>
      )}
    </div>
  );
}
