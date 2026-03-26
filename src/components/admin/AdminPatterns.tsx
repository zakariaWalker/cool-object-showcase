import { useState } from "react";
import { Pattern } from "./useAdminKBStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  patterns: Pattern[];
  onAdd: (p: Pattern) => void;
  onUpdate: (id: string, updates: Partial<Pattern>) => void;
  onDelete: (id: string) => void;
  reload: () => void;
}

const PATTERN_TYPES = [
  { value: "arithmetic", label: "حساب" },
  { value: "algebra", label: "جبر" },
  { value: "equations", label: "معادلات" },
  { value: "functions", label: "دوال" },
  { value: "calculus", label: "تحليل" },
  { value: "geometry_construction", label: "هندسة إنشائية" },
  { value: "triangle_circle", label: "مثلث ودائرة" },
  { value: "statistics", label: "إحصاء" },
  { value: "probability", label: "احتمالات" },
  { value: "sequences", label: "متتاليات" },
  { value: "transformations", label: "تحويلات" },
  { value: "number_sets", label: "مجموعات أعداد" },
  { value: "solids", label: "مجسمات" },
  { value: "bac_prep", label: "تحضير BAC" },
  { value: "prove", label: "برهان" },
];

export function AdminPatterns({ patterns, onAdd, onUpdate, onDelete, reload }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("algebra");
  const [newDescription, setNewDescription] = useState("");
  const [newSteps, setNewSteps] = useState<string[]>([""]);
  const [newConcepts, setNewConcepts] = useState<string[]>([""]);
  const [searchPattern, setSearchPattern] = useState("");
  const [typeFilterPat, setTypeFilterPat] = useState("");
  const [aiImproving, setAiImproving] = useState(false);

  // Inline edit state
  const [inlineName, setInlineName] = useState("");
  const [inlineDesc, setInlineDesc] = useState("");
  const [inlineType, setInlineType] = useState("");
  const [inlineSteps, setInlineSteps] = useState<string[]>([]);
  const [inlineConcepts, setInlineConcepts] = useState<string[]>([]);

  const editPattern = editId ? patterns.find(p => p.id === editId) : null;

  const filteredPatterns = patterns.filter(p => {
    if (typeFilterPat && p.type !== typeFilterPat) return false;
    if (searchPattern && !p.name.toLowerCase().includes(searchPattern.toLowerCase()) && !p.type.toLowerCase().includes(searchPattern.toLowerCase())) return false;
    return true;
  });

  const startInlineEdit = (p: Pattern) => {
    setEditId(p.id);
    setInlineName(p.name);
    setInlineDesc(p.description || "");
    setInlineType(p.type);
    setInlineSteps([...p.steps]);
    setInlineConcepts([...(p.concepts || [])]);
    setShowNew(false);
  };

  const saveInlineEdit = () => {
    if (!editId) return;
    onUpdate(editId, {
      name: inlineName,
      description: inlineDesc,
      type: inlineType,
      steps: inlineSteps.filter(s => s.trim()),
      concepts: inlineConcepts.filter(c => c.trim()),
    });
    toast.success("تم تحديث النمط ✓");
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    onAdd({
      id: `pat_${Date.now()}`,
      name: newName,
      type: newType,
      description: newDescription,
      steps: newSteps.filter(s => s.trim()),
      concepts: newConcepts.filter(c => c.trim()),
      examples: [],
      createdAt: new Date().toISOString(),
    });
    setNewName(""); setNewDescription(""); setNewSteps([""]); setNewConcepts([""]); setShowNew(false);
    toast.success("تم إنشاء النمط ✓");
  };

  // AI Improve all patterns
  const handleAIImprove = async () => {
    setAiImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-improve-patterns", {
        body: { patterns: patterns.map(p => ({ id: p.id, name: p.name, type: p.type, description: p.description, steps: p.steps, concepts: p.concepts })) },
      });
      if (error) throw error;
      if (data?.improved) {
        toast.success(`تم تحسين ${data.improved} نمط بالذكاء الاصطناعي ✨`);
        reload();
      }
    } catch (err) {
      toast.error("خطأ في تحسين الأنماط");
      console.error(err);
    } finally {
      setAiImproving(false);
    }
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Pattern list */}
      <div className="w-[300px] flex-shrink-0 flex flex-col gap-2 overflow-hidden">
        <button onClick={() => { setShowNew(true); setEditId(null); }}
          className="w-full px-4 py-2.5 rounded-lg text-sm font-bold text-primary-foreground transition-all btn-press"
          style={{ background: "hsl(var(--primary))" }}>
          + نمط جديد
        </button>

        <button onClick={handleAIImprove} disabled={aiImproving}
          className="w-full px-4 py-2 rounded-lg text-xs font-bold border border-accent/30 bg-accent/10 text-accent-foreground hover:bg-accent/20 transition-all disabled:opacity-50">
          {aiImproving ? "⏳ جارٍ التحسين..." : "🤖 تحسين تسمية الأنماط بالـ AI"}
        </button>

        <div className="flex gap-2">
          <input type="text" placeholder="ابحث..." value={searchPattern}
            onChange={e => setSearchPattern(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded border border-border bg-card text-foreground text-xs" />
          <select value={typeFilterPat} onChange={e => setTypeFilterPat(e.target.value)}
            className="px-2 py-1.5 rounded border border-border bg-card text-foreground text-[10px]">
            <option value="">الكل</option>
            {PATTERN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="text-[10px] text-muted-foreground px-1">{filteredPatterns.length} نمط</div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filteredPatterns.map(p => (
            <div key={p.id}
              onClick={() => startInlineEdit(p)}
              className="glass-card rounded-lg p-3 cursor-pointer card-hover transition-all"
              style={{ borderRight: editId === p.id ? "3px solid hsl(var(--primary))" : "3px solid transparent" }}>
              <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{PATTERN_TYPES.find(t => t.value === p.type)?.label || p.type} • {p.steps.length} خطوات</div>
              {p.description && <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex-1 glass-card rounded-lg p-6 overflow-y-auto">
        {showNew ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">نمط جديد</h3>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">اسم النمط</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                placeholder="مثال: نشر وتبسيط عبارة جبرية" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">الوصف</label>
              <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm h-16 resize-none"
                placeholder="وصف دقيق لمتى وكيف يُستخدم هذا النمط..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">النوع</label>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                {PATTERN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">خطوات الحل</label>
              {newSteps.map((step, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold">{i+1}</span>
                  <input value={step} onChange={e => { const n = [...newSteps]; n[i] = e.target.value; setNewSteps(n); }}
                    className="flex-1 px-3 py-1.5 rounded border border-border bg-background text-foreground text-sm" placeholder="وصف الخطوة..." />
                  {newSteps.length > 1 && <button onClick={() => setNewSteps(p => p.filter((_, j) => j !== i))} className="text-destructive text-xs">✕</button>}
                </div>
              ))}
              <button onClick={() => setNewSteps(p => [...p, ""])} className="text-xs text-primary font-medium">+ خطوة</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">المفاهيم الأساسية</label>
              {newConcepts.map((c, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <input value={c} onChange={e => { const n = [...newConcepts]; n[i] = e.target.value; setNewConcepts(n); }}
                    className="flex-1 px-3 py-1.5 rounded border border-border bg-background text-foreground text-sm" placeholder="مفهوم..." />
                  {newConcepts.length > 1 && <button onClick={() => setNewConcepts(p => p.filter((_, j) => j !== i))} className="text-destructive text-xs">✕</button>}
                </div>
              ))}
              <button onClick={() => setNewConcepts(p => [...p, ""])} className="text-xs text-primary font-medium">+ مفهوم</button>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm font-bold text-primary-foreground btn-press" style={{ background: "hsl(var(--primary))" }}>حفظ</button>
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground">إلغاء</button>
            </div>
          </div>
        ) : editPattern ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">تعديل النمط</h3>
              <button onClick={() => { onDelete(editPattern.id); setEditId(null); }}
                className="text-xs text-destructive font-medium px-3 py-1 border border-destructive/30 rounded bg-destructive/10">🗑️ حذف</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">الاسم</label>
              <input value={inlineName} onChange={e => setInlineName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">الوصف</label>
              <textarea value={inlineDesc} onChange={e => setInlineDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm h-20 resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">النوع</label>
              <select value={inlineType} onChange={e => setInlineType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                {PATTERN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">خطوات الحل</label>
              {inlineSteps.map((step, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[11px] flex items-center justify-center font-bold">{i+1}</span>
                  <input value={step} onChange={e => { const n = [...inlineSteps]; n[i] = e.target.value; setInlineSteps(n); }}
                    className="flex-1 px-3 py-1.5 rounded border border-border bg-background text-foreground text-sm" />
                  {inlineSteps.length > 1 && <button onClick={() => setInlineSteps(p => p.filter((_, j) => j !== i))} className="text-destructive text-xs">✕</button>}
                </div>
              ))}
              <button onClick={() => setInlineSteps(p => [...p, ""])} className="text-xs text-primary font-medium">+ خطوة</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">المفاهيم</label>
              {inlineConcepts.map((c, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <input value={c} onChange={e => { const n = [...inlineConcepts]; n[i] = e.target.value; setInlineConcepts(n); }}
                    className="flex-1 px-3 py-1.5 rounded border border-border bg-background text-foreground text-sm" />
                  {inlineConcepts.length > 1 && <button onClick={() => setInlineConcepts(p => p.filter((_, j) => j !== i))} className="text-destructive text-xs">✕</button>}
                </div>
              ))}
              <button onClick={() => setInlineConcepts(p => [...p, ""])} className="text-xs text-primary font-medium">+ مفهوم</button>
            </div>
            <button onClick={saveInlineEdit}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-primary-foreground btn-press"
              style={{ background: "hsl(var(--primary))" }}>
              💾 حفظ التعديلات
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            اختر نمطاً من القائمة أو أنشئ نمطاً جديداً
          </div>
        )}
      </div>
    </div>
  );
}
