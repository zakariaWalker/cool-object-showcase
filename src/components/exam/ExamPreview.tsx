// ===== Exam Preview — Print-ready view =====
import { motion } from "framer-motion";
import { Exam, GRADE_OPTIONS } from "@/engine/exam-types";
import { LatexRenderer } from "@/components/LatexRenderer";

interface Props {
  exam: Exam;
  onClose: () => void;
}

export function ExamPreview({ exam, onClose }: Props) {
  const gradeLabel = GRADE_OPTIONS.find(g => g.value === exam.grade)?.label || exam.grade;
  const formatLabel = exam.format === "bem" ? "شهادة التعليم المتوسط" :
    exam.format === "bac" ? "شهادة البكالوريا" : "فرض / اختبار";

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white text-black" dir="rtl">
        {/* Action bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden z-10">
          <div className="flex items-center gap-3">
            <button onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
              🖨️ طباعة / PDF
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Exam paper */}
        <div className="p-8 print:p-12" id="exam-paper">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            {exam.metadata?.school && (
              <div className="text-sm font-bold mb-1">{exam.metadata.school}</div>
            )}
            <div className="text-lg font-black">{formatLabel}</div>
            <div className="text-sm font-bold mt-1">{exam.title}</div>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-600">
              <span>المستوى: {gradeLabel}</span>
              <span>المدة: {exam.duration} دقيقة</span>
              <span>التنقيط: /{exam.totalPoints}</span>
              {exam.metadata?.year && <span>السنة: {exam.metadata.year}</span>}
            </div>
            {exam.metadata?.teacher && (
              <div className="text-xs text-gray-500 mt-1">الأستاذ(ة): {exam.metadata.teacher}</div>
            )}
          </div>

          {/* Sections */}
          {exam.sections.map((section, si) => (
            <div key={section.id} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-sm font-black">{section.title}</div>
                <span className="text-xs text-gray-500">
                  ({section.exercises.reduce((s, e) => s + e.points, 0)} نقاط)
                </span>
              </div>

              <div className="space-y-4 pr-4">
                {section.exercises.map((ex, ei) => (
                  <div key={ex.id}>
                    <div className="flex items-start gap-2">
                      {section.exercises.length > 1 && (
                        <span className="text-xs font-bold text-gray-600 mt-0.5">{ei + 1})</span>
                      )}
                      <div className="flex-1">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          <LatexRenderer latex={ex.text} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 print:hidden">
                          ({ex.points} ن)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 border-t border-gray-200 pt-4 mt-8">
            بالتوفيق والنجاح ✨
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
