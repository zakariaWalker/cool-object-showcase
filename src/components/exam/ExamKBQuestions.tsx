// ===== Exam KB Questions — View, classify, edit imported questions =====
import { useState } from "react";
import { TYPE_LABELS_AR } from "@/engine/exam-types";

interface Props {
  store: ReturnType<typeof import("./useExamKBStore").useExamKBStore>;
}

const DIFFICULTY_LABELS: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "hsl(var(--geometry))", medium: "hsl(var(--statistics))", hard: "hsl(var(--destructive))"
};

const ALL_TYPES = Object.keys(TYPE_LABELS_AR).filter(t => t !== "unclassified" && t !== "other");

export function ExamKBQuestions({ store }: Props) {
  const [examFilter, setExamFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = store.questions.filter(q => {
    if (examFilter !== "all" && q.examId !== examFilter) return false;
    if (typeFilter !== "all" && q.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-black text-foreground">📋 أسئلة الامتحانات ({store.questions.length})</h2>
        <div className="flex items-center gap-2">
          <select value={examFilter} onChange={e => setExamFilter(e.target.value)}
            className="text-[11px] px-2 py-1 rounded border border-border bg-card text-foreground">
            <option value="all">كل الامتحانات</option>
            {store.exams.map(e => (
              <option key={e.id} value={e.id}>{e.format.toUpperCase()} {e.year} {e.session}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-[11px] px-2 py-1 rounded border border-border bg-card text-foreground">
            <option value="all">كل الأنواع</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS_AR[t]}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">لا توجد أسئلة. استورد امتحاناً أولاً.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => {
            const exam = store.exams.find(e => e.id === q.examId);
            const isEditing = editingId === q.id;
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {exam?.format.toUpperCase()} {exam?.year}
                    </span>
                    <span className="text-xs font-bold text-foreground">{q.sectionLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold" style={{ color: DIFFICULTY_COLORS[q.difficulty] }}>
                      {DIFFICULTY_LABELS[q.difficulty]}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{q.points} ن</span>
                    {q.linkedPatternIds.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-bold">
                        🔗 {q.linkedPatternIds.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Text */}
                <div className="text-xs text-foreground leading-relaxed bg-muted/20 rounded-lg p-3 mb-3 whitespace-pre-wrap">
                  {q.text}
                </div>

                {/* Classification */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-[9px] text-muted-foreground">النوع:</label>
                  <select value={q.type}
                    onChange={e => store.updateQuestion(q.id, { type: e.target.value })}
                    className="text-[10px] px-2 py-0.5 rounded border border-border bg-background text-foreground">
                    <option value="unclassified">غير مصنف</option>
                    {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS_AR[t]}</option>)}
                  </select>

                  <label className="text-[9px] text-muted-foreground mr-2">الصعوبة:</label>
                  {(["easy", "medium", "hard"] as const).map(d => (
                    <button key={d} onClick={() => store.updateQuestion(q.id, { difficulty: d })}
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold transition-all"
                      style={{
                        background: q.difficulty === d ? DIFFICULTY_COLORS[d] + "22" : "transparent",
                        color: q.difficulty === d ? DIFFICULTY_COLORS[d] : "hsl(var(--muted-foreground))",
                        border: `1px solid ${q.difficulty === d ? DIFFICULTY_COLORS[d] : "hsl(var(--border))"}`,
                      }}>
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}

                  <button onClick={() => store.deleteQuestion(q.id)}
                    className="mr-auto text-[9px] text-destructive/50 hover:text-destructive">🗑️</button>
                </div>

                {/* Concepts */}
                {isEditing ? (
                  <div className="mt-2">
                    <input
                      defaultValue={q.concepts.join("، ")}
                      onBlur={e => {
                        const concepts = e.target.value.split(/[,،]/).map(c => c.trim()).filter(Boolean);
                        store.updateQuestion(q.id, { concepts });
                        setEditingId(null);
                      }}
                      className="w-full text-[10px] px-2 py-1 rounded border border-border bg-background text-foreground"
                      placeholder="المفاهيم (مفصولة بفاصلة)"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {q.concepts.map(c => (
                      <span key={c} className="text-[8px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c}</span>
                    ))}
                    <button onClick={() => setEditingId(q.id)}
                      className="text-[8px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground">
                      + مفاهيم
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
