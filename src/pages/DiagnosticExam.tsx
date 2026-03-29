// ===== Interactive Diagnostic Exam — Transform PDF exams into interactive assessments =====
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StudentAnswerEditor } from "@/components/StudentAnswerEditor";
import { LatexRenderer } from "@/components/LatexRenderer";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
  FileText, Brain, Target, TrendingUp, Zap, BookOpen, BarChart3,
  Flame, Award, Play, Pause, RotateCcw, Eye, EyeOff, Send
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExamUpload {
  id: string;
  file_name: string;
  format: string;
  grade: string | null;
  year: string | null;
  session: string | null;
  status: string;
  created_at: string;
}

interface ExamQuestion {
  id: string;
  upload_id: string;
  section_label: string;
  question_number: number;
  sub_question: string | null;
  text: string;
  points: number | null;
  type: string | null;
  difficulty: string | null;
  concepts: string[] | null;
  cognitive_level: string | null;
  bloom_level: number | null;
  estimated_time_min: number | null;
}

interface StudentAnswer {
  questionId: string;
  answer: string;
  algebraSteps?: string[];
  geometryData?: any;
  timeSpent: number; // seconds
  confidence: number; // 0-100
  flagged: boolean;
}

interface CorrectionResult {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
  gaps: string[];
  strengths: string[];
}

type ExamPhase = "select" | "preview" | "active" | "review" | "results";

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderMathText(text: string) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return <LatexRenderer key={i} latex={part.slice(1, -1)} className="inline" />;
    }
    return <span key={i}>{part}</span>;
  });
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  hard: "bg-red-500/15 text-red-600 border-red-500/20",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "سهل", medium: "متوسط", hard: "صعب",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ExamPhase>("select");
  const [uploads, setUploads] = useState<ExamUpload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<ExamUpload | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Active exam state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, StudentAnswer>>(new Map());
  const [totalTime, setTotalTime] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [confidence, setConfidence] = useState(50);
  const [corrections, setCorrections] = useState<CorrectionResult[]>([]);
  const [correcting, setCorrecting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadUploads();
  }, []);

  async function loadUploads() {
    setLoading(true);
    const { data } = await supabase
      .from("exam_uploads")
      .select("id, file_name, format, grade, year, session, status, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    setUploads((data as ExamUpload[]) || []);
    setLoading(false);
  }

  async function loadQuestions(uploadId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("exam_extracted_questions")
      .select("*")
      .eq("upload_id", uploadId)
      .order("question_number");
    setQuestions((data as ExamQuestion[]) || []);
    setLoading(false);
  }

  // ─── Timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "active" && !isPaused) {
      timerRef.current = setInterval(() => {
        setTotalTime(t => t + 1);
        setQuestionTime(t => t + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, isPaused]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const selectExam = async (upload: ExamUpload) => {
    setSelectedUpload(upload);
    await loadQuestions(upload.id);
    setPhase("preview");
  };

  const startExam = () => {
    setPhase("active");
    setCurrentIdx(0);
    setTotalTime(0);
    setQuestionTime(0);
    setAnswers(new Map());
  };

  const currentQ = questions[currentIdx];

  const saveCurrentAnswer = useCallback((answerText: string, steps?: string[], geoData?: any) => {
    if (!currentQ) return;
    setAnswers(prev => {
      const next = new Map(prev);
      next.set(currentQ.id, {
        questionId: currentQ.id,
        answer: answerText,
        algebraSteps: steps,
        geometryData: geoData,
        timeSpent: (prev.get(currentQ.id)?.timeSpent || 0) + questionTime,
        confidence,
        flagged: prev.get(currentQ.id)?.flagged || false,
      });
      return next;
    });
  }, [currentQ, questionTime, confidence]);

  const toggleFlag = () => {
    if (!currentQ) return;
    setAnswers(prev => {
      const next = new Map(prev);
      const existing = next.get(currentQ.id);
      if (existing) {
        next.set(currentQ.id, { ...existing, flagged: !existing.flagged });
      } else {
        next.set(currentQ.id, {
          questionId: currentQ.id, answer: "", timeSpent: 0,
          confidence: 50, flagged: true,
        });
      }
      return next;
    });
  };

  const goToQuestion = (idx: number) => {
    // Save time for current question
    if (currentQ) {
      setAnswers(prev => {
        const next = new Map(prev);
        const existing = next.get(currentQ.id);
        if (existing) {
          next.set(currentQ.id, { ...existing, timeSpent: existing.timeSpent + questionTime });
        }
        return next;
      });
    }
    setCurrentIdx(idx);
    setQuestionTime(0);
  };

  const submitExam = async () => {
    setPhase("review");
    setCorrecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-correct-diagnostic", {
        body: {
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            points: q.points,
            difficulty: q.difficulty,
            concepts: q.concepts,
          })),
          answers: Array.from(answers.entries()).map(([qId, a]) => ({
            questionId: qId,
            answer: a.answer,
            steps: a.algebraSteps,
            geometryData: a.geometryData,
            timeSpent: a.timeSpent,
            confidence: a.confidence,
          })),
        },
      });

      if (error) throw error;
      setCorrections(data?.corrections || generateLocalCorrections());
      setPhase("results");
    } catch (e) {
      console.error("Correction error:", e);
      // Fallback to local correction
      setCorrections(generateLocalCorrections());
      setPhase("results");
      toast.info("تم التصحيح المبدئي محلياً — التصحيح الذكي غير متاح حالياً");
    } finally {
      setCorrecting(false);
    }
  };

  function generateLocalCorrections(): CorrectionResult[] {
    return questions.map(q => {
      const ans = answers.get(q.id);
      const hasAnswer = ans && ans.answer.trim().length > 0;
      return {
        questionId: q.id,
        score: hasAnswer ? Math.round((q.points || 2) * 0.6) : 0,
        maxScore: q.points || 2,
        feedback: hasAnswer ? "تم تقديم إجابة — يحتاج مراجعة تفصيلية" : "لم يتم تقديم إجابة",
        gaps: hasAnswer ? [] : (q.concepts || []),
        strengths: hasAnswer ? (q.concepts || []).slice(0, 1) : [],
      };
    });
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const answeredCount = Array.from(answers.values()).filter(a => a.answer.trim()).length;
  const flaggedCount = Array.from(answers.values()).filter(a => a.flagged).length;
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);
  const earnedPoints = corrections.reduce((s, c) => s + c.score, 0);
  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  const groupedQuestions = questions.reduce<Record<string, ExamQuestion[]>>((acc, q) => {
    const section = q.section_label || "أسئلة عامة";
    if (!acc[section]) acc[section] = [];
    acc[section].push(q);
    return acc;
  }, {});

  const allGaps = corrections.flatMap(c => c.gaps);
  const uniqueGaps = [...new Set(allGaps)];
  const allStrengths = corrections.flatMap(c => c.strengths);
  const uniqueStrengths = [...new Set(allStrengths)];

  // ─── Render: Select Exam ──────────────────────────────────────────────────

  if (phase === "select") {
    return (
      <div className="h-full overflow-y-auto" dir="rtl">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Brain className="w-4 h-4" /> التقييم التشخيصي التفاعلي
            </div>
            <h1 className="text-2xl font-black text-foreground">اختر امتحاناً للبدء</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              حوّل أي امتحان مرفوع بصيغة PDF إلى تجربة تفاعلية — أجب بالمحررات المتخصصة واحصل على تحليل ذكي لأدائك
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground font-bold">لا توجد امتحانات مرفوعة</p>
              <Button variant="outline" onClick={() => navigate("/exam-kb")} className="gap-2">
                <FileText className="w-4 h-4" /> ارفع امتحان PDF
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploads.map(u => (
                <motion.button
                  key={u.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectExam(u)}
                  className="text-right p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <h3 className="font-black text-sm text-foreground line-clamp-1">{u.file_name.replace(/\.[^.]+$/, "")}</h3>
                      <div className="flex flex-wrap gap-2">
                        {u.format && (
                          <Badge variant="secondary" className="text-[10px]">{u.format.toUpperCase()}</Badge>
                        )}
                        {u.grade && (
                          <Badge variant="outline" className="text-[10px]">{u.grade}</Badge>
                        )}
                        {u.year && (
                          <Badge variant="outline" className="text-[10px]">{u.year}</Badge>
                        )}
                        {u.session && (
                          <Badge variant="outline" className="text-[10px]">{u.session}</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("ar-DZ")}
                      </p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: Preview ──────────────────────────────────────────────────────

  if (phase === "preview" && selectedUpload) {
    return (
      <div className="h-full overflow-y-auto" dir="rtl">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <button onClick={() => setPhase("select")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" /> العودة للقائمة
          </button>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Exam header */}
            <div className="bg-gradient-to-l from-primary/10 to-transparent p-6 border-b border-border">
              <h2 className="text-xl font-black text-foreground">
                {selectedUpload.file_name.replace(/\.[^.]+$/, "")}
              </h2>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" /> {questions.length} سؤال
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="w-3.5 h-3.5" /> {totalPoints} نقطة
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> ~{Math.round(questions.reduce((s, q) => s + (q.estimated_time_min || 3), 0))} دقيقة
                </div>
                {Object.keys(groupedQuestions).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5" /> {Object.keys(groupedQuestions).length} أقسام
                  </div>
                )}
              </div>
            </div>

            {/* Sections preview */}
            <div className="p-6 space-y-4">
              {Object.entries(groupedQuestions).map(([section, qs]) => (
                <div key={section} className="space-y-2">
                  <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {section}
                    <span className="text-muted-foreground font-normal text-xs">({qs.length} أسئلة)</span>
                  </h3>
                  <div className="flex flex-wrap gap-2 pr-4">
                    {qs.map(q => (
                      <div key={q.id} className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold ${DIFFICULTY_COLORS[q.difficulty || "medium"]}`}>
                        س{q.question_number}{q.sub_question ? `.${q.sub_question}` : ""} · {q.points || 0}ن · {DIFFICULTY_LABELS[q.difficulty || "medium"]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Difficulty distribution */}
            <div className="px-6 pb-6">
              <div className="rounded-xl bg-muted/30 p-4 space-y-3">
                <h4 className="text-xs font-black text-muted-foreground">توزيع الصعوبة</h4>
                <div className="flex gap-2">
                  {["easy", "medium", "hard"].map(d => {
                    const count = questions.filter(q => q.difficulty === d).length;
                    const pct = questions.length > 0 ? (count / questions.length) * 100 : 0;
                    return (
                      <div key={d} className="flex-1 space-y-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${d === "easy" ? "bg-emerald-500" : d === "medium" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground">{DIFFICULTY_LABELS[d]} ({count})</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Start button */}
            <div className="p-6 border-t border-border bg-muted/20">
              <Button onClick={startExam} size="lg" className="w-full gap-3 py-6 text-base font-black rounded-xl">
                <Play className="w-5 h-5" /> ابدأ الامتحان التفاعلي
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Active Exam ──────────────────────────────────────────────────

  if (phase === "active" && currentQ) {
    const currentAnswer = answers.get(currentQ.id);
    const section = currentQ.section_label || "";

    return (
      <div className="h-full flex" dir="rtl">
        {/* Sidebar — Question navigator */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-foreground">التنقل</span>
                  <span className="text-[10px] text-muted-foreground">{answeredCount}/{questions.length}</span>
                </div>
                <Progress value={(answeredCount / questions.length) * 100} className="h-1.5" />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {Object.entries(groupedQuestions).map(([sec, qs]) => (
                  <div key={sec}>
                    <p className="text-[10px] font-black text-muted-foreground px-2 mb-1">{sec}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {qs.map(q => {
                        const idx = questions.indexOf(q);
                        const ans = answers.get(q.id);
                        const isActive = idx === currentIdx;
                        const isAnswered = ans && ans.answer.trim().length > 0;
                        const isFlagged = ans?.flagged;
                        return (
                          <button
                            key={q.id}
                            onClick={() => goToQuestion(idx)}
                            className={`
                              relative w-full aspect-square rounded-lg text-xs font-black transition-all
                              ${isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/40" :
                                isAnswered ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" :
                                "bg-muted/50 text-muted-foreground border border-border hover:border-primary/30"}
                            `}
                          >
                            {q.question_number}{q.sub_question || ""}
                            {isFlagged && (
                              <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
                                <span className="text-[7px] text-white">!</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar stats */}
              <div className="p-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">الوقت الكلي</span>
                  <span className="font-mono font-bold text-foreground">{formatTime(totalTime)}</span>
                </div>
                {flaggedCount > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-amber-600">معلّمة للمراجعة</span>
                    <span className="font-bold text-amber-600">{flaggedCount}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              {showSidebar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-foreground">
                {currentIdx + 1}/{questions.length}
              </span>
              <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1 w-24" />
            </div>

            <div className="mr-auto flex items-center gap-3">
              {/* Question timer */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 text-xs">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono font-bold">{formatTime(questionTime)}</span>
              </div>

              {/* Pause */}
              <button onClick={() => setIsPaused(!isPaused)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                {isPaused ? <Play className="w-4 h-4 text-emerald-500" /> : <Pause className="w-4 h-4 text-muted-foreground" />}
              </button>

              {/* Flag */}
              <button onClick={toggleFlag} className={`p-1.5 rounded-lg transition-colors ${currentAnswer?.flagged ? "bg-amber-500/15 text-amber-500" : "hover:bg-muted text-muted-foreground"}`}>
                <AlertTriangle className="w-4 h-4" />
              </button>

              {/* Total timer */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-xs text-primary">
                <Flame className="w-3.5 h-3.5" />
                <span className="font-mono font-bold">{formatTime(totalTime)}</span>
              </div>
            </div>
          </div>

          {/* Pause overlay */}
          {isPaused && (
            <div className="flex-1 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center space-y-4">
                <Pause className="w-16 h-16 mx-auto text-muted-foreground/30" />
                <p className="text-lg font-black text-foreground">الامتحان متوقف</p>
                <Button onClick={() => setIsPaused(false)} className="gap-2">
                  <Play className="w-4 h-4" /> استئناف
                </Button>
              </div>
            </div>
          )}

          {!isPaused && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Section label */}
                {section && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full bg-primary" />
                    <span className="text-xs font-black text-primary">{section}</span>
                  </div>
                )}

                {/* Question card */}
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  {/* Question header */}
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                      {currentQ.question_number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {currentQ.sub_question && (
                          <Badge variant="outline" className="text-[10px]">{currentQ.sub_question})</Badge>
                        )}
                        {currentQ.type && (
                          <Badge variant="secondary" className="text-[10px]">{currentQ.type}</Badge>
                        )}
                        {currentQ.difficulty && (
                          <Badge className={`text-[10px] border ${DIFFICULTY_COLORS[currentQ.difficulty]}`}>
                            {DIFFICULTY_LABELS[currentQ.difficulty]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {(currentQ.points || 0) > 0 && (
                      <div className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {currentQ.points} نقاط
                      </div>
                    )}
                  </div>

                  {/* Question text */}
                  <div className="p-5">
                    <div className="text-sm leading-loose text-foreground" style={{ direction: "rtl" }}>
                      {renderMathText(currentQ.text)}
                    </div>
                  </div>

                  {/* Concepts chips */}
                  {currentQ.concepts && currentQ.concepts.length > 0 && (
                    <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                      {currentQ.concepts.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold border border-accent/20">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Confidence slider */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-muted-foreground">مستوى الثقة بإجابتك</span>
                    <span className="text-xs font-bold text-primary">{confidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidence}
                    onChange={e => setConfidence(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>غير واثق</span>
                    <span>واثق تماماً</span>
                  </div>
                </div>

                {/* Student Answer Editor */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black text-foreground">إجابتك</span>
                  </div>
                  <div className="p-4">
                    <StudentAnswerEditor
                      exerciseType={currentQ.type || ""}
                      exerciseText={currentQ.text}
                      onSubmitAlgebra={(steps) => saveCurrentAnswer(steps.join("\n"), steps)}
                      onSubmitGeometry={(data) => saveCurrentAnswer(JSON.stringify(data), undefined, data)}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    disabled={currentIdx === 0}
                    onClick={() => goToQuestion(currentIdx - 1)}
                    className="gap-2"
                  >
                    <ChevronRight className="w-4 h-4" /> السابق
                  </Button>

                  <div className="flex-1" />

                  {currentIdx < questions.length - 1 ? (
                    <Button onClick={() => goToQuestion(currentIdx + 1)} className="gap-2">
                      التالي <ChevronLeft className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={submitExam} variant="default" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> تسليم الامتحان
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: Review / Correcting ──────────────────────────────────────────

  if (phase === "review" && correcting) {
    return (
      <div className="h-full flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center"
          >
            <Brain className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-xl font-black text-foreground">جاري التصحيح الذكي...</h2>
          <p className="text-sm text-muted-foreground">يتم تحليل إجاباتك وتحديد الثغرات</p>
          <Progress value={65} className="max-w-xs mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Render: Results ──────────────────────────────────────────────────────

  if (phase === "results") {
    const grade = percentage >= 80 ? "ممتاز" : percentage >= 60 ? "جيد" : percentage >= 40 ? "متوسط" : "يحتاج تحسين";
    const gradeColor = percentage >= 80 ? "text-emerald-500" : percentage >= 60 ? "text-blue-500" : percentage >= 40 ? "text-amber-500" : "text-red-500";
    const gradeEmoji = percentage >= 80 ? "🏆" : percentage >= 60 ? "👍" : percentage >= 40 ? "💪" : "📚";

    return (
      <div className="h-full overflow-y-auto" dir="rtl">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Score hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-8 text-center space-y-4">
              <div className="text-5xl">{gradeEmoji}</div>
              <div className="space-y-1">
                <h2 className={`text-4xl font-black ${gradeColor}`}>{percentage}%</h2>
                <p className="text-lg font-black text-foreground">{grade}</p>
              </div>
              <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-black text-foreground">{earnedPoints}/{totalPoints}</p>
                  <p>النقاط</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-foreground">{answeredCount}/{questions.length}</p>
                  <p>مُجاب</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-foreground">{formatTime(totalTime)}</p>
                  <p>الوقت</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Gap & Strengths cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gaps */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-sm text-foreground">ثغرات مكتشفة ({uniqueGaps.length})</h3>
              </div>
              {uniqueGaps.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {uniqueGaps.map((g, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-red-500/10 text-red-600 text-[11px] font-bold border border-red-500/20">{g}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">لم يتم اكتشاف ثغرات — أداء ممتاز!</p>
              )}
            </div>

            {/* Strengths */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-sm text-foreground">نقاط القوة ({uniqueStrengths.length})</h3>
              </div>
              {uniqueStrengths.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {uniqueStrengths.map((s, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold border border-emerald-500/20">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">أجب على المزيد من الأسئلة لتحديد نقاط قوتك</p>
              )}
            </div>
          </div>

          {/* Per-question results */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> التفصيل سؤال بسؤال
              </h3>
            </div>
            <div className="divide-y divide-border">
              {questions.map((q, i) => {
                const corr = corrections.find(c => c.questionId === q.id);
                const ans = answers.get(q.id);
                const scorePct = corr ? (corr.maxScore > 0 ? (corr.score / corr.maxScore) * 100 : 0) : 0;
                return (
                  <div key={q.id} className="p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${scorePct >= 60 ? "bg-emerald-500/15 text-emerald-600" : scorePct > 0 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"}`}>
                        {q.question_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground line-clamp-1">{q.text.slice(0, 80)}...</p>
                        <div className="flex items-center gap-2 mt-1">
                          {q.difficulty && <Badge className={`text-[9px] ${DIFFICULTY_COLORS[q.difficulty]}`}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>}
                          {ans && <span className="text-[9px] text-muted-foreground">⏱️ {formatTime(ans.timeSpent)} · ثقة {ans.confidence}%</span>}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`text-sm font-black ${scorePct >= 60 ? "text-emerald-600" : scorePct > 0 ? "text-amber-600" : "text-red-600"}`}>
                          {corr?.score || 0}/{corr?.maxScore || q.points || 0}
                        </span>
                      </div>
                    </div>
                    {corr?.feedback && (
                      <p className="text-[11px] text-muted-foreground pr-11">{corr.feedback}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={() => { setPhase("select"); setQuestions([]); setCorrections([]); setAnswers(new Map()); }} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> امتحان آخر
            </Button>
            <Button onClick={() => navigate("/gaps")} className="gap-2">
              <TrendingUp className="w-4 h-4" /> خطة المعالجة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
