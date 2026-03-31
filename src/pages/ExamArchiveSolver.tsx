import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  ArrowLeft,
  Timer,
  Layout,
  Maximize2,
  Minimize2
} from "lucide-react";
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
  const [timeLeft, setTimeLeft] = useState(120 * 60); // Default 2 hours
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (examId) loadExamData();
  }, [examId]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  async function loadExamData() {
    setLoading(true);
    try {
      const { data: entry, error: entryErr } = await supabase
        .from("exam_kb_entries")
        .select("*")
        .eq("id", examId)
        .single();
      
      if (entryErr) throw entryErr;
      setExam(entry);

      const { data: qs, error: qsErr } = await supabase
        .from("exam_kb_questions")
        .select("*")
        .eq("exam_id", examId)
        .order("question_number");

      if (qsErr) throw qsErr;
      setQuestions(qs || []);

      // Set default time based on format
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
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-primary font-black">...</div>
        </div>
        <p className="text-muted-foreground font-bold animate-pulse">جاري تهيئة بيئة الامتحان الرسمية...</p>
      </div>
    );
  }

  if (!exam) return null;

  const currentQuestion = questions[activeQuestionIndex];
  const progress = ((Object.keys(answers).length) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden" dir="rtl">
      {/* Top Header Navigation */}
      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/annales")} className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black leading-tight">{exam.format.toUpperCase()} — {exam.year}</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{exam.session === "juin" ? "دورة جوان" : exam.session}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black tabular-nums transition-colors ${timeLeft < 300 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/5 text-primary'}`}>
             <Timer className="w-4 h-4" />
             {formatTime(timeLeft)}
          </div>
          <div className="h-8 w-px bg-border" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFullPaper(!showFullPaper)}
            className="rounded-xl font-bold gap-2"
          >
            {showFullPaper ? <Layout className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {showFullPaper ? "العرض المسنن" : "الورقة الكاملة"}
          </Button>
          <Button className="rounded-xl font-black bg-primary px-6 shadow-lg shadow-primary/20">
            إنهاء وتسليم
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Question List */}
        <div className="w-80 bg-card border-l border-border flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="p-6 space-y-6">
             <div className="space-y-4">
               <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">تقدم الحل</h3>
               <div className="h-2 bg-muted rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   className="h-full bg-primary"
                 />
               </div>
               <p className="text-[10px] text-muted-foreground font-bold">{Object.keys(answers).length} من أصل {questions.length} سؤال تم التعامل معه</p>
             </div>

             <div className="space-y-2">
               <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">هيكل الموضوع</h3>
               {questions.map((q, i) => (
                 <button
                    key={q.id}
                    onClick={() => { setActiveQuestionIndex(i); setShowFullPaper(false); }}
                    className={`
                      w-full text-right p-4 rounded-2xl border-2 transition-all group
                      ${activeQuestionIndex === i && !showFullPaper ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'}
                    `}
                 >
                   <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black uppercase ${activeQuestionIndex === i ? 'text-primary' : 'text-muted-foreground'}`}>{q.section_label}</span>
                      {answers[q.id] && <CheckCircle2 className="w-3 h-3 text-primary" />}
                   </div>
                   <div className="text-xs font-bold text-foreground line-clamp-1">{q.text.substring(0, 40)}...</div>
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Main Workspace */}
        <main className="flex-1 bg-muted/20 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            {showFullPaper ? (
              <motion.div
                key="full-paper"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto space-y-12 pb-32"
              >
                {/* Simulated Exam Header */}
                <div className="bg-white border-2 border-black p-8 text-center space-y-4 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-black" />
                   <div className="text-sm font-black uppercase tracking-widest">الجمهورية الجزائرية الديمقراطية الشعبية</div>
                   <div className="text-xs font-bold">وزارة التربية الوطنية</div>
                   <div className="flex justify-between items-center text-[10px] font-black border-y border-black/10 py-4 mt-6">
                      <div className="text-right">دورة: {exam.year}</div>
                      <div className="text-center text-lg">{exam.format.toUpperCase()} — {GRADE_OPTIONS.find(g => g.value === exam.grade)?.label}</div>
                      <div className="text-left">المدة: {exam.format === 'bac' ? '03 سا و 30 د' : '02 سا'}</div>
                   </div>
                   <div className="text-xl font-black underline decoration-double underline-offset-8 pt-4">اختبار في مادة: الرياضيات</div>
                </div>

                <div className="space-y-16">
                  {questions.map((q, i) => (
                    <div key={q.id} className="space-y-6 relative">
                       <div className="flex items-center gap-4">
                          <div className="px-4 py-1 border-2 border-black font-black text-sm">{q.section_label} ({q.points} نقاط)</div>
                          <div className="flex-1 h-px bg-black/10" />
                       </div>
                       <div className="text-lg leading-relaxed antialiased">
                          <MathExerciseRenderer text={q.text} />
                       </div>
                       <Button 
                         variant="outline" 
                         onClick={() => { setActiveQuestionIndex(i); setShowFullPaper(false); }}
                         className="rounded-xl border-dashed border-2 hover:border-primary hover:text-primary transition-all"
                       >
                         تفعيل بيئة الحل لهذا الجزء ←
                       </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto space-y-8 h-full flex flex-col pb-32"
              >
                 {/* Question Card */}
                 <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-xl shadow-black/5 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                       <span className="px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-black">{currentQuestion.section_label}</span>
                       <span className="text-xs font-black text-muted-foreground">{currentQuestion.points} نقاط</span>
                    </div>
                    <div className="text-xl leading-relaxed font-tajawal">
                       <MathExerciseRenderer text={currentQuestion.text} />
                    </div>
                 </div>

                 {/* Solver Area */}
                 <div className="flex-1 bg-card border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden flex flex-col">
                    <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center justify-between">
                       <h3 className="text-sm font-black flex items-center gap-2">
                          <Layout className="w-4 h-4 text-primary" /> مساحة التفكير والحل
                       </h3>
                       <div className="flex items-center gap-2">
                          <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">Control + Enter للتحقق</kbd>
                       </div>
                    </div>
                    <div className="flex-1 relative">
                       <textarea 
                          value={answers[currentQuestion.id] || ""}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                          placeholder="اكتب خطوات حلك هنا... يمكنك استخدام الرموز الرياضية"
                          className="w-full h-full p-8 bg-transparent border-none focus:ring-0 text-lg leading-relaxed resize-none font-tajawal"
                          dir="ltr"
                       />
                       <div className="absolute bottom-6 left-6 flex gap-2">
                          <Button variant="outline" className="rounded-xl font-bold gap-2">
                             <HelpCircle className="w-4 h-4" /> طلب تلميح ذكي
                          </Button>
                          <Button 
                             onClick={() => {
                                toast.success("تم حفظ مسودة الحل لهذه الخطوة");
                                handleNext();
                             }}
                             className="rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                          >
                             حفظ وانتقال
                          </Button>
                       </div>
                    </div>
                 </div>

                 {/* Navigation controls (fixed-ish or bottom-sticky) */}
                 <div className="flex items-center justify-between pt-4">
                    <Button 
                      variant="ghost" 
                      onClick={handlePrev} 
                      disabled={activeQuestionIndex === 0}
                      className="rounded-xl font-bold gap-2"
                    >
                       <ChevronRight className="w-4 h-4" /> الجزء السابق
                    </Button>
                    <div className="flex gap-1">
                       {questions.map((_, i) => (
                         <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activeQuestionIndex ? 'w-8 bg-primary' : 'bg-border'}`} />
                       ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={handleNext} 
                      disabled={activeQuestionIndex === questions.length - 1}
                      className="rounded-xl font-bold gap-2"
                    >
                       الجزء التالي <ChevronLeft className="w-4 h-4" />
                    </Button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
