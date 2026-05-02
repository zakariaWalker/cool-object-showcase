// ===== Replicate Exam From Image — Upload scans, get a clean editable exam =====
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type Exam,
  type ExamSection,
  type ExamExercise,
  type ExamFormat,
  type AnswerSpaceKind,
  generateExamId,
  generateSectionId,
} from "@/engine/exam-types";

interface Props {
  onReplicated: (exam: Exam) => void;
}

interface PendingImage {
  file: File;
  previewUrl: string;
  base64?: string;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix
      resolve(res.split(",")[1] || res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function inferFormat(grade: string): ExamFormat {
  if (/3\s*AS/i.test(grade)) return "bac";
  if (/4\s*AM/i.test(grade)) return "bem";
  return "regular";
}

function buildExamFromExtraction(extracted: any): Exam {
  const sectionsRaw: any[] = Array.isArray(extracted?.sections) ? extracted.sections : [];
  const sections: ExamSection[] = sectionsRaw.map((s, idx) => {
    const sectionId = generateSectionId();
    const subs: any[] = Array.isArray(s.sub_questions) ? s.sub_questions : [];
    const tables: any[] = Array.isArray(s.tables) ? s.tables : [];
    const figures: any[] = Array.isArray(s.figures) ? s.figures : [];

    const exercise: ExamExercise = {
      id: `ex_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      sectionId,
      text: (s.instruction || "").trim(),
      points: typeof s.points === "number" ? s.points : 1,
      type: "unclassified",
      grade: extracted?.grade || "",
      source: "manual",
      subQuestions: subs.map((sq: any, j: number) => ({
        id: `sq_${Date.now()}_${idx}_${j}`,
        text: `${sq.label ? sq.label + ") " : ""}${sq.text || ""}`,
        points: typeof sq.points === "number" ? sq.points : 0,
        answerSpace: (sq.answer_space as AnswerSpaceKind) || "lines",
        answerLines: typeof sq.answer_lines === "number" ? sq.answer_lines : 2,
      })),
      tables: tables
        .map((t: any) => ({
          headers: Array.isArray(t.headers) ? t.headers.map(String) : undefined,
          rows: Array.isArray(t.rows) ? t.rows.map((r: any) => (Array.isArray(r) ? r.map(String) : [])) : [],
        }))
        .filter((t) => t.rows.length > 0 || (t.headers && t.headers.length > 0)),
      figures: figures
        .map((f: any) => ({ description: String(f?.description || "") }))
        .filter((f) => f.description),
      answerSpace: subs.length === 0 ? "lines" : "none",
      answerLines: 3,
    };

    return {
      id: sectionId,
      title: s.title || `التمرين ${idx + 1}`,
      points: typeof s.points === "number" ? s.points : 1,
      exercises: [exercise],
    };
  });

  const totalPoints =
    typeof extracted?.total_points === "number"
      ? extracted.total_points
      : sections.reduce((sum, s) => sum + (s.points || 0), 0) || 20;

  const grade = extracted?.grade || "4AM";
  const format = inferFormat(String(grade));

  return {
    id: generateExamId(),
    title: extracted?.title || "امتحان مستنسخ",
    format,
    grade,
    duration: typeof extracted?.duration_min === "number" ? extracted.duration_min : 60,
    totalPoints,
    sections,
    createdAt: new Date().toISOString(),
    status: "draft",
    metadata: {
      school: extracted?.school || "",
      semester: extracted?.semester || "",
      year: extracted?.year || "",
    },
  };
}

export function ExamReplicateFromImage({ onReplicated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: PendingImage[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      next.push({ file: f, previewUrl: URL.createObjectURL(f) });
    });
    if (next.length === 0) {
      toast.error("يرجى اختيار صور فقط (JPG / PNG)");
      return;
    }
    setImages((prev) => [...prev, ...next]);
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const replicate = async () => {
    if (images.length === 0) {
      toast.error("أضف صورة واحدة على الأقل");
      return;
    }
    setLoading(true);
    try {
      const base64s = await Promise.all(images.map((img) => fileToBase64(img.file)));

      const { data, error } = await supabase.functions.invoke("replicate-exam-from-image", {
        body: { images: base64s },
      });

      if (error) throw new Error(error.message);
      if (!data?.exam) throw new Error("لم يتم استخراج محتوى الامتحان");

      const exam = buildExamFromExtraction(data.exam);
      toast.success(`✅ تم استنساخ الامتحان: ${exam.sections.length} تمارين`);
      onReplicated(exam);
    } catch (err: any) {
      console.error("Replicate error:", err);
      toast.error("فشل الاستنساخ: " + (err.message || "خطأ غير معروف"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 space-y-4"
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            استنساخ امتحان من صورة
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            ارفع صور الامتحان الورقي. سنتجاهل خط اليد، الأختام، وعلامات التصحيح، ونعيد بناء الامتحان نظيفاً وقابلاً للتعديل.
          </p>
        </div>
      </div>

      {/* Drop area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="rounded-xl border-2 border-dashed border-primary/40 bg-background hover:bg-primary/5 transition-all p-8 text-center cursor-pointer"
      >
        <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
        <p className="text-sm font-bold text-foreground">اسحب الصور هنا أو انقر للاختيار</p>
        <p className="text-[10px] text-muted-foreground mt-1">JPG / PNG — صفحات متعددة مدعومة</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-card">
              <img src={img.previewUrl} alt="" className="w-full h-32 object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 left-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="إزالة"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[10px] px-2 py-1 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                <span className="truncate">{img.file.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="flex items-center gap-3">
        <Button
          onClick={replicate}
          disabled={loading || images.length === 0}
          className="bg-primary text-primary-foreground gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري الاستنساخ...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              استنسخ الامتحان ({images.length})
            </>
          )}
        </Button>
        {images.length > 0 && (
          <button
            onClick={() => setImages([])}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            مسح الكل
          </button>
        )}
      </div>
    </motion.div>
  );
}
