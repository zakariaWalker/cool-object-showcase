import { useState, useMemo } from "react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { DeconstructionImporter } from "./DeconstructionImporter";
import { ruleBasedDeconstruct } from "./ruleBasedDeconstructor";

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  deconstructions: Deconstruction[];
  onAdd: (d: Deconstruction) => void;
  onUpdateDeconstruction: (id: string, updates: Partial<Deconstruction>) => void;
  onDeleteDeconstruction: (id: string) => void;
  reload: () => void;
  countryCode: string;
}

const PAGE_SIZE = 20;

type DeconFilter = "all" | "deconstructed" | "not_deconstructed";

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};

export function AdminDeconstruct({ exercises, patterns, deconstructions, onAdd, onUpdateDeconstruction, onDeleteDeconstruction, reload, countryCode }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deconFilter, setDeconFilter] = useState<DeconFilter>("all");
  const [showDeconPanel, setShowDeconPanel] = useState(true);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);
  const [selectedPatId, setSelectedPatId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState({ done: 0, total: 0 });
  const [editingDeconId, setEditingDeconId] = useState<string | null>(null);
  const [editSteps, setEditSteps] = useState<string[]>([]);
  const [editNeeds, setEditNeeds] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editPatternId, setEditPatternId] = useState("");

  const deconMap = useMemo(() => {
    const map = new Map<string, Deconstruction[]>();
    deconstructions.forEach(d => {
      const list = map.get(d.exerciseId) || [];
      list.push(d);
      map.set(d.exerciseId, list);
    });
    return map;
  }, [deconstructions]);

  const deconIds = useMemo(() => new Set(deconstructions.map(d => d.exerciseId)), [deconstructions]);
  const types = useMemo(() => [...new Set(exercises.map(e => e.type).filter(t => t && t !== "unclassified"))].sort(), [exercises]);

  const filtered = useMemo(() => exercises.filter(e => {
    if (gradeFilter && e.grade !== gradeFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (deconFilter === "deconstructed" && !deconIds.has(e.id)) return false;
    if (deconFilter === "not_deconstructed" && deconIds.has(e.id)) return false;
    return true;
  }), [exercises, gradeFilter, typeFilter, search, deconFilter, deconIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Auto-select first exercise in filtered list when filter changes and no valid selection
  const selectedEx = useMemo(() => {
    if (selectedExId) {
      const found = filtered.find(e => e.id === selectedExId);
      if (found) return found;
    }
    return null;
  }, [selectedExId, filtered]);

  const selectedPat = selectedPatId ? patterns.find(p => p.id === selectedPatId) : null;
  const selectedExDeconstructions = selectedEx ? (deconMap.get(selectedEx.id) || []) : [];

  const stats = useMemo(() => ({
    total: exercises.length,
    deconstructed: deconIds.size,
    notDeconstructed: exercises.length - deconIds.size,
    percentage: exercises.length ? Math.round((deconIds.size / exercises.length) * 100) : 0,
  }), [exercises, deconIds]);

  const handleSave = () => {
    if (!selectedExId) return;
    const ex = exercises.find(e => e.id === selectedExId);
    onAdd({
      id: crypto.randomUUID(),
      exerciseId: selectedExId,
      patternId: selectedPatId || "",
      needs: [],
      notes,
      countryCode: (ex as any)?.countryCode || "DZ",
      createdAt: new Date().toISOString(),
    });
    setSelectedPatId(null);
    setNotes("");
  };

  // Start editing a deconstruction
  const startEdit = (d: Deconstruction) => {
    setEditingDeconId(d.id);
    setEditSteps([...(d.steps || [])]);
    setEditNeeds([...(d.needs || [])]);
    setEditNotes(d.notes || "");
    setEditPatternId(d.patternId);
  };

  const saveEdit = () => {
    if (!editingDeconId) return;
    onUpdateDeconstruction(editingDeconId, {
      steps: editSteps.filter(s => s.trim()),
      needs: editNeeds.filter(n => n.trim()),
      notes: editNotes,
      patternId: editPatternId,
    });
    setEditingDeconId(null);
    toast.success("تم تحديث التفكيك ✓");
  };

  const handleDelete = (id: string) => {
    onDeleteDeconstruction(id);
    setEditingDeconId(null);
    toast.success("تم حذف التفكيك");
  };

  // AI Auto-Deconstruct
  const handleAIDeconstruct = async (scope: "page" | "filtered" | "all_remaining") => {
    const source = scope === "page" ? pageItems : scope === "filtered" ? filtered : exercises;
    const notDeconstructed = source.filter(e => !deconIds.has(e.id));

    if (notDeconstructed.length === 0) {
      toast.info("كل التمارين مفكّكة بالفعل!");
      return;
    }

    setAiLoading(true);
    setAiProgress({ done: 0, total: notDeconstructed.length });

    const CHUNK = 10;
    let processed = 0;

    try {
      for (let i = 0; i < notDeconstructed.length; i += CHUNK) {
        const chunk = notDeconstructed.slice(i, i + CHUNK);
        const { data, error } = await supabase.functions.invoke("ai-deconstruct", {
          body: {
            exercises: chunk.map(e => ({ id: e.id, text: e.text, type: e.type, grade: e.grade })),
            patterns: patterns.map(p => ({ id: p.id, name: p.name, type: p.type, steps: p.steps })),
            batchSize: 5,
          },
        });
        if (error) {
          toast.error(`خطأ: ${error.message}`);
          break;
        }
        processed += data?.processed || 0;
        setAiProgress({ done: processed, total: notDeconstructed.length });
        if (data?.error) { toast.error(data.error); break; }
      }
      toast.success(`تم تفكيك ${processed} تمرين بالذكاء الاصطناعي ✨`);
      reload();
    } catch (err) {
      toast.error("خطأ غير متوقع");
    } finally {
      setAiLoading(false);
    }
  };

  // Rule-based instant deconstruction — no AI, no network calls per exercise
  const handleRuleDeconstruct = async (scope: "page" | "filtered" | "all_remaining") => {
    const source = scope === "page" ? pageItems : scope === "filtered" ? filtered : exercises;
    const notDeconstructed = source.filter(e => !deconIds.has(e.id));

    if (notDeconstructed.length === 0) {
      toast.info("كل التمارين مفكّكة بالفعل!");
      return;
    }
    if (patterns.length === 0) {
      toast.error("لا توجد أنماط في قاعدة البيانات. أنشئ أنماطاً أولاً.");
      return;
    }

    setAiLoading(true);
    setAiProgress({ done: 0, total: notDeconstructed.length });

    try {
      const results = ruleBasedDeconstruct(notDeconstructed, patterns, deconIds);
      const created = results.filter(r => r.deconstruction).map(r => r.deconstruction!);
      const skipped = results.length - created.length;

      // Persist sequentially via onAdd (already debounced through the store)
      let done = 0;
      for (const d of created) {
        onAdd(d);
        done++;
        if (done % 25 === 0) {
          setAiProgress({ done, total: created.length });
          // micro yield to keep UI responsive on huge batches
          await new Promise(r => setTimeout(r, 0));
        }
      }
      setAiProgress({ done: created.length, total: created.length });

      toast.success(
        `⚡ تفكيك فوريّ: ${created.length} تمرين${skipped ? ` • تخطّينا ${skipped} (لا يوجد نمط مطابق)` : ""}`
      );
      reload();
    } catch (err) {
      toast.error("خطأ غير متوقع في التفكيك الآلي");
      console.error("[ruleBasedDeconstruct]", err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "المجموع", value: stats.total, color: "hsl(var(--foreground))", filter: "all" as DeconFilter },
          { label: "مفكّك ✓", value: stats.deconstructed, color: "hsl(var(--primary))", filter: "deconstructed" as DeconFilter },
          { label: "غير مفكّك", value: stats.notDeconstructed, color: "hsl(var(--accent))", filter: "not_deconstructed" as DeconFilter },
          { label: "التقدم", value: `${stats.percentage}%`, color: "hsl(var(--geometry))", filter: "all" as DeconFilter },
        ].map((c, i) => (
          <div key={i} className="glass-card rounded-lg p-3 text-center cursor-pointer border transition-all hover:border-primary/30"
            style={{ borderColor: deconFilter === c.filter && i < 3 ? "hsl(var(--primary))" : undefined }}
            onClick={() => i < 3 && setDeconFilter(c.filter)}>
            <div className="text-xl font-black" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-muted-foreground">{c.label}</div>
            {i === 3 && (
              <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${stats.percentage}%`, background: "hsl(var(--geometry))" }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Controls */}
      <div className="glass-card rounded-lg p-4 border border-accent/30">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-foreground">🤖 تفكيك آلي بالذكاء الاصطناعي</h4>
          {aiLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-xs text-muted-foreground">{aiProgress.done}/{aiProgress.total}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleAIDeconstruct("page")} disabled={aiLoading}
            className="px-4 py-2 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:bg-accent transition-all disabled:opacity-50">
            🔄 الصفحة الحالية
          </button>
          <button onClick={() => handleAIDeconstruct("filtered")} disabled={aiLoading}
            className="px-4 py-2 rounded-lg text-xs font-bold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-50">
            ⚡ المفلترة ({filtered.filter(e => !deconIds.has(e.id)).length})
          </button>
          <button onClick={() => handleAIDeconstruct("all_remaining")} disabled={aiLoading}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
            🚀 الكل ({stats.notDeconstructed})
          </button>
        </div>
        {aiLoading && (
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all bg-primary"
                style={{ width: `${aiProgress.total ? (aiProgress.done / aiProgress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* JSON Bulk Importer */}
      <DeconstructionImporter
        exercises={exercises}
        patterns={patterns}
        countryCode={countryCode}
        onAdd={onAdd}
      />

      <div className="flex gap-4" style={{ height: "calc(100vh - 420px)" }}>

        {/* Exercise list */}
        <div className="w-[380px] flex-shrink-0 flex flex-col gap-3 overflow-hidden">
          <div className="flex gap-2 flex-wrap">
            <input type="text" placeholder="ابحث..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm" />
            <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); setSelectedExId(null); }}
              className="px-2 py-2 rounded-lg border border-border bg-card text-foreground text-xs">
              <option value="">كل المستويات</option>
              {Object.entries(GRADE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); setSelectedExId(null); }}
              className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-[11px]">
              <option value="">كل الأنواع</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={deconFilter} onChange={e => { setDeconFilter(e.target.value as DeconFilter); setPage(1); setSelectedExId(null); }}
              className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-card text-foreground text-[11px]">
              <option value="all">الكل</option>
              <option value="deconstructed">✓ مفكّك</option>
              <option value="not_deconstructed">✗ غير مفكّك</option>
            </select>
          </div>
          <div className="text-[10px] text-muted-foreground px-1">{filtered.length} نتيجة</div>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {pageItems.map(ex => {
              const isDecon = deconIds.has(ex.id);
              return (
                <div key={ex.id}
                  onClick={() => { setSelectedExId(ex.id); setEditingDeconId(null); }}
                  className="p-3 rounded-lg cursor-pointer transition-all text-sm border"
                  style={{
                    background: selectedExId === ex.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                    borderColor: selectedExId === ex.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
                    borderRight: isDecon ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    {isDecon && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">✓ مفكّك</span>}
                    <span className="text-[10px] text-muted-foreground mr-auto">{GRADE_LABELS[ex.grade] || ex.grade} • {ex.type}</span>
                  </div>
                  <div className="text-foreground line-clamp-2 text-xs leading-relaxed" dir="rtl">{ex.text}</div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-1 pt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 text-xs text-primary disabled:opacity-30">←</button>
              <span className="text-xs text-muted-foreground self-center">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 text-xs text-primary disabled:opacity-30">→</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 glass-card rounded-lg p-6 overflow-y-auto">
          {selectedEx ? (
            <div className="space-y-5">
              {/* Exercise display with smart rendering */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-foreground">تفكيك التمرين</h3>
                  <div className="flex gap-1.5 mr-auto">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{GRADE_LABELS[selectedEx.grade] || selectedEx.grade}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{selectedEx.type}</span>
                    {selectedEx.chapter && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{selectedEx.chapter}</span>}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <MathExerciseRenderer text={selectedEx.text} />
                </div>
              </div>

              {/* Existing deconstructions with edit capability */}
              {selectedExDeconstructions.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">
                    التفكيكات الموجودة ({selectedExDeconstructions.length})
                  </label>
                  <div className="space-y-2">
                    {selectedExDeconstructions.map(d => {
                      const pat = patterns.find(p => p.id === d.patternId);
                      const isEditing = editingDeconId === d.id;

                      if (isEditing) {
                        return (
                          <div key={d.id} className="p-4 rounded-lg bg-accent/10 border-2 border-accent/40 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-accent-foreground">✏️ تعديل التفكيك</span>
                              <button onClick={() => setEditingDeconId(null)} className="mr-auto text-xs text-muted-foreground">✕ إلغاء</button>
                            </div>

                            {/* Pattern selector */}
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">النمط</label>
                              <select value={editPatternId} onChange={e => setEditPatternId(e.target.value)}
                                className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs">
                                {patterns.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                              </select>
                            </div>

                            {/* Steps editor */}
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">خطوات الحل</label>
                              {editSteps.map((step, i) => (
                                <div key={i} className="flex gap-2 items-center mb-1">
                                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[9px] flex items-center justify-center font-bold flex-shrink-0">{i+1}</span>
                                  <input value={step} onChange={e => {
                                    const next = [...editSteps]; next[i] = e.target.value; setEditSteps(next);
                                  }} className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground text-xs" />
                                  <button onClick={() => setEditSteps(prev => prev.filter((_, j) => j !== i))}
                                    className="text-destructive text-[10px]">✕</button>
                                </div>
                              ))}
                              <button onClick={() => setEditSteps(prev => [...prev, ""])}
                                className="text-[10px] text-primary font-medium mt-1">+ خطوة</button>
                            </div>

                            {/* Needs editor */}
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">المتطلبات المسبقة</label>
                              {editNeeds.map((need, i) => (
                                <div key={i} className="flex gap-2 items-center mb-1">
                                  <input value={need} onChange={e => {
                                    const next = [...editNeeds]; next[i] = e.target.value; setEditNeeds(next);
                                  }} className="flex-1 px-2 py-1 rounded border border-border bg-background text-foreground text-xs" />
                                  <button onClick={() => setEditNeeds(prev => prev.filter((_, j) => j !== i))}
                                    className="text-destructive text-[10px]">✕</button>
                                </div>
                              ))}
                              <button onClick={() => setEditNeeds(prev => [...prev, ""])}
                                className="text-[10px] text-primary font-medium mt-1">+ متطلب</button>
                            </div>

                            {/* Notes */}
                            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs h-14 resize-none"
                              placeholder="ملاحظات..." />

                            <div className="flex gap-2">
                              <button onClick={saveEdit}
                                className="px-4 py-1.5 rounded-lg text-xs font-bold text-primary-foreground bg-primary">
                                💾 حفظ التعديل
                              </button>
                              <button onClick={() => handleDelete(d.id)}
                                className="px-4 py-1.5 rounded-lg text-xs font-bold text-destructive border border-destructive/30 bg-destructive/10">
                                🗑️ حذف
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={d.id} className="p-3 rounded-lg bg-primary/5 border border-primary/20 group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary">{pat?.name || d.patternId}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{pat?.type}</span>
                            <button onClick={() => startEdit(d)}
                              className="mr-auto text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              ✏️ تعديل
                            </button>
                          </div>
                          {d.steps && d.steps.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {d.steps.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                                  <span>{s}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {d.needs && d.needs.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-2">
                              {d.needs.map((n, i) => (
                                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/20 text-secondary-foreground">{n}</span>
                              ))}
                            </div>
                          )}
                          {d.notes && <p className="text-[10px] text-muted-foreground mt-2 italic">{d.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual add deconstruction */}
              <div className="border-t border-border pt-4">
                <label className="text-xs font-semibold text-muted-foreground block mb-2">إضافة تفكيك يدوي</label>
                <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                  {patterns.map(p => (
                    <div key={p.id} onClick={() => setSelectedPatId(p.id)}
                      className="p-2 rounded-lg cursor-pointer border transition-all text-xs"
                      style={{
                        background: selectedPatId === p.id ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
                        borderColor: selectedPatId === p.id ? "hsl(var(--primary))" : "hsl(var(--border))",
                      }}>
                      <div className="font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-muted-foreground mt-0.5">{p.type} • {p.steps.length} خطوات</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPat && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">خطوات: {selectedPat.name}</label>
                  <div className="space-y-1">
                    {selectedPat.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded text-xs">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                        <span className="text-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm h-14 resize-none"
                placeholder="ملاحظات..." />

              <button onClick={handleSave} disabled={!selectedPatId}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-primary-foreground btn-press disabled:opacity-50"
                style={{ background: "hsl(var(--primary))" }}>
                حفظ التفكيك
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              اختر تمريناً من القائمة لتفكيكه أو استخدم التفكيك الآلي
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
