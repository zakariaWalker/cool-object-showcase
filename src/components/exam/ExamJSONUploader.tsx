// ===== Exam JSON Uploader — Single or Bulk JSON import =====
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExamBulkImportSchema, ExamSchema, EXAM_JSON_EXAMPLE, EXAM_BULK_EXAMPLE, type ExamInput } from "@/engine/exam-schema";
import type { ExamEntry, ExamQuestion } from "./useExamKBStore";

interface Props {
  store: ReturnType<typeof import("./useExamKBStore").useExamKBStore>;
}

type ImportStatus = "idle" | "validating" | "preview" | "importing" | "done" | "error";

export function ExamJSONUploader({ store }: Props) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [jsonText, setJsonText] = useState("");
  const [parsedExams, setParsedExams] = useState<ExamInput[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ exams: number; questions: number } | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((raw: string) => {
    setErrors([]);
    setStatus("validating");
    try {
      const data = JSON.parse(raw);
      const result = ExamBulkImportSchema.safeParse(data);
      if (!result.success) {
        const errs = result.error.issues.map(i => `${i.path.join(".")} — ${i.message}`);
        setErrors(errs);
        setStatus("error");
        return;
      }
      const exams = Array.isArray(result.data) ? result.data : [result.data];
      setParsedExams(exams);
      setStatus("preview");
    } catch (e: any) {
      setErrors([`JSON غير صالح: ${e.message}`]);
      setStatus("error");
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Support multiple files — merge all into one array
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      readers.push(new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target?.result as string);
        r.onerror = () => reject(new Error(`فشل قراءة ${files[i].name}`));
        r.readAsText(files[i]);
      }));
    }

    Promise.all(readers).then(results => {
      if (results.length === 1) {
        setJsonText(results[0]);
        validate(results[0]);
      } else {
        // Merge multiple files
        const allExams: any[] = [];
        const errs: string[] = [];
        results.forEach((raw, idx) => {
          try {
            const data = JSON.parse(raw);
            const result = ExamBulkImportSchema.safeParse(data);
            if (result.success) {
              const exams = Array.isArray(result.data) ? result.data : [result.data];
              allExams.push(...exams);
            } else {
              errs.push(`ملف ${idx + 1}: ${result.error.issues.map(i => i.message).join(", ")}`);
            }
          } catch (e: any) {
            errs.push(`ملف ${idx + 1}: JSON غير صالح`);
          }
        });

        if (errs.length > 0 && allExams.length === 0) {
          setErrors(errs);
          setStatus("error");
        } else {
          if (errs.length > 0) setErrors(errs);
          setParsedExams(allExams);
          setJsonText(JSON.stringify(allExams, null, 2));
          setStatus("preview");
        }
      }
    }).catch(err => {
      setErrors([err.message]);
      setStatus("error");
    });

    e.target.value = "";
  };

  const handleImport = async () => {
    setStatus("importing");
    let totalExams = 0;
    let totalQuestions = 0;

    for (const exam of parsedExams) {
      const examId = `exam_${exam.format}_${exam.year}_${exam.session}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const entry: ExamEntry = {
        id: examId,
        year: exam.year,
        session: exam.session,
        format: exam.format,
        grade: exam.grade,
        stream: exam.stream,
      };
      await store.addExam(entry);
      totalExams++;

      const qs: ExamQuestion[] = exam.questions.map(q => ({
        id: crypto.randomUUID(),
        examId,
        sectionLabel: q.sectionLabel,
        questionNumber: q.questionNumber,
        subQuestion: q.subQuestion,
        text: q.text,
        points: q.points,
        type: q.type,
        difficulty: q.difficulty,
        cognitiveLevel: q.cognitiveLevel,
        bloomLevel: q.bloomLevel,
        estimatedTimeMin: q.estimatedTimeMin,
        stepCount: q.stepCount,
        conceptCount: q.conceptCount,
        concepts: q.concepts,
        linkedPatternIds: q.linkedPatternIds,
        linkedExerciseIds: q.linkedExerciseIds,
      }));

      await store.addQuestions(qs);
      totalQuestions += qs.length;
    }

    setImportResult({ exams: totalExams, questions: totalQuestions });
    setStatus("done");
    setJsonText("");
    setParsedExams([]);
  };

  const handleReset = () => {
    setStatus("idle");
    setJsonText("");
    setParsedExams([]);
    setErrors([]);
    setImportResult(null);
  };

  const loadExample = (bulk: boolean) => {
    const example = bulk ? EXAM_BULK_EXAMPLE : EXAM_JSON_EXAMPLE;
    const text = JSON.stringify(example, null, 2);
    setJsonText(text);
    validate(text);
  };

  const totalQuestionsPreview = parsedExams.reduce((sum, e) => sum + e.questions.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground">📦 استيراد JSON</h2>
        <button onClick={() => setShowSchema(!showSchema)}
          className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-all">
          {showSchema ? "إخفاء" : "📋 عرض"} المخطط
        </button>
      </div>

      {/* Schema viewer */}
      <AnimatePresence>
        {showSchema && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-black text-foreground">📐 مخطط JSON المطلوب</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                يمكنك إرسال امتحان واحد (كائن) أو عدة امتحانات (مصفوفة). كل امتحان يحتوي على بيانات وصفية + قائمة أسئلة.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-2">🗂️ حقول الامتحان</h4>
                  <div className="space-y-1">
                    {[
                      ["year", "string", "السنة (مثال: 2024)", true],
                      ["session", "enum", "juin | septembre | remplacement", false],
                      ["format", "enum", "bem | bac | regular | devoir", false],
                      ["grade", "string", "المستوى (مثال: middle_4)", true],
                      ["stream", "string", "الشعبة (اختياري)", false],
                      ["questions", "array", "قائمة الأسئلة (1 على الأقل)", true],
                    ].map(([name, type, desc, req]) => (
                      <div key={name as string} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                        <code className="text-[10px] font-mono font-bold text-primary">{name}</code>
                        <span className="text-[9px] text-muted-foreground">{type}</span>
                        <span className="text-[10px] text-foreground flex-1">{desc}</span>
                        {req && <span className="text-[8px] text-destructive font-bold">مطلوب</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-2">❓ حقول السؤال</h4>
                  <div className="space-y-1 max-h-[250px] overflow-y-auto">
                    {[
                      ["sectionLabel", "string", "اسم القسم", true],
                      ["questionNumber", "number", "رقم السؤال", true],
                      ["subQuestion", "string", "فرع (اختياري)", false],
                      ["text", "string", "نص السؤال", true],
                      ["points", "number", "النقاط", false],
                      ["type", "string", "التصنيف", false],
                      ["difficulty", "enum", "easy | medium | hard", false],
                      ["cognitiveLevel", "enum", "remember → create", false],
                      ["bloomLevel", "1-6", "مستوى بلوم", false],
                      ["estimatedTimeMin", "number", "الوقت (دقائق)", false],
                      ["stepCount", "number", "عدد الخطوات", false],
                      ["concepts", "string[]", "المفاهيم", false],
                    ].map(([name, type, desc, req]) => (
                      <div key={name as string} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                        <code className="text-[10px] font-mono font-bold text-primary">{name}</code>
                        <span className="text-[9px] text-muted-foreground">{type}</span>
                        <span className="text-[10px] text-foreground flex-1">{desc}</span>
                        {req && <span className="text-[8px] text-destructive font-bold">مطلوب</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground">📁 تحميل ملف أو لصق JSON</h3>
            <div className="flex gap-2">
              <button onClick={() => loadExample(false)}
                className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-all">
                مثال فردي
              </button>
              <button onClick={() => loadExample(true)}
                className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-all">
                مثال متعدد
              </button>
            </div>
          </div>

          {/* File upload */}
          <div className="flex gap-3">
            <input ref={fileRef} type="file" accept=".json" multiple onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-all text-center cursor-pointer group">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</div>
              <div className="text-xs font-bold text-foreground">اسحب أو انقر لرفع ملف JSON</div>
              <div className="text-[10px] text-muted-foreground mt-1">يدعم ملف واحد أو عدة ملفات</div>
            </button>
          </div>

          {/* Text area */}
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            className="w-full h-[280px] px-4 py-3 rounded-lg border border-border bg-background text-foreground text-[11px] font-mono resize-none leading-relaxed"
            placeholder='{"year":"2024","session":"juin","format":"bem","grade":"middle_4","questions":[...]}'
            dir="ltr"
          />

          <div className="flex items-center gap-3">
            <button onClick={() => validate(jsonText)}
              disabled={!jsonText.trim() || status === "validating"}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
              {status === "validating" ? "⏳ جاري التحقق..." : "✅ تحقق"}
            </button>
            {status !== "idle" && (
              <button onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-all">
                🔄 إعادة
              </button>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border p-3 space-y-1"
              style={{ borderColor: "hsl(var(--destructive) / 0.3)", background: "hsl(var(--destructive) / 0.05)" }}>
              <h4 className="text-xs font-bold" style={{ color: "hsl(var(--destructive))" }}>❌ أخطاء التحقق</h4>
              {errors.map((err, i) => (
                <div key={i} className="text-[10px] font-mono" style={{ color: "hsl(var(--destructive))" }}>• {err}</div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Preview / Result */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {status === "preview" && (
            <>
              <h3 className="text-sm font-black text-foreground">👁️ معاينة قبل الاستيراد</h3>
              <div className="flex gap-4 mb-3">
                <div className="rounded-lg bg-primary/10 px-4 py-3 text-center flex-1">
                  <div className="text-2xl font-black text-primary">{parsedExams.length}</div>
                  <div className="text-[10px] text-muted-foreground">امتحان</div>
                </div>
                <div className="rounded-lg bg-accent/10 px-4 py-3 text-center flex-1">
                  <div className="text-2xl font-black" style={{ color: "hsl(var(--accent))" }}>{totalQuestionsPreview}</div>
                  <div className="text-[10px] text-muted-foreground">سؤال</div>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedExams.map((exam, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary">{exam.format.toUpperCase()}</span>
                        <span className="text-xs text-foreground">{exam.year} — {exam.session}</span>
                        {exam.stream && <span className="text-[10px] text-muted-foreground">({exam.stream})</span>}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {exam.questions.length} سؤال
                      </span>
                    </div>
                    <div className="space-y-1">
                      {exam.questions.slice(0, 3).map((q, qi) => (
                        <div key={qi} className="flex items-start gap-2 text-[10px]">
                          <span className="font-bold text-primary shrink-0">Q{q.questionNumber}</span>
                          <span className="text-foreground line-clamp-1">{q.text}</span>
                          <span className="shrink-0 text-muted-foreground">{q.points}pts</span>
                        </div>
                      ))}
                      {exam.questions.length > 3 && (
                        <div className="text-[9px] text-muted-foreground">+{exam.questions.length - 3} أسئلة أخرى</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleImport}
                className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
                📥 استيراد {parsedExams.length} امتحان ({totalQuestionsPreview} سؤال)
              </button>
            </>
          )}

          {status === "importing" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-4xl animate-pulse mb-3">⏳</div>
              <div className="text-sm font-bold text-foreground">جاري الاستيراد...</div>
            </div>
          )}

          {status === "done" && importResult && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <div className="text-lg font-black text-foreground mb-2">تم الاستيراد بنجاح!</div>
              <div className="text-sm text-muted-foreground mb-6">
                {importResult.exams} امتحان · {importResult.questions} سؤال
              </div>
              <button onClick={handleReset}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
                📦 استيراد المزيد
              </button>
            </motion.div>
          )}

          {(status === "idle" || status === "error") && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4 opacity-30">📦</div>
              <div className="text-sm font-bold text-muted-foreground mb-2">في انتظار بيانات JSON</div>
              <div className="text-[10px] text-muted-foreground leading-relaxed max-w-[300px]">
                ارفع ملف JSON أو الصقه في المحرر ثم اضغط "تحقق" لمعاينة البيانات قبل الاستيراد.
                <br />يدعم امتحان فردي أو مصفوفة امتحانات.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
