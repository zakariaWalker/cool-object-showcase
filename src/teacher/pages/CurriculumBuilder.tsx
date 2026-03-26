import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CurriculumBuilder = () => {
  const { user } = useAuth();
  const [curricula, setCurricula] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("curricula")
      .select("*, lessons(count)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setCurricula(data ?? []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!user || !title.trim()) { toast.error("عنوان المنهج مطلوب"); return; }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("curricula")
      .insert({ teacher_id: user.id, title: title.trim(), description, grade_level: gradeLevel });
    setSaving(false);
    if (error) { toast.error("فشل في إنشاء المنهج"); return; }
    toast.success("تم إنشاء المنهج بنجاح");
    setShowForm(false); setTitle(""); setDescription(""); setGradeLevel("");
    load();
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await (supabase as any).from("curricula").update({ is_published: !current }).eq("id", id);
    if (error) { toast.error("فشل في تغيير حالة النشر"); return; }
    load();
  };

  const deleteCurriculum = async (id: string) => {
    const { error } = await (supabase as any).from("curricula").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف المنهج"); return; }
    toast.success("تم حذف المنهج");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">خطط المواضيع والأهداف التعليمية</p>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> منهج جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المنهج *" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المنهج" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" rows={3} />
          <input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="المستوى الدراسي" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !title.trim()} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {saving && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              إنشاء
            </button>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground text-sm hover:text-foreground">إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {curricula.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد مناهج بعد</p>}
        {curricula.map((c: any, i: number) => (
          <div key={c.id} className="bg-card rounded-2xl border border-border p-5 card-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-bold">{i + 1}</div>
                <div>
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">{c.grade_level ?? "بدون مستوى"} · {c.lessons?.[0]?.count ?? 0} دروس</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => togglePublish(c.id, c.is_published)} className={`text-xs px-3 py-1 rounded-full transition-colors ${c.is_published ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>
                  {c.is_published ? "منشور" : "مسودة"}
                </button>
                <button onClick={() => deleteCurriculum(c.id)} className="text-destructive/60 hover:text-destructive p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CurriculumBuilder;
