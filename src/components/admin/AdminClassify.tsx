import { useState } from "react";
import { Exercise } from "./useAdminKBStore";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  exercises: Exercise[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  gradeFilter: string;
  setGradeFilter: (g: string) => void;
  onClassify: (id: string, type: string) => void;
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

const GRADES = [
  { value: "", label: "الكل" },
  { value: "middle_1", label: "1AM" }, { value: "middle_2", label: "2AM" },
  { value: "middle_3", label: "3AM" }, { value: "middle_4", label: "4AM" },
  { value: "secondary_1", label: "1AS" }, { value: "secondary_2", label: "2AS" },
  { value: "secondary_3", label: "3AS" },
];

const PAGE_SIZE = 30;

export function AdminClassify({ exercises, searchQuery, setSearchQuery, gradeFilter, setGradeFilter, onClassify }: Props) {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("");

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
