// ===== Exam PDF Bulk Uploader — Per-file metadata, auto-detect, parallel processing =====
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  BarChart3,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GRADE_OPTIONS } from "@/engine/exam-types";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";

type ExamCategory = "bac" | "bem" | "regular" | "devoir";

const CATEGORY_OPTIONS: { value: ExamCategory; label: string; icon: string; desc: string }[] = [
  { value: "bac", label: "BAC", icon: "🎓", desc: "امتحان شهادة البكالوريا" },
  { value: "bem", label: "BEM", icon: "📜", desc: "امتحان شهادة التعليم المتوسط" },
  { value: "regular", label: "اختبار", icon: "📝", desc: "اختبار فصلي أو شهري" },
  { value: "devoir", label: "فرض", icon: "📄", desc: "فرض منزلي أو محروس" },
];

const STREAM_OPTIONS = [
  { value: "", label: "— بدون شعبة —" },
  { value: "sciences", label: "علوم تجريبية" },
  { value: "math", label: "رياضيات" },
  { value: "tech_math", label: "تقني رياضي" },
  { value: "letters", label: "آداب وفلسفة" },
  { value: "management", label: "تسيير واقتصاد" },
  { value: "languages", label: "لغات أجنبية" },
];

const SESSION_OPTIONS = [
  { value: "juin", label: "دورة جوان" },
  { value: "septembre", label: "دورة سبتمبر" },
  { value: "remplacement", label: "دورة استدراكية" },
  { value: "trimester_1", label: "الفصل الأول" },
  { value: "trimester_2", label: "الفصل الثاني" },
  { value: "trimester_3", label: "الفصل الثالث" },
];

const YEARS = Array.from({ length: 20 }, (_, i) => (new Date().getFullYear() - i).toString());

function needsStream(cat: ExamCategory): boolean {
  return cat === "bac";
}

// ── Auto-detect metadata from filename ──
function detectFromFilename(name: string): {
  category?: ExamCategory;
  year?: string;
  session?: string;
  grade?: string;
  stream?: string;
} {
  const n = name.toLowerCase().replace(/[_\-\.]/g, " ");
  const result: ReturnType<typeof detectFromFilename> = {};

  // Category
  if (/\bbac\b/.test(n)) result.category = "bac";
  else if (/\bbem\b/.test(n)) result.category = "bem";
  else if (/\bdevoir\b|\bفرض\b/.test(n)) result.category = "devoir";
  else if (/\bexam\b|\bاختبار\b|\btest\b/.test(n)) result.category = "regular";

  // Year (4 digits between 2000-2099)
  const yearMatch = name.match(/\b(20\d{2})\b/);
  if (yearMatch) result.year = yearMatch[1];

  // Session
  if (/\bjuin\b|\bjune\b|\bجوان\b/.test(n)) result.session = "juin";
  else if (/\bsept\b|\bسبتمبر\b/.test(n)) result.session = "septembre";
  else if (/\bremp\b|\bاستدراك\b/.test(n)) result.session = "remplacement";
  else if (/\btrim\s*1\b|\bفصل\s*1\b/.test(n)) result.session = "trimester_1";
  else if (/\btrim\s*2\b|\bفصل\s*2\b/.test(n)) result.session = "trimester_2";
  else if (/\btrim\s*3\b|\bفصل\s*3\b/.test(n)) result.session = "trimester_3";

  // Grade
  if (/\b4am\b|\b4\s*am\b/.test(n)) result.grade = "4AM";
  else if (/\b3am\b/.test(n)) result.grade = "3AM";
  else if (/\b2am\b/.test(n)) result.grade = "2AM";
  else if (/\b1am\b/.test(n)) result.grade = "1AM";
  else if (/\b3as\b|\b3\s*as\b/.test(n)) result.grade = "3AS";
  else if (/\b2as\b/.test(n)) result.grade = "2AS";
  else if (/\b1as\b/.test(n)) result.grade = "1AS";

  // Stream
  if (/\bscience\b|\bعلوم\b/.test(n)) result.stream = "sciences";
  else if (/\bmath\b|\bرياضي\b/.test(n)) result.stream = "math";
  else if (/\btech\b|\bتقني\b/.test(n)) result.stream = "tech_math";
  else if (/\blettre\b|\bآداب\b/.test(n)) result.stream = "letters";
  else if (/\bgestion\b|\bتسيير\b/.test(n)) result.stream = "management";

  // Auto-set grade for official exams
  if (result.category === "bem" && !result.grade) result.grade = "4AM";
  if (result.category === "bac" && !result.grade) result.grade = "3AS";

  return result;
}

interface UploadItem {
  file: File;
  id?: string;
  category: ExamCategory;
  grade: string;
  year: string;
  session: string;
  stream: string;
  status: "queued" | "uploading" | "analyzing" | "done" | "error";
  progress: number;
  expanded: boolean;
  result?: { questions_count: number; format: string; year: string; grade: string };
  error?: string;
}

interface ExamUploadRecord {
  id: string;
  file_name: string;
  file_path: string;
  format: string;
  year: string | null;
  session: string | null;
  grade: string | null;
  status: string;
  created_at: string;
  error_message: string | null;
}

interface ExtractedQuestion {
  id: string;
  section_label: string;
  question_number: number;
  text: string;
  points: number;
  type: string;
  difficulty: string;
  concepts: string[];
}

interface ExamPDFUploaderProps {
  onQuestionsExtracted?: () => void;
}

const CONCURRENCY = 3; // Max parallel uploads

export function ExamPDFUploader({ onQuestionsExtracted }: ExamPDFUploaderProps) {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<ExamUploadRecord[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [importing, setImporting] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<ExamCategory>("bac");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastEnhancedBlueprint, setLastEnhancedBlueprint] = useState<string | null>(null);

  // Listen for blueprint enhancements (real-time)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("blueprint-enhancements")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "exam_blueprints",
          filter: "version=gt.1",
        },
        (payload) => {
          const newBlueprint = payload.new as any;
          if (newBlueprint.id === lastEnhancedBlueprint) return;

          setLastEnhancedBlueprint(newBlueprint.id);
          toast.success(`📈 تم تطوير ذكاء المنظمة (v${newBlueprint.version})`, {
            description: `تم تحسين نمط ${formatLabel[newBlueprint.format] || newBlueprint.format} (${newBlueprint.grade}): ${newBlueprint.change_summary}`,
            duration: 8000,
            icon: "✨",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, lastEnhancedBlueprint]);

  // Load upload history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = (await supabase.from("exam_uploads").select("*").order("created_at", { ascending: false })) as any;
    setHistory((data as ExamUploadRecord[]) || []);
    setShowHistory(true);
  }, [user]);

  const loadQuestions = useCallback(async (uploadId: string) => {
    const { data } = (await supabase
      .from("exam_extracted_questions")
      .select("*")
      .eq("upload_id", uploadId)
      .order("question_number")) as any;
    setQuestions((data as ExtractedQuestion[]) || []);
    setSelectedUpload(uploadId);
  }, []);

  const importToKB = useCallback(
    async (uploadId: string) => {
      if (!user) return;
      setImporting(true);
      try {
        const upload = history.find((h) => h.id === uploadId);
        const { data: existing } = await (supabase as any)
          .from("exam_kb_entries")
          .select("id")
          .eq("user_id", user.id)
          .eq("year", upload?.year || "")
          .eq("format", upload?.format || "unknown")
          .eq("session", upload?.session || "juin");

        if (existing && existing.length > 0) {
          toast.info("هذا الامتحان مستورد مسبقاً في تبويب الأسئلة");
          setImporting(false);
          return;
        }

        let qs = questions;
        if (selectedUpload !== uploadId || qs.length === 0) {
          const { data } = (await supabase
            .from("exam_extracted_questions")
            .select("*")
            .eq("upload_id", uploadId)
            .order("question_number")) as any;
          qs = (data as ExtractedQuestion[]) || [];
        }

        if (qs.length === 0) {
          toast.error("لا توجد أسئلة مستخرجة لهذا الامتحان");
          setImporting(false);
          return;
        }

        const { data: kbEntry, error: entryErr } = await (supabase as any)
          .from("exam_kb_entries")
          .insert({
            user_id: user.id,
            year: upload?.year || "",
            session: upload?.session || "juin",
            format: upload?.format || "unknown",
            grade: upload?.grade || "",
            stream: null,
          })
          .select("id")
          .single();

        if (entryErr || !kbEntry) throw new Error(entryErr?.message || "Failed to create KB entry");

        const kbQuestions = qs.map((q) => ({
          user_id: user.id,
          exam_id: kbEntry.id,
          section_label: q.section_label,
          question_number: q.question_number,
          sub_question: (q as any).sub_question || null,
          text: q.text,
          points: q.points || 0,
          type: q.type || "unclassified",
          difficulty: q.difficulty || "medium",
          cognitive_level: (q as any).cognitive_level || "apply",
          bloom_level: (q as any).bloom_level || 3,
          estimated_time_min: (q as any).estimated_time_min || 0,
          step_count: (q as any).step_count || 0,
          concept_count: (q as any).concept_count || 0,
          concepts: q.concepts || [],
          linked_pattern_ids: [],
          linked_exercise_ids: [],
        }));

        await (supabase as any).from("exam_kb_questions").insert(kbQuestions);
        toast.success(`✅ تم استيراد ${qs.length} سؤال إلى تبويب الأسئلة`);
        onQuestionsExtracted?.();
      } catch (err: any) {
        console.error("Import to KB error:", err);
        toast.error("فشل استيراد الأسئلة: " + (err.message || "خطأ"));
      } finally {
        setImporting(false);
      }
    },
    [user, history, questions, selectedUpload, onQuestionsExtracted],
  );

  // Handle file selection — auto-detect metadata per file
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newUploads: UploadItem[] = Array.from(files)
      .filter((f) => f.type === "application/pdf")
      .map((f) => {
        const detected = detectFromFilename(f.name);
        const cat = detected.category || defaultCategory;
        return {
          file: f,
          category: cat,
          grade: detected.grade || (cat === "bem" ? "4AM" : cat === "bac" ? "3AS" : "4AM"),
          year: detected.year || new Date().getFullYear().toString(),
          session: detected.session || "juin",
          stream: detected.stream || "",
          status: "queued" as const,
          progress: 0,
          expanded: false,
        };
      });

    if (newUploads.length === 0) {
      toast.error("يرجى اختيار ملفات PDF فقط");
      return;
    }

    // Show auto-detect summary
    const autoDetected = newUploads.filter((u) => {
      const d = detectFromFilename(u.file.name);
      return d.category || d.year || d.session;
    }).length;
    if (autoDetected > 0) {
      toast.success(`🔍 تم اكتشاف معلومات ${autoDetected} ملف تلقائياً من اسم الملف`);
    }

    setUploads((prev) => [...prev, ...newUploads]);
  };

  // Update a specific upload's metadata
  const updateUpload = (index: number, updates: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((u, i) => {
        if (i !== index) return u;
        const updated = { ...u, ...updates };
        // Auto-set grade for official exams
        if (updates.category === "bem") updated.grade = "4AM";
        if (updates.category === "bac") updated.grade = "3AS";
        return updated;
      }),
    );
  };

  // Process single upload
  const processSingle = async (index: number) => {
    if (!user) return;
    const u = uploads[index];
    if (u.status !== "queued") return;

    setUploads((prev) => prev.map((item, j) => (j === index ? { ...item, status: "uploading", progress: 20 } : item)));

    try {
      const file = u.file;
      const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${file.name}`;

      const { error: storageErr } = await supabase.storage.from("exam-pdfs").upload(filePath, file);
      if (storageErr) throw new Error(storageErr.message);

      setUploads((prev) => prev.map((item, j) => (j === index ? { ...item, progress: 40 } : item)));

      const { data: uploadRecord, error: insertErr } = (await supabase
        .from("exam_uploads")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          status: "pending",
          format: u.category,
          grade: u.grade,
          stream: needsStream(u.category) ? u.stream : null,
          session: u.session,
          year: u.year,
        })
        .select("id")
        .single()) as any;

      if (insertErr) throw new Error(insertErr.message);

      setUploads((prev) =>
        prev.map((item, j) =>
          j === index ? { ...item, id: uploadRecord.id, status: "analyzing", progress: 60 } : item,
        ),
      );

      const { data: result, error: fnErr } = await supabase.functions.invoke("parse-exam-pdf", {
        body: { upload_id: uploadRecord.id },
      });

      if (fnErr) throw new Error(fnErr.message);

      setUploads((prev) =>
        prev.map((item, j) => (j === index ? { ...item, status: "done", progress: 100, result } : item)),
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploads((prev) =>
        prev.map((item, j) => (j === index ? { ...item, status: "error", error: err.message || "خطأ" } : item)),
      );
    }
  };

  // Process all with concurrency
  const processAll = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }
    setProcessing(true);

    const queued = uploads.map((u, i) => ({ index: i, u })).filter((x) => x.u.status === "queued");

    // Process in batches of CONCURRENCY
    for (let batch = 0; batch < queued.length; batch += CONCURRENCY) {
      const chunk = queued.slice(batch, batch + CONCURRENCY);
      await Promise.allSettled(chunk.map(({ index }) => processSingle(index)));
    }

    setProcessing(false);
    toast.success("تم معالجة جميع الملفات");
    onQuestionsExtracted?.();
  };

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploads([]);
    setSelectedUpload(null);
    setQuestions([]);
  };

  const statusIcon = (status: UploadItem["status"]) => {
    switch (status) {
      case "queued":
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "uploading":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "analyzing":
        return <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--statistics))" }} />;
      case "done":
        return <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--geometry))" }} />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const statusLabel = (status: UploadItem["status"]) => {
    switch (status) {
      case "queued":
        return "في الانتظار";
      case "uploading":
        return "جاري الرفع...";
      case "analyzing":
        return "جاري التحليل بالذكاء الاصطناعي...";
      case "done":
        return "تم ✓";
      case "error":
        return "فشل";
    }
  };

  const formatLabel: Record<string, string> = {
    bem: "BEM",
    bac: "BAC",
    regular: "اختبار",
    devoir: "فرض",
    unknown: "غير محدد",
  };

  const categoryColors: Record<string, string> = {
    bac: "hsl(var(--destructive))",
    bem: "hsl(var(--primary))",
    regular: "hsl(var(--statistics))",
    devoir: "hsl(var(--geometry))",
  };

  const queuedCount = uploads.filter((u) => u.status === "queued").length;
  const doneCount = uploads.filter((u) => u.status === "done").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Default Category Selector */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-black text-foreground mb-3">📂 النوع الافتراضي للملفات الجديدة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setDefaultCategory(cat.value)}
              className="p-3 rounded-xl border-2 transition-all text-center"
              style={{
                borderColor: defaultCategory === cat.value ? categoryColors[cat.value] : "hsl(var(--border))",
                background: defaultCategory === cat.value ? categoryColors[cat.value] + "11" : "transparent",
              }}
            >
              <div className="text-xl mb-0.5">{cat.icon}</div>
              <div className="text-xs font-black text-foreground">{cat.label}</div>
              <div className="text-[9px] text-muted-foreground">{cat.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          💡 النظام يكتشف النوع تلقائياً من اسم الملف (مثلاً: BAC_2023_juin.pdf)
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-card/50"
        style={{ borderColor: categoryColors[defaultCategory] + "55" }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-lg font-bold text-foreground">اسحب ملفات PDF هنا أو اضغط للاختيار</p>
        <p className="text-sm text-muted-foreground mt-1">
          رفع جماعي مع معالجة متوازية ({CONCURRENCY} ملفات في نفس الوقت)
        </p>
      </div>

      {/* Upload Queue with per-file metadata */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">
              📄 الملفات ({uploads.length})
              {doneCount > 0 && (
                <span className="text-[10px] mr-2" style={{ color: "hsl(var(--geometry))" }}>
                  ✓ {doneCount} مكتمل
                </span>
              )}
              {queuedCount > 0 && (
                <span className="text-[10px] mr-2 text-muted-foreground">⏳ {queuedCount} في الانتظار</span>
              )}
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={clearAll}>
                مسح الكل
              </Button>
              <Button size="sm" onClick={processAll} disabled={processing || queuedCount === 0}>
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-1" /> معالجة متوازية...
                  </>
                ) : (
                  `🚀 تحليل الكل (${queuedCount})`
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {uploads.map((u, i) => (
              <div key={i} className="rounded-xl bg-card border border-border overflow-hidden">
                {/* File header row */}
                <div className="flex items-center gap-3 p-3">
                  {statusIcon(u.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2"
                        style={{
                          background: (categoryColors[u.category] || "hsl(var(--muted))") + "22",
                          color: categoryColors[u.category] || "hsl(var(--muted-foreground))",
                        }}
                      >
                        {formatLabel[u.category] || u.category}
                      </span>
                      <span className="text-[9px] text-muted-foreground ml-1">
                        {u.year} · {GRADE_OPTIONS.find((g) => g.value === u.grade)?.label?.split("—")[0] || u.grade}
                        {u.stream && ` · ${STREAM_OPTIONS.find((s) => s.value === u.stream)?.label || u.stream}`}
                      </span>
                      <span className="mr-2">{u.file.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(u.file.size / 1024).toFixed(0)} KB · {statusLabel(u.status)}
                      {u.result && (
                        <span className="mr-2" style={{ color: "hsl(var(--geometry))" }}>
                          {u.result.questions_count} سؤال
                        </span>
                      )}
                      {u.status === "done" && (
                        <span className="mr-2 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          ✨ مساهمة في التطور التربوي
                        </span>
                      )}
                      {u.error && <span className="text-destructive mr-2">{u.error}</span>}
                    </p>
                    {(u.status === "uploading" || u.status === "analyzing") && (
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {u.status === "done" && u.id && (
                      <button
                        onClick={() => loadQuestions(u.id!)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="عرض الأسئلة"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </button>
                    )}
                    {u.status === "queued" && (
                      <>
                        <button
                          onClick={() => updateUpload(i, { expanded: !u.expanded })}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title="تعديل المعلومات"
                        >
                          {u.expanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => removeUpload(i)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Per-file metadata editor (expanded) */}
                {u.expanded && u.status === "queued" && (
                  <div className="px-3 pb-3 pt-0 border-t border-border bg-muted/20">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                      {/* Category */}
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block mb-0.5">النوع</label>
                        <select
                          value={u.category}
                          onChange={(e) => updateUpload(i, { category: e.target.value as ExamCategory })}
                          className="w-full text-[10px] px-2 py-1.5 rounded border border-border bg-background text-foreground"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Grade */}
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block mb-0.5">المستوى</label>
                        <select
                          value={u.grade}
                          onChange={(e) => updateUpload(i, { grade: e.target.value })}
                          disabled={u.category === "bem" || u.category === "bac"}
                          className="w-full text-[10px] px-2 py-1.5 rounded border border-border bg-background text-foreground disabled:opacity-50"
                        >
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Year */}
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block mb-0.5">السنة</label>
                        <select
                          value={u.year}
                          onChange={(e) => updateUpload(i, { year: e.target.value })}
                          className="w-full text-[10px] px-2 py-1.5 rounded border border-border bg-background text-foreground"
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Session */}
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block mb-0.5">الدورة</label>
                        <select
                          value={u.session}
                          onChange={(e) => updateUpload(i, { session: e.target.value })}
                          className="w-full text-[10px] px-2 py-1.5 rounded border border-border bg-background text-foreground"
                        >
                          {SESSION_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Stream */}
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground block mb-0.5">الشعبة</label>
                        <select
                          value={u.stream}
                          onChange={(e) => updateUpload(i, { stream: e.target.value })}
                          disabled={!needsStream(u.category)}
                          className="w-full text-[10px] px-2 py-1.5 rounded border border-border bg-background text-foreground disabled:opacity-50"
                        >
                          {STREAM_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Button */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={loadHistory}>
          <BarChart3 className="w-4 h-4 ml-1" /> سجل الرفع السابق
        </Button>
      </div>

      {/* Upload History */}
      {showHistory && history.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-foreground">📁 الامتحانات المرفوعة سابقاً</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => loadQuestions(h.id)}
              >
                {h.status === "completed" ? (
                  <CheckCircle className="w-4 h-4" style={{ color: "hsl(var(--geometry))" }} />
                ) : h.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Loader2 className="w-4 h-4 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{h.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatLabel[h.format] || h.format}
                    {h.year && ` · ${h.year}`}
                    {h.grade && ` · ${h.grade}`}
                    {` · ${new Date(h.created_at).toLocaleDateString("ar-DZ")}`}
                  </p>
                </div>
                {h.status === "completed" && (
                  <div className="flex flex-col gap-2 items-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] px-2 py-1"
                      disabled={importing}
                      onClick={(e) => {
                        e.stopPropagation();
                        importToKB(h.id);
                      }}
                    >
                      {importing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ArrowLeftRight className="w-3 h-3 ml-1" />
                      )}
                      نقل للأسئلة
                    </Button>
                    {(h as any).extracted_metadata && (
                      <span className="text-[8px] bg-primary/5 text-primary px-2 py-0.5 rounded border border-primary/20">
                        🎨 تم استخراج النمط البصري
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Questions Preview */}
      {selectedUpload && questions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">📋 الأسئلة المستخرجة ({questions.length})</h3>
            <Button size="sm" onClick={() => importToKB(selectedUpload!)} disabled={importing}>
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin ml-1" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 ml-1" />
              )}
              نقل الكل إلى تبويب الأسئلة
            </Button>
          </div>
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {q.section_label}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{q.type}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {q.difficulty}
                  </span>
                  <span className="text-xs font-bold text-foreground mr-auto">{q.points} نقطة</span>
                </div>
                <MathExerciseRenderer text={q.text} />
                {q.concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {q.concepts.map((c, ci) => (
                      <span key={ci} className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
