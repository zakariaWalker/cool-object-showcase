import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { StudentAnswerEditor } from "@/components/StudentAnswerEditor";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Timer,
  Layout,
  Maximize2,
  PenTool,
  FileText,
  Download,
  Loader2
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { GRADE_OPTIONS } from "@/engine/exam-types";

interface ExamEntry {
  id: string;
  year: string;
  session: string;
  format: string;
  grade: string;
  stream: string | null;
}

interface ExamQuestion {
  id: string;
  section_label: string;
  question_number: number;
  text: string;
  points: number;
  type: string;
  difficulty: string;
}

export default function ExamArchiveSolver() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamEntry | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showFullPaper, setShowFullPaper] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (examId) loadExamData();
  }, [examId]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  async function loadExamData() {
    setLoading(true);
    try {
      const { data: entry, error: entryErr } = await supabase
        .from("exam_kb_entries").select("*").eq("id", examId).single();
      if (entryErr) throw entryErr;
      setExam(entry);

      const { data: qs, error: qsErr } = await supabase
        .from("exam_kb_questions").select("*").eq("exam_id", examId).order("question_number");
      if (qsErr) throw qsErr;
      setQuestions(qs || []);

      if (entry.format === 'bac') setTimeLeft(180 * 60);
      else if (entry.format === 'bem') setTimeLeft(120 * 60);
      setIsTimerRunning(true);
    } catch (e) {
      console.error("Error loading exam:", e);
      toast.error("فشل تحميل بيانات الامتحان");
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => {
    if (activeQuestionIndex < questions.length - 1) setActiveQuestionIndex(prev => prev + 1);
  };
  const handlePrev = () => {
    if (activeQuestionIndex > 0) setActiveQuestionIndex(prev => prev - 1);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAlgebraSubmit = (steps: string[]) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: steps.join("\n") }));
    toast.success("تم حفظ الإجابة");
    handleNext();
  };

  const handleGeometrySubmit = (data: any) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: JSON.stringify(data) }));
    toast.success("تم حفظ الإجابة");
    handleNext();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || isExporting) return;
    setIsExporting(true);
    const node = printRef.current;
    // Make node visible off-screen for capture
    const prevStyle = node.getAttribute("style") || "";
    node.style.cssText = `${prevStyle};position:fixed;top:0;left:-99999px;display:block;`;
    try {
      // A4 portrait dimensions in mm
      const PAGE_W_MM = 210;
      const PAGE_H_MM = 297;
      const MARGIN_MM = 12;
      const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
      const CONTENT_H_MM = PAGE_H_MM - MARGIN_MM * 2;

      // Capture each page block separately to avoid mid-element splits
      const pageNodes = Array.from(node.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      if (pageNodes.length === 0) throw new Error("No pages to render");

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

      for (let i = 0; i < pageNodes.length; i++) {
        const pageEl = pageNodes[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
          windowWidth: pageEl.scrollWidth,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const ratio = canvas.height / canvas.width;
        let drawW = CONTENT_W_MM;
        let drawH = drawW * ratio;
        // Safety clamp: if a single block is taller than a page, scale down to fit
        if (drawH > CONTENT_H_MM) {
          drawH = CONTENT_H_MM;
          drawW = drawH / ratio;
        }
        if (i > 0) pdf.addPage("a4", "portrait");
        const x = (PAGE_W_MM - drawW) / 2;
        const y = MARGIN_MM;
        pdf.addImage(imgData, "JPEG", x, y, drawW, drawH);
        // Footer page number
        pdf.setFontSize(9);
        pdf.setTextColor(120);
        pdf.text(
          `${i + 1} / ${pageNodes.length}`,
          PAGE_W_MM / 2,
          PAGE_H_MM - 6,
          { align: "center" }
        );
      }

      const filename = `${exam?.format?.toUpperCase() || "EXAM"}_${exam?.year || ""}_${exam?.session || ""}.pdf`
        .replace(/\s+/g, "_");
      pdf.save(filename);
      toast.success("تم تنزيل ملف PDF");
    } catch (e) {
      console.error("PDF export failed", e);
      toast.error("فشل توليد ملف PDF");
    } finally {
      node.style.cssText = prevStyle;
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-bold">جاري تحميل الامتحان...</p>
      </div>
    );
  }

  if (!exam) return null;

  const currentQuestion = questions[activeQuestionIndex];
  const progress = ((Object.keys(answers).length) / Math.max(questions.length, 1)) * 100;
  const gradeLabel = GRADE_OPTIONS.find(g => g.value === exam.grade)?.label || exam.grade;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/annales")} className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-black leading-tight">{exam.format.toUpperCase()} — {exam.year}</h1>
            <p className="text-[9px] text-muted-foreground font-bold">{exam.session === "juin" ? "دورة جوان" : exam.session} · {gradeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs tabular-nums ${timeLeft < 300 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-muted text-foreground'}`}>
            <Timer className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFullPaper(!showFullPaper)} className="rounded-lg text-xs gap-1.5">
            {showFullPaper ? <Layout className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {showFullPaper ? "حل تفاعلي" : "الورقة"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExporting || questions.length === 0}
            className="rounded-lg text-xs gap-1.5"
            title="تحميل نسخة PDF بصيغة A4"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? "جاري التحضير..." : "PDF"}
          </Button>
          <Button size="sm" className="rounded-lg font-black text-xs px-4 bg-primary">إنهاء</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-card border-l border-border flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">التقدم</h3>
                <span className="text-[10px] font-black text-primary">{Object.keys(answers).length}/{questions.length}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-primary rounded-full" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">الأسئلة</h3>
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => { setActiveQuestionIndex(i); setShowFullPaper(false); }}
                  className={`w-full text-right p-3 rounded-lg border transition-all text-xs
                    ${activeQuestionIndex === i && !showFullPaper ? 'border-primary bg-primary/5 font-black' : 'border-transparent hover:bg-muted/50'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-muted-foreground">{q.section_label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground">{q.points}ن</span>
                      {answers[q.id] && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    </div>
                  </div>
                  <div className="text-foreground line-clamp-1 mt-0.5">{q.text.substring(0, 50)}...</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6 bg-muted/10">
          <AnimatePresence mode="wait">
            {showFullPaper ? (
              <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="max-w-3xl mx-auto space-y-8 pb-20">
                {/* Paper header */}
                <div className="bg-card border border-border p-6 rounded-xl text-center space-y-2">
                  <div className="text-xs font-black text-muted-foreground">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</div>
                  <div className="text-lg font-black">{exam.format.toUpperCase()} — {exam.year}</div>
                  <div className="text-xs text-muted-foreground">{gradeLabel} · المدة: {exam.format === 'bac' ? '03 سا و 30 د' : '02 سا'}</div>
                  <div className="text-base font-black border-t border-border pt-3 mt-3">اختبار في مادة: الرياضيات</div>
                </div>

                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 border border-border rounded font-black text-xs">{q.section_label} ({q.points} ن)</div>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="text-sm leading-relaxed">
                      <MathExerciseRenderer text={q.text} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setActiveQuestionIndex(i); setShowFullPaper(false); }}
                      className="rounded-lg text-xs border-dashed gap-1.5">
                      <PenTool className="w-3 h-3" /> حل هذا السؤال
                    </Button>
                  </div>
                ))}
              </motion.div>
            ) : currentQuestion ? (
              <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}
                className="max-w-3xl mx-auto space-y-5 pb-20">
                {/* Question */}
                <div className="bg-card border border-border p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black">{currentQuestion.section_label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        currentQuestion.difficulty === 'hard' ? 'bg-destructive/10 text-destructive' :
                        currentQuestion.difficulty === 'easy' ? 'bg-green-500/10 text-green-600' :
                        'bg-muted text-muted-foreground'
                      }`}>{currentQuestion.difficulty === 'hard' ? 'صعب' : currentQuestion.difficulty === 'easy' ? 'سهل' : 'متوسط'}</span>
                      <span className="text-xs font-black text-muted-foreground">{currentQuestion.points} نقاط</span>
                    </div>
                  </div>
                  <div className="text-base leading-relaxed">
                    <MathExerciseRenderer text={currentQuestion.text} />
                  </div>
                </div>

                {/* Editor - Algebra or Geometry auto-detected */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 border-b border-border px-4 py-2.5 flex items-center justify-between">
                    <h3 className="text-xs font-black flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-primary" /> مساحة الحل
                    </h3>
                    <span className="text-[9px] text-muted-foreground font-bold">
                      {currentQuestion.type?.includes("هندس") || /ارسم|المثلث|الدائرة|المستقيم/.test(currentQuestion.text)
                        ? "🔷 محرر هندسي" : "📐 محرر جبري"}
                    </span>
                  </div>
                  <div className="p-4">
                    <StudentAnswerEditor
                      exerciseType={currentQuestion.type}
                      exerciseLevel={exam.grade?.includes("bac") ? "secondary" : "middle"}
                      exerciseText={currentQuestion.text}
                      onSubmitAlgebra={handleAlgebraSubmit}
                      onSubmitGeometry={handleGeometrySubmit}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={handlePrev} disabled={activeQuestionIndex === 0} className="rounded-lg text-xs gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5" /> السابق
                  </Button>
                  <div className="flex gap-1">
                    {questions.map((_, i) => (
                      <button key={i} onClick={() => setActiveQuestionIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === activeQuestionIndex ? 'w-6 bg-primary' : answers[questions[i]?.id] ? 'bg-primary/40' : 'bg-border'}`} />
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleNext} disabled={activeQuestionIndex === questions.length - 1} className="rounded-lg text-xs gap-1.5">
                    التالي <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
