import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Users, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ClassManagement = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [{ data: cData }, { data: currData }] = await Promise.all([
      (supabase as any).from("classes").select("*, curricula(title), class_enrollments(count)").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("curricula").select("id, title").eq("teacher_id", user.id),
    ]);
    setClasses(cData ?? []);
    setCurricula(currData ?? []);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!user || !name.trim()) { toast.error("اسم الفصل مطلوب"); return; }
    setSaving(true);
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await (supabase as any).from("classes").insert({ teacher_id: user.id, name: name.trim(), join_code: joinCode, curriculum_id: selectedCurriculum || null });
    setSaving(false);
    if (error) { toast.error("فشل في إنشاء الفصل: " + error.message); return; }
    toast.success("تم إنشاء الفصل بنجاح");
    setShowForm(false); setName(""); setSelectedCurriculum("");
    loadData();
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("تم نسخ الرمز: " + code); };

  const deleteClass = async (id: string) => {
    const { error } = await (supabase as any).from("classes").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف الفصل"); return; }
    toast.success("تم حذف الفصل");
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">إدارة الفصول الدراسية والطلاب</p>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> فصل جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفصل *" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <select value={selectedCurriculum} onChange={(e) => setSelectedCurriculum(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground">
            <option value="">اختر المنهج المرتبط (اختياري)</option>
            {curricula.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !name.trim()} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {saving && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              إنشاء الفصل
            </button>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground text-sm hover:text-foreground">إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {classes.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد فصول دراسية بعد</p>}
        {classes.map((c: any) => (
          <div key={c.id} className="bg-card rounded-2xl border border-border p-6 card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Users className="w-6 h-6 text-primary" /></div>
                <div>
                  <h3 className="font-bold text-lg">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">المنهج: {c.curricula?.title || "غير محدد"}</p>
                </div>
              </div>
              <button onClick={() => deleteClass(c.id)} className="text-destructive/60 hover:text-destructive p-2"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center border border-border">
                <p className="text-2xl font-black text-primary mb-1">{c.join_code}</p>
                <button onClick={() => copyCode(c.join_code)} className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-primary"><Copy className="w-3 h-3" /> نسخ رمز الانضمام</button>
              </div>
              <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center border border-border">
                <p className="text-2xl font-black mb-1">{c.class_enrollments?.[0]?.count ?? 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">طلاب مسجلون</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassManagement;
