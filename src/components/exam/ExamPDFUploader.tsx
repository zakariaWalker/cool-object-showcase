// ===== Exam PDF Bulk Uploader — Upload, analyze, extract =====
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash2, Eye, BarChart3, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ExamCategory = "bac" | "bem" | "regular" | "devoir";

const CATEGORY_OPTIONS: { value: ExamCategory; label: string; icon: string; desc: string }[] = [
  { value: "bac", label: "BAC", icon: "🎓", desc: "امتحان شهادة البكالوريا" },
  { value: "bem", label: "BEM", icon: "📜", desc: "امتحان شهادة التعليم المتوسط" },
  { value: "regular", label: "اختبار", icon: "📝", desc: "اختبار فصلي أو شهري" },
  { value: "devoir", label: "فرض", icon: "📄", desc: "فرض منزلي أو محروس" },
];

interface UploadItem {
  file: File;
  id?: string;
  category: ExamCategory;
  status: "queued" | "uploading" | "analyzing" | "done" | "error";
  progress: number;
  result?: {
    questions_count: number;
    format: string;
    year: string;
    grade: string;
  };
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

export function ExamPDFUploader({ onQuestionsExtracted }: ExamPDFUploaderProps) {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<ExamUploadRecord[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>("bac");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load upload history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("exam_uploads")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setHistory((data as ExamUploadRecord[]) || []);
    setShowHistory(true);
  }, [user]);

  // Load questions for a specific upload
  const loadQuestions = useCallback(async (uploadId: string) => {
    const { data } = await supabase
      .from("exam_extracted_questions")
      .select("*")
      .eq("upload_id", uploadId)
      .order("question_number") as any;
    setQuestions((data as ExtractedQuestion[]) || []);
    setSelectedUpload(uploadId);
  }, []);

  // Import extracted questions into exam KB (Questions tab)
  const importToKB = useCallback(async (uploadId: string) => {
    if (!user) return;
    setImporting(true);
    try {
      // Find the upload record for metadata
      const upload = history.find(h => h.id === uploadId);
      
      // Check if already imported by looking for existing exam_kb_entries with matching data
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

      // Load extracted questions if not already loaded
      let qs = questions;
      if (selectedUpload !== uploadId || qs.length === 0) {
        const { data } = await supabase
          .from("exam_extracted_questions")
          .select("*")
          .eq("upload_id", uploadId)
          .order("question_number") as any;
        qs = (data as ExtractedQuestion[]) || [];
      }

      if (qs.length === 0) {
        toast.error("لا توجد أسئلة مستخرجة لهذا الامتحان");
        setImporting(false);
        return;
      }

      // Create exam_kb_entry
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

      if (entryErr || !kbEntry) {
        throw new Error(entryErr?.message || "Failed to create KB entry");
      }

      // Insert questions into exam_kb_questions
      const kbQuestions = qs.map(q => ({
        user_id: user.id,
        exam_id: kbEntry.id,
        section_label: q.section_label,
        question_number: q.question_number,
        sub_question: (q as any).sub_question || null,
        text: q.text,
        points: q.points || 0,
        type: q.type || "unclassified",
        difficulty: q.difficulty || "medium",
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
  }, [user, history, questions, selectedUpload, onQuestionsExtracted]);

  // Handle file selection
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newUploads: UploadItem[] = Array.from(files)
      .filter(f => f.type === "application/pdf")
      .map(f => ({ file: f, category: selectedCategory, status: "queued" as const, progress: 0 }));
    
    if (newUploads.length === 0) {
      toast.error("يرجى اختيار ملفات PDF فقط");
      return;
    }
    setUploads(prev => [...prev, ...newUploads]);
  };

  // Process all queued uploads
  const processAll = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }
    setProcessing(true);

    for (let i = 0; i < uploads.length; i++) {
      if (uploads[i].status !== "queued") continue;

      // Update status to uploading
      setUploads(prev => prev.map((u, j) => j === i ? { ...u, status: "uploading", progress: 20 } : u));

      try {
        const file = uploads[i].file;
        const filePath = `${user.id}/${Date.now()}_${file.name}`;

        // Upload to storage
        const { error: storageErr } = await supabase.storage
          .from("exam-pdfs")
          .upload(filePath, file);

        if (storageErr) throw new Error(storageErr.message);

        setUploads(prev => prev.map((u, j) => j === i ? { ...u, progress: 40 } : u));

        // Create upload record
        const { data: uploadRecord, error: insertErr } = await supabase
          .from("exam_uploads")
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            status: "pending",
          })
          .select("id")
          .single() as any;

        if (insertErr) throw new Error(insertErr.message);

        setUploads(prev => prev.map((u, j) => j === i ? { ...u, id: uploadRecord.id, status: "analyzing", progress: 60 } : u));

        // Call edge function for analysis
        const { data: result, error: fnErr } = await supabase.functions.invoke(
          "parse-exam-pdf",
          { body: { upload_id: uploadRecord.id } }
        );

        if (fnErr) throw new Error(fnErr.message);

        setUploads(prev => prev.map((u, j) => j === i ? {
          ...u,
          status: "done",
          progress: 100,
          result: result,
        } : u));

      } catch (err: any) {
        console.error("Upload error:", err);
        setUploads(prev => prev.map((u, j) => j === i ? {
          ...u,
          status: "error",
          error: err.message || "خطأ غير متوقع",
        } : u));
      }
    }

    setProcessing(false);
    toast.success("تم معالجة جميع الملفات");
    onQuestionsExtracted?.();
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploads([]);
    setSelectedUpload(null);
    setQuestions([]);
  };

  const statusIcon = (status: UploadItem["status"]) => {
    switch (status) {
      case "queued": return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "uploading": return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "analyzing": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case "done": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "error": return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const statusLabel = (status: UploadItem["status"]) => {
    switch (status) {
      case "queued": return "في الانتظار";
      case "uploading": return "جاري الرفع...";
      case "analyzing": return "جاري التحليل بالذكاء الاصطناعي...";
      case "done": return "تم ✓";
      case "error": return "فشل";
    }
  };

  const formatLabel: Record<string, string> = {
    bem: "BEM", bac: "BAC", regular: "فرض", unknown: "غير محدد",
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Upload Zone */}
      <div
        className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-card/50"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-lg font-bold text-foreground">اسحب ملفات PDF هنا أو اضغط للاختيار</p>
        <p className="text-sm text-muted-foreground mt-1">
          يمكنك رفع عدة امتحانات دفعة واحدة • BEM, BAC, فروض
        </p>
      </div>

      {/* Upload Queue */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">
              📄 الملفات ({uploads.length})
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={clearAll}>مسح الكل</Button>
              <Button
                size="sm"
                onClick={processAll}
                disabled={processing || uploads.every(u => u.status !== "queued")}
              >
                {processing ? (
                  <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جاري المعالجة...</>
                ) : (
                  "🚀 تحليل الكل"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {uploads.map((u, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
              >
                {statusIcon(u.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(u.file.size / 1024).toFixed(0)} KB · {statusLabel(u.status)}
                    {u.result && (
                      <span className="text-emerald-600 mr-2">
                        {u.result.questions_count} سؤال · {formatLabel[u.result.format] || u.result.format}
                        {u.result.year && ` · ${u.result.year}`}
                      </span>
                    )}
                    {u.error && <span className="text-destructive mr-2">{u.error}</span>}
                  </p>
                  {/* Progress bar */}
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
                    <button
                      onClick={() => removeUpload(i)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
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
            {history.map(h => (
              <div
                key={h.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => loadQuestions(h.id)}
              >
                {h.status === "completed" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] px-2 py-1"
                    disabled={importing}
                    onClick={(e) => { e.stopPropagation(); importToKB(h.id); }}
                  >
                    {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowLeftRight className="w-3 h-3 ml-1" />}
                    نقل للأسئلة
                  </Button>
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
            <h3 className="font-bold text-foreground">
              📋 الأسئلة المستخرجة ({questions.length})
            </h3>
            <Button
              size="sm"
              onClick={() => importToKB(selectedUpload!)}
              disabled={importing}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <ArrowLeftRight className="w-4 h-4 ml-1" />}
              نقل الكل إلى تبويب الأسئلة
            </Button>
          </div>
          <div className="space-y-2">
            {questions.map(q => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {q.section_label}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {q.type}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {q.difficulty}
                  </span>
                  <span className="text-xs font-bold text-foreground mr-auto">
                    {q.points} نقطة
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {q.text}
                </p>
                {q.concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {q.concepts.map((c, i) => (
                      <span key={i} className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
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
