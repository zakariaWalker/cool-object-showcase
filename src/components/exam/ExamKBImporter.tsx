// ===== Exam KB Importer — Add past exams with text import =====
import { useState } from "react";
import { motion } from "framer-motion";
import { ExamEntry } from "./useExamKBStore";
import { GRADE_OPTIONS, TYPE_LABELS_AR } from "@/engine/exam-types";

interface Props {
  store: ReturnType<typeof import("./useExamKBStore").useExamKBStore>;
}

export function ExamKBImporter({ store }: Props) {
  const [format, setFormat] = useState<"bem" | "bac">("bem");
  const [year, setYear] = useState("2024");
  const [session, setSession] = useState("juin");
  const [grade, setGrade] = useState("middle_4");
  const [stream, setStream] = useState("");
  const [examText, setExamText] = useState("");
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const handleImport = () => {
    if (!examText.trim()) return;
    setImporting(true);

    const examId = `exam_${format}_${year}_${session}_${Date.now()}`;
    const exam: ExamEntry = { id: examId, year, session, format, grade, stream };
    store.addExam(exam);

    const questions = store.importExamText(examId, examText, format);
    setLastResult(questions.length);
    setImporting(false);
    setExamText("");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-black text-foreground">📥 استيراد امتحان سابق</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-black text-foreground">⚙️ معلومات الامتحان</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">النوع</label>
              <select value={format} onChange={e => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="bem">🎓 BEM — شهادة المتوسط</option>
                <option value="bac">🏆 BAC — شهادة البكالوريا</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">السنة</label>
              <input value={year} onChange={e => setYear(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                placeholder="2024" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">الدورة</label>
              <select value={session} onChange={e => setSession(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="juin">جوان (عادية)</option>
                <option value="septembre">سبتمبر (استدراكية)</option>
                <option value="remplacement">احتياطية</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">المستوى</label>
              <select value={grade} onChange={e => setGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          {format === "bac" && (
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">الشعبة</label>
              <select value={stream} onChange={e => setStream(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="">— اختر الشعبة —</option>
                <option value="sciences">علوم تجريبية</option>
                <option value="math">رياضيات</option>
                <option value="tech_math">تقني رياضي</option>
                <option value="lettres">آداب وفلسفة</option>
                <option value="gestion">تسيير واقتصاد</option>
              </select>
            </div>
          )}

          {/* Existing exams */}
          {store.exams.length > 0 && (
            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-2">📋 الامتحانات المستوردة ({store.exams.length})</h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {store.exams.map(e => {
                  const qCount = store.questions.filter(q => q.examId === e.id).length;
                  return (
                    <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="text-[11px] text-foreground">
                        {e.format.toUpperCase()} {e.year} — {e.session} {e.stream && `(${e.stream})`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground">{qCount} أسئلة</span>
                        <button onClick={() => store.deleteExam(e.id)}
                          className="text-destructive/50 hover:text-destructive text-[10px]">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Text input */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-black text-foreground">📝 نص الامتحان</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            الصق نص الامتحان كاملاً. النظام يتعرف تلقائياً على الأقسام (التمرين الأول، الثاني... المسألة).
            يمكنك أيضاً نسخ النص من ملف PDF.
          </p>
          <textarea
            value={examText}
            onChange={e => setExamText(e.target.value)}
            className="w-full h-[300px] px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm font-mono resize-none leading-relaxed"
            placeholder={`التمرين الأول: (4 نقاط)
أحسب ...

التمرين الثاني: (4 نقاط)
حل المعادلة ...

المسألة: (4 نقاط)
في مستوٍ منسوب ...`}
            dir="rtl"
          />

          <div className="flex items-center gap-3">
            <button onClick={handleImport} disabled={importing || !examText.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
              {importing ? "⏳ جاري الاستيراد..." : "📥 استيراد وتحليل"}
            </button>
            {lastResult !== null && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs font-bold" style={{ color: "hsl(var(--geometry))" }}>
                ✅ تم استيراد {lastResult} سؤال
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
