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

  const spacingMap = { compact: "1.2", normal: "1.6", wide: "2.0" };
  const paddingMap = { compact: "0.5rem", normal: "1rem", wide: "1.5rem" };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white text-black" dir="rtl">
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

        {/* Exam paper */}
        <p className="print:hidden text-[9px] text-center text-muted-foreground mt-4">
          💡 يتم تطبيق التنسيق والنمط البصري المستنتج من الامتحانات السابقة تلقائياً في الطباعة.
        </p>
        <div 
          className="p-8 print:p-0 mb-8 max-w-[21cm] mx-auto bg-white" 
          id="exam-paper"
          style={{ 
            lineHeight: spacingMap[style.layout.spacing as keyof typeof spacingMap],
            fontFamily: style.typography.text === "serif" ? 'serif' : '"Tajawal", sans-serif'
          }}
        >
          {/* --- HEADER DIFFERENTIATION --- */}
          {exam.format === "regular" ? (
            /* --- CLASSROOM / REGULAR HEADER --- */
            <div className="border-b-4 border-black pb-4 mb-8">
              <div className="flex justify-between items-start text-xs font-bold mb-4">
                <div className="text-right">
                  <div>المؤسسة: {exam.metadata?.school || "...................."}</div>
                  <div>المستوى: {gradeLabel}</div>
                </div>
                <div className="text-left">
                  <div>الأستاذ(ة): {exam.metadata?.teacher || "...................."}</div>
                  <div>التاريخ: {exam.metadata?.year || ".... / .... / ...." }</div>
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
            /* --- OFFICIAL ALGERIAN HEADER (BEM/BAC) --- */
            <div className="border-2 border-black p-4 mb-6 relative">
              {/* Top Republic Line */}
              <div className="text-center font-bold text-sm mb-4 border-b border-black pb-2">
                الجمهورية الجزائرية الديمقراطية الشعبية
                <br />
                وزارة التربية الوطنية
              </div>

              <div className="flex justify-between items-start text-[11px] font-bold">
                {/* Right: School / Directorate */}
                <div className="text-right space-y-1">
                  <div>مديرية التربية لولاية: ....................</div>
                  {exam.metadata?.school ? (
                    <div className="font-black text-xs">{exam.metadata.school}</div>
                  ) : (
                    <div>المؤسسة: ..............................</div>
                  )}
                </div>

                {/* Center: Title / Level */}
                <div className="text-center space-y-2 px-4 border-x border-black/20">
                  <div className="text-sm font-black bg-black text-white px-4 py-1 rounded-sm rotate-[-1deg]">
                    {formatLabel}
                  </div>
                  <div className="text-xs font-black">{exam.title}</div>
                  <div className="text-[10px]">المستوى: {gradeLabel}</div>
                </div>

                {/* Left: Session / Duration */}
                <div className="text-left space-y-1">
                  <div>دورة: {exam.metadata?.year || "2024 / 2025"}</div>
                  <div>المدة: {exam.duration} دقيقة</div>
                  <div>المعامل: --</div>
                </div>
              </div>

              {/* Subject Centerpiece */}
              <div className="mt-4 text-center">
                <span className="border-double border-b-4 border-black text-base font-black px-8">
                  اختبار في مادة: الرياضيات
                </span>
              </div>
            </div>
          )}

          <p className="print:hidden text-[9px] text-center text-muted-foreground mb-4 italic">
            💡 {exam.format === "regular" ? "تم تطبيق نمط الاختبارات الصفية المعتاد." : "تم تطبيق النمط الرسمي لوزارة التربية الوطنية."}
          </p>

          {/* --- EXAM CONTENT --- */}
          <div className="space-y-8">
            {/* PART I: Standard Exercises */}
            {(() => {
              const part1Points = exam.sections.filter(s => s.id !== "problem").reduce((tot, s) => tot + s.exercises.reduce((es, e) => es + e.points, 0), 0);
              return (
                <div className="border-b-2 border-dashed border-black/20 pb-2 mb-4">
                  <span className="bg-black text-white px-4 py-1 text-xs font-bold rounded-l-xl">
                    الجزء الأول: ({part1Points} نقطة)
                  </span>
                </div>
              );
            })()}

            <div className={`${style.layout.columns === 2 ? "grid grid-cols-2 gap-x-12 gap-y-8" : "space-y-6"}`}>
              {exam.sections.filter(s => s.id !== "problem").map((section, si) => (
                <div key={section.id} className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-xs font-black border-2 border-black px-2 py-0.5 rounded-sm">
                      {section.title || `التمرين ${si + 1}:`}
                    </div>
                    <span className="text-[10px] font-bold">
                      ({section.exercises.reduce((s, e) => s + e.points, 0)} نقاط)
                    </span>
                  </div>

                  <div className="space-y-5 pr-2">
                    {section.exercises.map((ex, ei) => (
                      <div key={ex.id} style={{ marginBottom: paddingMap[style.layout.spacing as keyof typeof paddingMap] }}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div 
                              className="text-[13px] leading-relaxed whitespace-pre-wrap text-justify"
                              style={{ fontFamily: style.typography.math === "serif" ? 'serif' : 'inherit' }}
                            >
                              <LatexRenderer latex={ex.text} />
                            </div>
                          </div>
                          {section.exercises.length > 1 && (
                            <span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-1 rounded">.{ei + 1}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* PART II: Integrated Situation / Problem */}
            {exam.sections.some(s => s.id === "problem" && s.exercises.length > 0) && (
              <div className="mt-12 space-y-6 pt-4 border-t-4 border-double border-black">
                {(() => {
                  const part2Points = exam.sections.filter(s => s.id === "problem").reduce((tot, s) => tot + s.exercises.reduce((es, e) => es + e.points, 0), 0);
                  return (
                    <div className="text-center mb-6">
                      <span className="bg-black text-white px-6 py-1.5 text-sm font-black rounded-lg">
                        الجزء الثاني: الوضعية الإدماجية ({part2Points < 10 ? `0${part2Points}` : part2Points} نقاط)
                      </span>
                    </div>
                  );
                })()}

                {exam.sections.filter(s => s.id === "problem").map((section) => (
                  <div key={section.id} className="space-y-4">
                    {section.exercises.map((ex) => (
                      <div key={ex.id} className="text-[14px] leading-loose whitespace-pre-wrap text-justify italic"
                        style={{ fontFamily: style.typography.math === "serif" ? 'serif' : 'inherit' }}>
                        <LatexRenderer latex={ex.text} />
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
