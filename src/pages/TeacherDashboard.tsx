import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  BookOpen,
  FileEdit,
  Users,
  MessageSquare,
  CheckCircle2,
  Clock,
  GraduationCap,
  BarChart3,
  Plus,
  Upload,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { path: "/teacher", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/teacher/curriculum", label: "بناء المنهج", icon: BookOpen },
  { path: "/teacher/content", label: "إنشاء المحتوى", icon: FileEdit },
  { path: "/teacher/classes", label: "إدارة الفصول", icon: Users },
  { path: "/teacher/monitor", label: "متابعة الأداء", icon: BarChart3 },
  { path: "/teacher/feedback", label: "التغذية الراجعة", icon: MessageSquare },
];

// ─── Teacher Home ──────────────────────────────────────────────────────────────
const TeacherHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    curricula: 0,
    lessons: 0,
    published: 0,
    draft: 0,
  });
  const [recentLessons, setRecentLessons] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [
        { count: cCount },
        { count: lCount },
        { count: pubCount },
        { data: recent },
      ] = await Promise.all([
        supabase
          .from("curricula")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", user.id),
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true),
        supabase
          .from("lessons")
          .select("title, created_at, is_published, curricula(title)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setStats({
        curricula: cCount ?? 0,
        lessons: lCount ?? 0,
        published: pubCount ?? 0,
        draft: (lCount ?? 0) - (pubCount ?? 0),
      });
      setRecentLessons(recent ?? []);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="المناهج"
          value={String(stats.curricula)}
          icon={<BookOpen className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-secondary"
        />
        <StatCard
          title="الدروس"
          value={String(stats.lessons)}
          icon={<GraduationCap className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-primary"
        />
        <StatCard
          title="منشور"
          value={String(stats.published)}
          icon={<CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-success"
        />
        <StatCard
          title="مسودة"
          value={String(stats.draft)}
          icon={<Clock className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-warning"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-bold mb-4">آخر الدروس</h2>
        {recentLessons.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            لا توجد دروس بعد. ابدأ بإنشاء منهج جديد!
          </p>
        ) : (
          <div className="space-y-3">
            {recentLessons.map((l: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(l.curricula as any)?.title}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    l.is_published
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {l.is_published ? "منشور" : "مسودة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Curriculum Builder ────────────────────────────────────────────────────────
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
    const { data } = await supabase
      .from("curricula")
      .select("*, lessons(count)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setCurricula(data ?? []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!user || !title.trim()) {
      toast.error("عنوان المنهج مطلوب");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("curricula")
      .insert({ teacher_id: user.id, title: title.trim(), description, grade_level: gradeLevel });
    setSaving(false);
    if (error) {
      toast.error("فشل في إنشاء المنهج");
      return;
    }
    toast.success("تم إنشاء المنهج بنجاح");
    setShowForm(false);
    setTitle("");
    setDescription("");
    setGradeLevel("");
    load();
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("curricula")
      .update({ is_published: !current })
      .eq("id", id);
    if (error) { toast.error("فشل في تغيير حالة النشر"); return; }
    load();
  };

  const deleteCurriculum = async (id: string) => {
    const { error } = await supabase.from("curricula").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف المنهج"); return; }
    toast.success("تم حذف المنهج");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">خطط المواضيع والأهداف التعليمية</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-hero text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> منهج جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان المنهج *"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف المنهج"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={3}
          />
          <input
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="المستوى الدراسي (مثال: الصف التاسع)"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className="bg-gradient-hero text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              إنشاء
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {curricula.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            لا توجد مناهج بعد
          </p>
        )}
        {curricula.map((c: any, i: number) => (
          <div
            key={c.id}
            className="bg-card rounded-2xl border border-border p-5 hover-lift"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c.grade_level ?? "بدون مستوى"} ·{" "}
                    {(c.lessons as any)?.[0]?.count ?? 0} دروس
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(c.id, c.is_published)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    c.is_published
                      ? "bg-success/10 text-success hover:bg-success/20"
                      : "bg-warning/10 text-warning hover:bg-warning/20"
                  }`}
                >
                  {c.is_published ? "منشور" : "مسودة"}
                </button>
                <button
                  onClick={() => deleteCurriculum(c.id)}
                  className="text-destructive/60 hover:text-destructive p-1 transition-colors"
                  aria-label="حذف المنهج"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Content Authoring ─────────────────────────────────────────────────────────
const ContentAuthoring = () => {
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
      supabase.from("curricula").select("id, title").eq("teacher_id", user.id),
      supabase
        .from("lessons")
        .select("id, title, lesson_type, is_published, video_url, curricula(title)")
        .order("created_at", { ascending: false }),
    ]);
    const currList = c ?? [];
    setCurricula(currList);
    setLessons(l ?? []);
    if (currList.length > 0 && !selectedCurriculum) {
      setSelectedCurriculum(currList[0].id);
    }
  }, [user, selectedCurriculum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 50 MB limit
    if (file.size > 50 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز 50 ميغابايت");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error, data } = await supabase.storage
      .from("educational-materials")
      .upload(path, file);

    if (error) {
      toast.error("فشل في رفع الملف: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("educational-materials")
      .getPublicUrl(data.path);
    setUploadedUrl(urlData.publicUrl);
    toast.success("تم رفع الملف بنجاح");
    setUploading(false);
  };

  const handleCreateLesson = async () => {
    if (!selectedCurriculum || !lessonTitle.trim()) {
      toast.error("عنوان الدرس والمنهج مطلوبان");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("lessons").insert({
      curriculum_id: selectedCurriculum,
      title: lessonTitle.trim(),
      content: lessonContent,
      lesson_type: lessonType,
      video_url: uploadedUrl || null,
    });
    setSaving(false);
    if (error) {
      toast.error("فشل في إنشاء الدرس");
      return;
    }
    toast.success("تم إنشاء الدرس بنجاح");
    setShowForm(false);
    setLessonTitle("");
    setLessonContent("");
    setUploadedUrl("");
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">أنشئ الدروس والتمارين والبطاقات التعليمية</p>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={curricula.length === 0}
          className="bg-gradient-hero text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={curricula.length === 0 ? "أنشئ منهجاً أولاً" : undefined}
        >
          <Plus className="w-4 h-4" /> درس جديد
        </button>
      </div>

      {curricula.length === 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4 text-sm text-warning">
          ⚠️ يجب إنشاء منهج أولاً قبل إضافة الدروس.
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">المنهج</label>
            <select
              value={selectedCurriculum}
              onChange={(e) => setSelectedCurriculum(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground"
            >
              {curricula.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <input
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="عنوان الدرس *"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <textarea
            value={lessonContent}
            onChange={(e) => setLessonContent(e.target.value)}
            placeholder="محتوى الدرس"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={4}
          />
          <div>
            <label className="block text-sm font-medium mb-2">نوع الدرس</label>
            <div className="flex gap-3 flex-wrap">
              {[
                { v: "video", l: "📹 فيديو" },
                { v: "text", l: "📝 نصي" },
                { v: "exercise", l: "✏️ تمرين" },
              ].map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setLessonType(t.v)}
                  className={`px-4 py-2 rounded-xl border-2 text-sm transition-colors ${
                    lessonType === t.v
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">
              ارفع ملفاً (فيديو، PDF، صورة — حتى 50 ميغابايت)
            </p>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              accept="video/*,application/pdf,image/*"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer text-primary text-sm font-medium hover:underline ${
                uploading ? "opacity-50 cursor-wait" : ""
              }`}
            >
              {uploading ? "جارٍ الرفع..." : "اختر ملفاً"}
            </label>
            {uploadedUrl && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs text-success">تم رفع الملف بنجاح</span>
                <button
                  onClick={() => setUploadedUrl("")}
                  className="text-destructive/60 hover:text-destructive"
                  aria-label="إزالة الملف"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateLesson}
              disabled={saving || !lessonTitle.trim()}
              className="bg-gradient-hero text-primary-foreground px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              إنشاء الدرس
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Lessons list */}
      <div className="space-y-3">
        {lessons.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            لا توجد دروس بعد. أنشئ منهجاً أولاً ثم أضف الدروس
          </p>
        )}
        {lessons.map((l: any) => (
          <div
            key={l.id}
            className="bg-card rounded-2xl border border-border p-5 hover-lift"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm truncate">{l.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {(l.curricula as any)?.title} ·{" "}
                  {l.lesson_type === "video"
                    ? "📹 فيديو"
                    : l.lesson_type === "text"
                    ? "📝 نصي"
                    : "✏️ تمرين"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mr-3">
                {l.video_url && (
                  <a
                    href={l.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/60 hover:text-primary transition-colors"
                    aria-label="عرض الملف"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    l.is_published
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {l.is_published ? "منشور" : "مسودة"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Class Management ──────────────────────────────────────────────────────────
const ClassManagement = () => {
  const { user } = useAuth();
  const [curricula, setCurricula] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("curricula")
      .select("id, title, grade_level, is_published, lessons(count)")
      .eq("teacher_id", user.id)
      .then(({ data }) => setCurricula(data ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">إدارة الفصول الدراسية المرتبطة بمناهجك</p>
      {curricula.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد مناهج بعد. أنشئ منهجاً أولاً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {curricula.map((c: any) => (
            <div key={c.id} className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">{c.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c.grade_level ?? "بدون مستوى"}
                  </p>
                </div>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    c.is_published
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {c.is_published ? "منشور" : "مسودة"}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="bg-muted/50 rounded-xl px-4 py-3 flex-1 text-center">
                  <p className="text-lg font-bold">
                    {(c.lessons as any)?.[0]?.count ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">دروس</p>
                </div>
                <div className="bg-muted/50 rounded-xl px-4 py-3 flex-1 text-center">
                  <p className="text-lg font-bold text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">طلاب مسجلون</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Performance Monitor ───────────────────────────────────────────────────────
const PerformanceMonitor = () => {
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("student_progress")
      .select("status, score, completed_at, lessons(title), quizzes(title)")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setProgress(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        تابع أداء الطلاب في المناهج والاختبارات
      </p>
      {progress.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد بيانات تقدم بعد</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  المحتوى
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  الحالة
                </th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  النتيجة
                </th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="p-4 text-sm">
                    {(p.lessons as any)?.title ??
                      (p.quizzes as any)?.title ??
                      "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === "completed"
                          ? "bg-success/10 text-success"
                          : p.status === "in_progress"
                          ? "bg-info/10 text-info"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.status === "completed"
                        ? "مكتمل"
                        : p.status === "in_progress"
                        ? "جارٍ"
                        : "لم يبدأ"}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold">
                    {p.score != null ? `${p.score}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Feedback ─────────────────────────────────────────────────────────────────
const FeedbackPage = () => {
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("student_progress")
      .select("id, status, score, lessons(title), quizzes(title)")
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setProgress(data ?? []));
  }, []);

  const sendFeedback = (type: string, contentTitle: string) => {
    // In production this would create a notification or message record
    const labels: Record<string, string> = {
      good: "تم إرسال تعليق: أحسنت!",
      improve: "تم إرسال تعليق: يحتاج تحسين",
      note: "تم إرسال ملاحظة",
    };
    toast.success(labels[type] ?? "تم إرسال التغذية الراجعة");
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        أرسل تغذية راجعة للطلاب بناءً على أدائهم
      </p>
      {progress.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">
            لا توجد بيانات طلاب لتقديم تغذية راجعة
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {progress.map((p: any) => {
            const contentTitle =
              (p.lessons as any)?.title ?? (p.quizzes as any)?.title ?? "—";
            return (
              <div
                key={p.id}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">{contentTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.status === "completed" ? "مكتمل" : "جارٍ"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      (p.score ?? 0) >= 75 ? "text-success" : "text-warning"
                    }`}
                  >
                    {p.score != null ? `${p.score}%` : "—"}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => sendFeedback("good", contentTitle)}
                    className="bg-success/10 text-success text-xs px-3 py-1 rounded-lg hover:bg-success/20 transition-colors"
                  >
                    👍 أحسنت
                  </button>
                  <button
                    onClick={() => sendFeedback("improve", contentTitle)}
                    className="bg-warning/10 text-warning text-xs px-3 py-1 rounded-lg hover:bg-warning/20 transition-colors"
                  >
                    📝 يحتاج تحسين
                  </button>
                  <button
                    onClick={() => sendFeedback("note", contentTitle)}
                    className="bg-info/10 text-info text-xs px-3 py-1 rounded-lg hover:bg-info/20 transition-colors"
                  >
                    💬 ملاحظة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Root ──────────────────────────────────────────────────────────────────────
const TeacherDashboard = () => (
  <DashboardLayout
    title="لوحة المعلم"
    navItems={navItems}
    accentColor="bg-secondary"
    roleName="معلم"
  >
    <Routes>
      <Route index element={<TeacherHome />} />
      <Route path="curriculum" element={<CurriculumBuilder />} />
      <Route path="content" element={<ContentAuthoring />} />
      <Route path="classes" element={<ClassManagement />} />
      <Route path="monitor" element={<PerformanceMonitor />} />
      <Route path="feedback" element={<FeedbackPage />} />
      <Route path="*" element={<Navigate to="/teacher" replace />} />
    </Routes>
  </DashboardLayout>
);

export default TeacherDashboard;
