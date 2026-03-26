// ===== Exam Corrector Panel — AI + Teacher Review =====
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Exam, StudentAnswer, CorrectionResult, ExamCorrection,
  getGradeLetter, TYPE_LABELS_AR,
} from "@/engine/exam-types";

interface Props {
  exams: Exam[];
  exam: Exam | null;
  onSelectExam: (exam: Exam) => void;
}

export function ExamCorrectorPanel({ exams, exam, onSelectExam }: Props) {
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<CorrectionResult[]>([]);
  const [correcting, setCorrecting] = useState(false);
  const [corrected, setCorrected] = useState(false);

  if (!exam) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-black text-foreground">✅ تصحيح الامتحانات</h2>
        {exams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-sm">لا توجد امتحانات بعد. أنشئ امتحاناً أولاً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(e => (
              <button key={e.id} onClick={() => onSelectExam(e)}
                className="p-5 rounded-xl border border-border bg-card text-right hover:border-primary/40 transition-all">
                <div className="text-sm font-black text-foreground">{e.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {e.format.toUpperCase()} · /{e.totalPoints} · {e.sections.reduce((s, sec) => s + sec.exercises.length, 0)} تمارين
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const allExercises = exam.sections.flatMap(s => s.exercises);

  const handleAICorrect = async () => {
    setCorrecting(true);
    // Simulate AI correction (in production, call edge function)
    await new Promise(r => setTimeout(r, 1500));

    const results: CorrectionResult[] = allExercises.map(ex => {
      const studentAnswer = answers[ex.id] || "";
      const hasAnswer = studentAnswer.trim().length > 0;
      const score = hasAnswer ? Math.round(ex.points * (0.3 + Math.random() * 0.7) * 2) / 2 : 0;
      return {
        exerciseId: ex.id,
        score,
        maxScore: ex.points,
        feedback: hasAnswer ? "إجابة جزئية — راجع الخطوات" : "لم يتم الإجابة",
        feedbackAr: hasAnswer ? "تم تقييم الإجابة" : "لم يتم الإجابة على هذا السؤال",
        steps: hasAnswer ? [
          { description: "فهم المسألة", expected: "صحيح", studentAnswer: "✓", isCorrect: true, pointsAwarded: score * 0.3, pointsPossible: ex.points * 0.3 },
          { description: "تطبيق القاعدة", expected: "صحيح", studentAnswer: studentAnswer.slice(0, 30), isCorrect: score > ex.points * 0.5, pointsAwarded: score * 0.4, pointsPossible: ex.points * 0.4 },
          { description: "النتيجة النهائية", expected: "صحيح", studentAnswer: studentAnswer.slice(-20), isCorrect: score > ex.points * 0.8, pointsAwarded: score * 0.3, pointsPossible: ex.points * 0.3 },
        ] : [],
        isCorrect: score === ex.points,
        partialCredit: score > 0 && score < ex.points,
        correctedBy: "ai",
      };
    });

    setCorrections(results);
    setCorrecting(false);
    setCorrected(true);
  };

  const updateScore = (exerciseId: string, newScore: number) => {
    setCorrections(prev => prev.map(c =>
      c.exerciseId === exerciseId ? { ...c, score: Math.min(newScore, c.maxScore), correctedBy: "teacher", teacherOverride: true } : c
    ));
  };

  const totalScore = corrections.reduce((s, c) => s + c.score, 0);
  const totalPossible = corrections.reduce((s, c) => s + c.maxScore, 0);
  const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">✅ تصحيح: {exam.title}</h2>
          <p className="text-xs text-muted-foreground">/{exam.totalPoints} نقطة · {allExercises.length} تمارين</p>
        </div>
        <button onClick={() => onSelectExam(null as any)} className="text-xs text-muted-foreground hover:text-foreground">← رجوع</button>
      </div>

      {/* Student info */}
      <div className="rounded-xl border border-border bg-card p-4">
        <label className="text-xs font-bold text-foreground block mb-1">اسم التلميذ(ة)</label>
        <input value={studentName} onChange={e => setStudentName(e.target.value)}
          className="w-full max-w-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          placeholder="الاسم الكامل" />
      </div>

      {/* Answer input + corrections */}
      <div className="space-y-4">
        {exam.sections.map(section => (
          <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <span className="text-sm font-black text-foreground">{section.title}</span>
            </div>
            <div className="p-4 space-y-4">
              {section.exercises.map(ex => {
                const correction = corrections.find(c => c.exerciseId === ex.id);
                return (
                  <div key={ex.id} className="space-y-2">
                    {/* Exercise text */}
                    <div className="text-xs text-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                      {ex.text || "(تمرين بدون نص)"}
                      <span className="text-[9px] text-muted-foreground mr-2">({ex.points} ن)</span>
                    </div>

                    {/* Student answer input */}
                    <textarea
                      value={answers[ex.id] || ""}
                      onChange={e => setAnswers({ ...answers, [ex.id]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground resize-none min-h-[60px]"
                      placeholder="إجابة التلميذ..."
                      disabled={corrected}
                    />

                    {/* Correction result */}
                    {correction && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border ${
                          correction.isCorrect ? "border-green-500/30 bg-green-500/5" :
                          correction.partialCredit ? "border-yellow-500/30 bg-yellow-500/5" :
                          "border-destructive/30 bg-destructive/5"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{correction.isCorrect ? "✅" : correction.partialCredit ? "🟡" : "❌"}</span>
                            <span className="text-xs font-bold text-foreground">{correction.feedbackAr}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="number" value={correction.score} min={0} max={correction.maxScore} step={0.5}
                              onChange={e => updateScore(ex.id, +e.target.value)}
                              className="w-14 px-1.5 py-0.5 rounded border border-border bg-card text-xs text-foreground text-center font-bold" />
                            <span className="text-xs text-muted-foreground">/ {correction.maxScore}</span>
                            {correction.teacherOverride && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">معدّل</span>
                            )}
                          </div>
                        </div>

                        {/* Steps */}
                        {correction.steps.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {correction.steps.map((step, i) => (
                              <div key={i} className="flex items-center gap-2 text-[10px]">
                                <span>{step.isCorrect ? "✓" : "✗"}</span>
                                <span className="text-muted-foreground flex-1">{step.description}</span>
                                <span className="font-bold">{step.pointsAwarded.toFixed(1)}/{step.pointsPossible.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions & Score */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        {corrected ? (
          <div className="flex items-center gap-6">
            <div>
              <div className="text-2xl font-black" style={{
                color: percentage >= 50 ? "hsl(var(--geometry))" : "hsl(var(--destructive))"
              }}>
                {totalScore} / {totalPossible}
              </div>
              <div className="text-xs text-muted-foreground">{percentage}% — {getGradeLetter(percentage)}</div>
            </div>
            <button onClick={() => { setCorrections([]); setCorrected(false); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted">
              🔄 إعادة التصحيح
            </button>
          </div>
        ) : (
          <button onClick={handleAICorrect} disabled={correcting}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all">
            {correcting ? "⏳ جاري التصحيح..." : "🤖 تصحيح بالذكاء الاصطناعي"}
          </button>
        )}
      </div>
    </div>
  );
}
