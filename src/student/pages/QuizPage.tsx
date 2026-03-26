import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const QuizPage = () => {
  const { user } = useAuth();
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalPct, setFinalPct] = useState(0);

  const sampleQuizzes = [
    { id: "1", title: "اختبار الجبر الأساسي", description: "أسئلة حول المعادلات والمتراجحات", questions: [
      { question_text: "حل المعادلة: 2x + 3 = 7", options: ["x = 1", "x = 2", "x = 3", "x = 4"], correct: "x = 2", points: 10 },
      { question_text: "ما هو ميل المستقيم y = 3x + 1؟", options: ["1", "3", "-3", "0"], correct: "3", points: 10 },
    ]},
    { id: "2", title: "اختبار الهندسة", description: "أسئلة حول المثلثات والدوائر", questions: [
      { question_text: "مجموع زوايا المثلث", options: ["90°", "180°", "270°", "360°"], correct: "180°", points: 10 },
      { question_text: "محيط دائرة نصف قطرها 7", options: ["14π", "49π", "7π", "21π"], correct: "14π", points: 10 },
    ]},
  ];

  const startQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setScore(0);
    setFinished(false);
    setSelected(null);
    setFinalPct(0);
  };

  const submitAnswer = () => {
    if (!selected || !activeQuiz) return;
    const q = activeQuiz.questions[currentQ];
    const isCorrect = selected === q.correct;
    const newScore = isCorrect ? score + q.points : score;
    setScore(newScore);

    if (currentQ + 1 < activeQuiz.questions.length) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
    } else {
      const totalPoints = activeQuiz.questions.reduce((s: number, q: any) => s + q.points, 0);
      setFinalPct(totalPoints > 0 ? Math.round((newScore / totalPoints) * 100) : 0);
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="bg-card rounded-2xl border border-border p-8">
          <span className="text-6xl block mb-4">{finalPct >= 80 ? "🏆" : finalPct >= 60 ? "⭐" : "📝"}</span>
          <h2 className="text-2xl font-black mb-2">النتيجة: {finalPct}%</h2>
          <p className="text-muted-foreground">
            {finalPct >= 80 ? "أداء ممتاز!" : finalPct >= 60 ? "جيد! يمكنك التحسين" : "تحتاج لمراجعة إضافية"}
          </p>
          <button onClick={() => setActiveQuiz(null)} className="mt-6 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium w-full">العودة</button>
        </div>
      </div>
    );
  }

  if (activeQuiz) {
    const q = activeQuiz.questions[currentQ];
    const progress = (currentQ / activeQuiz.questions.length) * 100;
    return (
      <div className="max-w-2xl space-y-6">
        <button onClick={() => setActiveQuiz(null)} className="text-sm text-muted-foreground hover:text-foreground">← العودة</button>
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">السؤال {currentQ + 1} من {activeQuiz.questions.length}</span>
            <span className="text-xs text-muted-foreground">{activeQuiz.title}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full mb-6">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-lg font-bold mb-6">{q.question_text}</p>
          <div className="space-y-3">
            {q.options.map((opt: string, i: number) => (
              <button key={i} onClick={() => setSelected(opt)} className={`w-full text-right p-4 rounded-xl border-2 transition-all ${selected === opt ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/30"}`}>
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={submitAnswer} disabled={!selected} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              {currentQ + 1 < activeQuiz.questions.length ? "التالي ←" : "إنهاء"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">اختبارات متعددة الخيارات لتقييم فهمك</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {sampleQuizzes.map((q) => (
          <div key={q.id} className="bg-card rounded-2xl border border-border p-6 card-hover">
            <h3 className="font-bold mb-1">{q.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{q.description}</p>
            <button onClick={() => startQuiz(q)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium w-full">ابدأ الاختبار</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizPage;
