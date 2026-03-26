import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Upload, Eye, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const LessonEditor = () => {
  const { user } = useAuth();
  const [curricula, setCurricula] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonType, setLessonType] = useState("video");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [{ data: c }, { data: l }] = await Promise.all([
      (supabase as any).from("curricula").select("id, title").eq("teacher_id", user.id),
      (supabase as any).from("lessons").select("id, title, lesson_type, is_published, video_url, curricula(title)").order("created_at", { ascending: false }),
    ]);
    const currList = c ?? [];
    setCurricula(currList);
    setLessons(l ?? []);
    if (currList.length > 0 && !selectedCurriculum) setSelectedCurriculum(currList[0].id);
  }, [user, selectedCurriculum]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("حجم الملف يتجاوز 50 ميغابايت"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error, data } = await supabase.storage.from("educational-materials").upload(path, file);
    if (error) { toast.error("فشل في رفع الملف: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("educational-materials").getPublicUrl(data.path);
    setUploadedUrl(urlData.publicUrl);
    toast.success("تم رفع الملف بنجاح");
    setUploading(false);
  };

  const handleCreateLesson = async () => {
    if (!selectedCurriculum || !lessonTitle.trim()) { toast.error("عنوان الدرس والمنهج مطلوبان"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("lessons").insert({
      curriculum_id: selectedCurriculum,
      title: lessonTitle.trim(),
      content: lessonContent,
      lesson_type: lessonType,
      video_url: uploadedUrl || null,
    });
    setSaving(false);
    if (error) { toast.error("فشل في إنشاء الدرس"); return; }
    toast.success("تم إنشاء الدرس بنجاح");
    setShowForm(false); setLessonTitle(""); setLessonContent(""); setUploadedUrl("");
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">أنشئ الدروس والتمارين والبطاقات التعليمية</p>
        <button onClick={() => setShowForm(!showForm)} disabled={curricula.length === 0} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50" title={curricula.length === 0 ? "أنشئ منهجاً أولاً" : undefined}>
          <Plus className="w-4 h-4" /> درس جديد
        </button>
      </div>

      {curricula.length === 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 text-sm text-destructive">⚠️ يجب إنشاء منهج أولاً قبل إضافة الدروس.</div>
      )}

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">المنهج</label>
            <select value={selectedCurriculum} onChange={(e) => setSelectedCurriculum(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground">
              {curricula.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="عنوان الدرس *" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} placeholder="محتوى الدرس" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" rows={4} />
          <div>
            <label className="block text-sm font-medium mb-2">نوع الدرس</label>
            <div className="flex gap-3 flex-wrap">
              {[{ v: "video", l: "📹 فيديو" }, { v: "text", l: "📝 نصي" }, { v: "exercise", l: "✏️ تمرين" }].map((t) => (
                <button key={t.v} type="button" onClick={() => setLessonType(t.v)} className={`px-4 py-2 rounded-xl border-2 text-sm transition-colors ${lessonType === t.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>{t.l}</button>
              ))}
            </div>
          </div>
          <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">ارفع ملفاً (فيديو، PDF، صورة — حتى 50 ميغابايت)</p>
            <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" accept="video/*,application/pdf,image/*" disabled={uploading} />
            <label htmlFor="file-upload" className={`cursor-pointer text-primary text-sm font-medium hover:underline ${uploading ? "opacity-50 cursor-wait" : ""}`}>{uploading ? "جارٍ الرفع..." : "اختر ملفاً"}</label>
            {uploadedUrl && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-xs text-accent">تم رفع الملف بنجاح</span>
                <button onClick={() => setUploadedUrl("")} className="text-destructive/60 hover:text-destructive"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateLesson} disabled={saving || !lessonTitle.trim()} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {saving && <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
              إنشاء الدرس
            </button>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground text-sm hover:text-foreground">إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {lessons.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد دروس بعد</p>}
        {lessons.map((l: any) => (
          <div key={l.id} className="bg-card rounded-2xl border border-border p-5 card-hover">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm truncate">{l.title}</h3>
                <p className="text-xs text-muted-foreground">{l.curricula?.title} · {l.lesson_type === "video" ? "📹 فيديو" : l.lesson_type === "text" ? "📝 نصي" : "✏️ تمرين"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mr-3">
                {l.video_url && <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary"><Eye className="w-4 h-4" /></a>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${l.is_published ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>{l.is_published ? "منشور" : "مسودة"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonEditor;
