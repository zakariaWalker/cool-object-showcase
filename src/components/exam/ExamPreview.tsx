// ===== Exam Preview — Print-ready view with enhanced math rendering =====
import { motion } from "framer-motion";
import { Exam, GRADE_OPTIONS } from "@/engine/exam-types";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";

interface Props {
  exam: Exam;
  onClose: () => void;
}

// Bloom's taxonomy labels for exercise classification
const BLOOM_LABELS: Record<number, string> = {
  1: "تذكر", 2: "فهم", 3: "تطبيق", 4: "تحليل", 5: "تقييم", 6: "إبداع"
};

function estimateExerciseLength(text: string): "short" | "medium" | "long" {
  const len = text.length;
  const questionCount = (text.match(/\d+[\)\.\-]/g) || []).length;
  if (len < 80 && questionCount <= 1) return "short";
  if (len > 300 || questionCount >= 4) return "long";
  return "medium";
}

export function ExamPreview({ exam, onClose }: Props) {
  const gradeLabel = GRADE_OPTIONS.find(g => g.value === exam.grade)?.label || exam.grade;
  const formatLabel = exam.format === "bem" ? "شهادة التعليم المتوسط" :
    exam.format === "bac" ? "شهادة البكالوريا" : "اختبار الثلاثي الأول";

  const style = {
    typography: {
      math: exam.styleProfile?.typography?.math || "serif",
      text: exam.styleProfile?.typography?.text || "sans",
      hierarchy: exam.styleProfile?.typography?.hierarchy || "balanced"
    },
    layout: {
      columns: exam.styleProfile?.layout?.columns || 1,
      spacing: exam.styleProfile?.layout?.spacing || "normal",
      exerciseBorder: exam.styleProfile?.layout?.exerciseBorder || false
    }
  };

  const spacingMap = { compact: "1.4", normal: "1.8", wide: "2.2" };

  const handlePrint = () => window.print();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 print:static print:bg-transparent print:p-0 print:block print:overflow-visible overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-4xl rounded-xl bg-white text-black my-4 print:my-0 print:max-w-none print:rounded-none print:overflow-visible" dir="rtl">
        {/* Action bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden z-10">
          <div className="flex items-center gap-3">
            <button onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
              🖨️ طباعة / PDF
            </button>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
              نمط: {style.layout.columns} أعمدة · {style.typography.math} رياضيات
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="print:hidden text-[9px] text-center text-muted-foreground mt-4">
          💡 يتم تطبيق التنسيق والنمط البصري المستنتج من الامتحانات السابقة تلقائياً.
        </p>

        {/* Exam paper */}
        <div
          className="p-8 print:p-0 mb-8 max-w-[21cm] mx-auto bg-white"
          id="exam-paper"
          style={{
            lineHeight: spacingMap[style.layout.spacing as keyof typeof spacingMap],
            fontFamily: style.typography.text === "serif" ? 'serif' : '"Tajawal", sans-serif'
          }}
        >
          {/* --- HEADER --- */}
          {exam.format === "regular" ? (
            <div className="border-b-4 border-black pb-4 mb-8">
              <div className="flex justify-between items-start text-xs font-bold mb-4">
                <div className="text-right">
                  <div>المؤسسة: {exam.metadata?.school || "...................."}</div>
                  <div>المستوى: {gradeLabel}</div>
                </div>
                <div className="text-left">
                  <div>الأستاذ(ة): {exam.metadata?.teacher || "...................."}</div>
                  <div>التاريخ: {exam.metadata?.year || ".... / .... / ...."}</div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-xl font-black underline decoration-double underline-offset-8">
                  {exam.title || "اختبار في مادة الرياضيات"}
                </div>
                <div className="text-sm font-bold pt-2">المدة: {exam.duration} د · التنقيط: /{exam.totalPoints}</div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-black p-4 mb-6 relative">
              <div className="text-center font-bold text-sm mb-4 border-b border-black pb-2">
                الجمهورية الجزائرية الديمقراطية الشعبية
                <br />
                وزارة التربية الوطنية
              </div>
              <div className="flex justify-between items-start text-[11px] font-bold">
                <div className="text-right space-y-1">
                  <div>مديرية التربية لولاية: ....................</div>
                  {exam.metadata?.school ? (
                    <div className="font-black text-xs">{exam.metadata.school}</div>
                  ) : (
                    <div>المؤسسة: ..............................</div>
                  )}
                </div>
                <div className="text-center space-y-2 px-4 border-x border-black/20">
                  <div className="text-sm font-black bg-black text-white px-4 py-1 rounded-sm">
                    {formatLabel}
                  </div>
                  <div className="text-xs font-black">{exam.title}</div>
                  <div className="text-[10px]">المستوى: {gradeLabel}</div>
                </div>
                <div className="text-left space-y-1">
                  <div>دورة: {exam.metadata?.year || "2024 / 2025"}</div>
                  <div>المدة: {exam.duration} دقيقة</div>
                  <div>المعامل: --</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="border-double border-b-4 border-black text-base font-black px-8">
                  اختبار في مادة: الرياضيات
                </span>
              </div>
            </div>
          )}

          {/* --- EXAM CONTENT --- */}
          <div className="space-y-8">
            {/* PART I */}
            {(() => {
              const part1Sections = exam.sections.filter(s => s.id !== "problem");
              const part1Points = part1Sections.reduce((tot, s) => tot + s.exercises.reduce((es, e) => es + e.points, 0), 0);
              return part1Sections.length > 0 ? (
                <div className="border-b-2 border-dashed border-black/20 pb-2 mb-6">
                  <span className="bg-black text-white px-4 py-1 text-xs font-bold rounded-l-xl">
                    الجزء الأول: ({part1Points} نقطة)
                  </span>
                </div>
              ) : null;
            })()}

            <div className={`${style.layout.columns === 2 ? "grid grid-cols-2 gap-x-12 gap-y-8" : "space-y-8"}`}>
              {exam.sections.filter(s => s.id !== "problem").map((section, si) => {
                const sectionPoints = section.exercises.reduce((s, e) => s + e.points, 0);

                return (
                  <div key={section.id} className="relative">
                    {/* Section header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="text-xs font-black border-2 border-black px-3 py-1 rounded-sm">
                        {section.title || `التمرين ${si + 1}`}
                      </div>
                      <span className="text-[10px] font-bold text-gray-600">
                        ({sectionPoints} نقاط)
                      </span>
                    </div>

                    {/* Exercises */}
                    <div className="space-y-5 pr-3">
                      {section.exercises.map((ex) => {
                        const length = estimateExerciseLength(ex.text);
                        const bloomLevel = (ex as any).bloomLevel || (ex as any).bloom_level;

                        return (
                          <div
                            key={ex.id}
                            className={`exercise-block ${
                              style.layout.exerciseBorder ? "border-r-2 border-gray-300 pr-3" : ""
                            } ${length === "short" ? "pb-2" : length === "long" ? "pb-6" : "pb-4"}`}
                          >
                            {/* Bloom badge (print-hidden) */}
                            {bloomLevel && (
                              <span className="print:hidden text-[8px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold mb-1 inline-block">
                                🧠 {BLOOM_LABELS[bloomLevel] || `B${bloomLevel}`}
                              </span>
                            )}

                            <MathExerciseRenderer
                              text={ex.text}
                              examMode
                              mathFont={style.typography.math as "serif" | "sans"}
                              showDiagram={false}
                            />

                            {/* Short exercise indicator (print-hidden) */}
                            {length === "short" && (
                              <p className="print:hidden text-[8px] text-amber-500 mt-1 italic">
                                ⚠ تمرين قصير — يمكن إضافة أسئلة فرعية لتعزيز التغطية
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PART II: Problem */}
            {exam.sections.some(s => s.id === "problem" && s.exercises.length > 0) && (
              <div className="mt-12 space-y-6 pt-4 border-t-4 border-double border-black">
                {(() => {
                  const part2Points = exam.sections.filter(s => s.id === "problem")
                    .reduce((tot, s) => tot + s.exercises.reduce((es, e) => es + e.points, 0), 0);
                  return (
                    <div className="text-center mb-6">
                      <span className="bg-black text-white px-6 py-1.5 text-sm font-black rounded-lg">
                        الجزء الثاني: الوضعية الإدماجية ({part2Points < 10 ? `0${part2Points}` : part2Points} نقاط)
                      </span>
                    </div>
                  );
                })()}

                {exam.sections.filter(s => s.id === "problem").map((section) => (
                  <div key={section.id} className="space-y-6">
                    {section.exercises.map((ex) => (
                      <div key={ex.id} className="text-[14px] leading-loose">
                        <MathExerciseRenderer
                          text={ex.text}
                          examMode
                          mathFont={style.typography.math as "serif" | "sans"}
                          showDiagram
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[9px] font-bold border-t border-black pt-2 mt-12">
            <div>الصفحة 1 من 1</div>
            <div>انتهى</div>
            <div>بالتوفيق والنجاح ✨</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
