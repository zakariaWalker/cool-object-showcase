// ===== Exam Preview — Print-ready view with tables, sub-questions, answer spaces =====
import { motion } from "framer-motion";
import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { Exam, GRADE_OPTIONS, ExamTable, ExamSubQuestion, AnswerSpaceKind } from "@/engine/exam-types";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";

interface Props {
  exam: Exam;
  onClose: () => void;
}

const BLOOM_LABELS: Record<number, string> = {
  1: "تذكر", 2: "فهم", 3: "تطبيق", 4: "تحليل", 5: "تقييم", 6: "إبداع",
};

// ── Print stylesheet (only injected into ExamPreview) ──
const PRINT_STYLES = `
@media print {
  @page { size: A4; margin: 12mm 14mm; }
  html, body { background: white !important; }
  .no-print, .print\\:hidden { display: none !important; }
  #exam-paper { box-shadow: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
  .exam-section { break-inside: avoid; page-break-inside: avoid; }
  .exam-table { break-inside: avoid; page-break-inside: avoid; }
  .answer-space { break-inside: avoid; page-break-inside: avoid; }
}
.exam-table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
.exam-table th, .exam-table td {
  border: 1.2px solid #000; padding: 8px 10px; text-align: center; vertical-align: middle;
  min-height: 28px; min-width: 40px;
}
.exam-table th { background: #f3f3f3; font-weight: 700; }
.dotted-line {
  border-bottom: 1.4px dotted #000; height: 22px; margin: 6px 0;
}
.answer-box {
  border: 1.2px solid #000; min-height: 70px; margin: 6px 0; border-radius: 2px;
}
.answer-short {
  display: inline-block; border-bottom: 1.4px solid #000; min-width: 80px; height: 16px; margin: 0 4px;
}
`;

function DottedLines({ count = 3 }: { count?: number }) {
  return (
    <div className="answer-space">
      {Array.from({ length: Math.max(1, count) }).map((_, i) => (
        <div key={i} className="dotted-line" />
      ))}
    </div>
  );
}

function AnswerArea({ kind, lines }: { kind?: AnswerSpaceKind; lines?: number }) {
  if (!kind || kind === "none" || kind === "table") return null;
  if (kind === "box") return <div className="answer-box" />;
  if (kind === "short") return <span className="answer-short" />;
  return <DottedLines count={lines || 2} />;
}

function TableRender({ table }: { table: ExamTable }) {
  const headers = table.headers || [];
  const rows = table.rows || [];
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);

  return (
    <table className="exam-table" dir="rtl">
      {headers.length > 0 && (
        <thead>
          <tr>
            {Array.from({ length: colCount }).map((_, i) => (
              <th key={i}>{headers[i] || ""}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {Array.from({ length: colCount }).map((_, ci) => (
              <td key={ci}>{row[ci] || ""}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubQuestionRender({ sq }: { sq: ExamSubQuestion }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2">
        <div className="flex-1 text-[13px] leading-relaxed">
          <MathExerciseRenderer text={sq.text} examMode mathFont="serif" showDiagram={false} />
        </div>
        {sq.points > 0 && (
          <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">({sq.points}ن)</span>
        )}
      </div>
      <AnswerArea kind={sq.answerSpace} lines={sq.answerLines} />
    </div>
  );
}

export function ExamPreview({ exam, onClose }: Props) {
  const gradeLabel = GRADE_OPTIONS.find((g) => g.value === exam.grade)?.label || exam.grade;
  const formatLabel =
    exam.format === "bem"
      ? "شهادة التعليم المتوسط"
      : exam.format === "bac"
      ? "شهادة البكالوريا"
      : "اختبار";

  const handlePrint = () => window.print();
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    const root = document.getElementById("exam-paper");
    if (!root) return;
    setExporting(true);
    try {
      const A4_W = 210, A4_H = 297, M = 12;
      const CW = A4_W - M * 2;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let y = M;

      const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-pdf-block]"));
      const targets = blocks.length > 0 ? blocks : [root];

      for (let i = 0; i < targets.length; i++) {
        const el = targets[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const imgH = (canvas.height * CW) / canvas.width;
        const remaining = A4_H - M - y;
        if (imgH > remaining && y > M) {
          pdf.addPage();
          y = M;
        }
        // If single block taller than full page, fit onto its own page(s) by slicing
        if (imgH > A4_H - M * 2) {
          // simple: scale down to fit one page
          const scale = (A4_H - M * 2) / imgH;
          const w = CW * scale;
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", M + (CW - w) / 2, y, w, A4_H - M * 2);
          y += A4_H - M * 2 + 4;
        } else {
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", M, y, CW, imgH);
          y += imgH + 4;
        }
      }

      const safeTitle = (exam.title || "exam").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60);
      pdf.save(`${safeTitle}.pdf`);
      toast.success("✅ تم تصدير الامتحان كـ PDF كامل النسخة");
    } catch (e: any) {
      console.error(e);
      toast.error("فشل التصدير: " + (e?.message || "خطأ"));
    } finally {
      setExporting(false);
    }
  };

  const renderSection = (section: any, si: number) => {
    const sectionPoints = section.exercises.reduce((s: number, e: any) => s + (e.points || 0), 0);
    return (
      <div key={section.id} data-pdf-block className="exam-section relative mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-xs font-black border-2 border-black px-3 py-1 rounded-sm">
            {section.title || `التمرين ${si + 1}`}
          </div>
          <span className="text-[10px] font-bold text-gray-700">({sectionPoints} نقاط)</span>
        </div>

        <div className="space-y-4 pr-3">
          {section.exercises.map((ex: any) => (
            <div key={ex.id} className="exercise-block">
              {/* instruction text */}
              {ex.text && (
                <div className="text-[13px] leading-relaxed mb-2">
                  <MathExerciseRenderer text={ex.text} examMode mathFont="serif" showDiagram={false} />
                </div>
              )}

              {/* figures */}
              {Array.isArray(ex.figures) &&
                ex.figures.map((f: any, fi: number) => (
                  <div
                    key={fi}
                    className="my-3 p-3 border border-dashed border-gray-400 rounded text-[11px] italic text-gray-700 text-center"
                  >
                    🖼️ {f.description}
                  </div>
                ))}

              {/* sub-questions */}
              {Array.isArray(ex.subQuestions) && ex.subQuestions.length > 0 && (
                <div className="mt-2">
                  {ex.subQuestions.map((sq: ExamSubQuestion) => (
                    <SubQuestionRender key={sq.id} sq={sq} />
                  ))}
                </div>
              )}

              {/* tables */}
              {Array.isArray(ex.tables) &&
                ex.tables.map((t: ExamTable, ti: number) => <TableRender key={ti} table={t} />)}

              {/* exercise-level answer space (only when no sub-questions) */}
              {(!ex.subQuestions || ex.subQuestions.length === 0) && (
                <AnswerArea kind={ex.answerSpace} lines={ex.answerLines} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:block print:overflow-visible"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{PRINT_STYLES}</style>
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="w-full max-w-4xl rounded-xl bg-white text-black my-4 print:my-0 print:max-w-none print:rounded-none print:shadow-none"
        dir="rtl"
      >
        {/* Action bar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between no-print z-10">
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
          >
            🖨️ طباعة / PDF
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">
            ✕
          </button>
        </div>

        {/* Exam paper */}
        <div
          id="exam-paper"
          className="p-8 mb-4 max-w-[21cm] mx-auto bg-white"
          style={{ lineHeight: 1.7, fontFamily: '"Tajawal", sans-serif' }}
        >
          {/* Header */}
          <div className="border-2 border-black p-3 mb-6">
            <div className="flex justify-between items-start text-[11px] font-bold gap-3">
              <div className="text-right space-y-1 flex-1">
                <div>{exam.metadata?.school || "المؤسسة: ...................."}</div>
                <div>المستوى: {gradeLabel}</div>
              </div>
              <div className="text-center px-3">
                <div className="text-sm font-black underline decoration-double underline-offset-4">
                  {exam.title || "اختبار في مادة الرياضيات"}
                </div>
                <div className="text-[10px] mt-1">{formatLabel}</div>
              </div>
              <div className="text-left space-y-1 flex-1">
                <div>السنة الدراسية: {exam.metadata?.year || "..../..."}</div>
                <div>المدة: {exam.duration} د — /{exam.totalPoints}</div>
                {exam.metadata?.semester && <div>الفصل: {exam.metadata.semester}</div>}
              </div>
            </div>
            <div className="text-center mt-2 text-[10px]">التلميذ(ة): ........................................</div>
          </div>

          {/* Sections */}
          <div>
            {exam.sections.filter((s) => s.id !== "problem").map(renderSection)}

            {exam.sections.some((s) => s.id === "problem" && s.exercises.length > 0) && (
              <div className="mt-8 pt-4 border-t-4 border-double border-black">
                <div className="text-center mb-4">
                  <span className="bg-black text-white px-6 py-1.5 text-sm font-black rounded-lg">
                    الوضعية الإدماجية
                  </span>
                </div>
                {exam.sections.filter((s) => s.id === "problem").map(renderSection)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[9px] font-bold border-t border-black pt-2 mt-8">
            <div>الصفحة 1</div>
            <div>انتهى</div>
            <div>بالتوفيق ✨</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Bloom labels exported in case other code referenced them
export { BLOOM_LABELS };
