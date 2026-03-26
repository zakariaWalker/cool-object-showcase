// ===== Exam KB Links — Link exam questions to primary KB patterns =====
import { useState, useMemo } from "react";
import { TYPE_LABELS_AR } from "@/engine/exam-types";
import { motion } from "framer-motion";

interface Props {
  store: ReturnType<typeof import("./useExamKBStore").useExamKBStore>;
  primaryKB: ReturnType<typeof import("@/components/admin/useAdminKBStore").useAdminKBStore>;
}

export function ExamKBLinks({ store, primaryKB }: Props) {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [filterLinked, setFilterLinked] = useState<"all" | "linked" | "unlinked">("all");

  const filtered = store.questions.filter(q => {
    if (filterLinked === "linked") return q.linkedPatternIds.length > 0;
    if (filterLinked === "unlinked") return q.linkedPatternIds.length === 0;
    return true;
  });

  const linkedCount = store.questions.filter(q => q.linkedPatternIds.length > 0).length;
  const totalCount = store.questions.length;
  const linkPct = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;

  const selectedQ = store.questions.find(q => q.id === selectedQuestion);
  const matchingPatterns = useMemo(() => {
    if (!selectedQ) return [];
    return primaryKB.patterns.filter(p =>
      p.type === selectedQ.type ||
      (p.concepts || []).some(c => selectedQ.concepts.includes(c))
    ).map(p => ({
      ...p,
      isLinked: selectedQ.linkedPatternIds.includes(p.id),
      matchScore: (p.type === selectedQ.type ? 2 : 0) +
        (p.concepts || []).filter(c => selectedQ.concepts.includes(c)).length,
    })).sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedQ, primaryKB.patterns]);

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">🔗 ربط أسئلة الامتحانات مع قاعدة المعرفة الأساسية</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold" style={{ color: linkPct >= 70 ? "hsl(var(--geometry))" : "hsl(var(--statistics))" }}>
              {linkPct}% مرتبطة
            </span>
            <button onClick={() => store.autoLinkAll()}
              className="text-[11px] px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all">
              🤖 ربط تلقائي
            </button>
          </div>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${linkPct}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full bg-primary" />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
          <span>✅ {linkedCount} مرتبطة</span>
          <span>❌ {totalCount - linkedCount} غير مرتبطة</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(["all", "unlinked", "linked"] as const).map(f => {
          const labels = { all: "الكل", linked: "مرتبطة", unlinked: "غير مرتبطة" };
          return (
            <button key={f} onClick={() => setFilterLinked(f)}
              className="text-[10px] px-3 py-1 rounded-full font-bold transition-all"
              style={{
                background: filterLinked === f ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: filterLinked === f ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}>
              {labels[f]} ({f === "all" ? totalCount : f === "linked" ? linkedCount : totalCount - linkedCount})
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Questions list */}
        <div className="rounded-xl border border-border bg-card p-4 max-h-[600px] overflow-y-auto">
          <h4 className="text-xs font-black text-foreground mb-3">📋 الأسئلة</h4>
          <div className="space-y-2">
            {filtered.map(q => {
              const exam = store.exams.find(e => e.id === q.examId);
              const isSelected = selectedQuestion === q.id;
              return (
                <button key={q.id} onClick={() => setSelectedQuestion(q.id)}
                  className={`w-full text-right p-3 rounded-lg border transition-all ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {exam?.format.toUpperCase()} {exam?.year}
                      </span>
                      <span className="text-[10px] font-bold text-foreground">{q.sectionLabel}</span>
                    </div>
                    {q.linkedPatternIds.length > 0 ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: "hsl(var(--geometry) / 0.1)", color: "hsl(var(--geometry))" }}>
                        🔗 {q.linkedPatternIds.length}
                      </span>
                    ) : (
                      <span className="text-[9px] text-destructive/60">غير مرتبط</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2">{q.text}</div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      {TYPE_LABELS_AR[q.type] || q.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pattern matcher */}
        <div className="rounded-xl border border-border bg-card p-4 max-h-[600px] overflow-y-auto">
          {selectedQ ? (
            <>
              <h4 className="text-xs font-black text-foreground mb-1">🧩 أنماط مطابقة</h4>
              <p className="text-[9px] text-muted-foreground mb-3">
                {TYPE_LABELS_AR[selectedQ.type] || selectedQ.type} — {selectedQ.concepts.join("، ") || "بدون مفاهيم"}
              </p>

              {matchingPatterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  لا توجد أنماط مطابقة. أضف مفاهيم أو صنّف السؤال.
                </div>
              ) : (
                <div className="space-y-2">
                  {matchingPatterns.map(p => (
                    <div key={p.id} className={`p-3 rounded-lg border transition-all ${
                      p.isLinked ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-foreground">{p.name}</span>
                        <button
                          onClick={() => p.isLinked
                            ? store.unlinkPattern(selectedQ.id, p.id)
                            : store.linkToPattern(selectedQ.id, p.id)
                          }
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all ${
                            p.isLinked
                              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}>
                          {p.isLinked ? "إلغاء الربط" : "+ ربط"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        <span>{TYPE_LABELS_AR[p.type] || p.type}</span>
                        <span>·</span>
                        <span>تطابق: {p.matchScore}</span>
                        {(p.concepts || []).length > 0 && (
                          <>
                            <span>·</span>
                            <span>{(p.concepts || []).slice(0, 3).join("، ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All patterns (unmatched) */}
              <div className="border-t border-border mt-4 pt-3">
                <h5 className="text-[10px] font-bold text-muted-foreground mb-2">📦 كل الأنماط ({primaryKB.patterns.length})</h5>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {primaryKB.patterns
                    .filter(p => !matchingPatterns.some(m => m.id === p.id))
                    .map(p => {
                      const isLinked = selectedQ.linkedPatternIds.includes(p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/30">
                          <span className="text-[9px] text-muted-foreground truncate flex-1">{p.name}</span>
                          <button
                            onClick={() => isLinked
                              ? store.unlinkPattern(selectedQ.id, p.id)
                              : store.linkToPattern(selectedQ.id, p.id)
                            }
                            className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                              isLinked ? "text-destructive" : "text-primary hover:bg-primary/10"
                            }`}>
                            {isLinked ? "✕" : "+"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-3xl mb-3">👈</div>
              <p className="text-xs">اختر سؤالاً لعرض الأنماط المطابقة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
