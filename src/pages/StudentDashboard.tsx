import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Route as RoutePath,
  BookOpen,
  Brain,
  Trophy,
  CreditCard,
  Target,
  Star,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { path: "/student", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/student/path", label: "مسار التعلم", icon: RoutePath },
  { path: "/student/flashcards", label: "البطاقات", icon: CreditCard },
  { path: "/student/quiz", label: "الاختبارات", icon: Target },
  { path: "/student/exercises", label: "التمارين", icon: Brain },
  { path: "/student/badges", label: "الشارات", icon: Trophy },
];

// ─── Dashboard Home ───────────────────────────────────────────────────────────
const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    completed: 0,
    inProgress: 0,
    avgScore: 0,
    total: 0,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_progress")
      .select("status, score")
      .eq("student_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const completed = data.filter((d) => d.status === "completed");
        const scoredItems = completed.filter((d) => d.score !== null);
        const avg =
          scoredItems.length > 0
            ? Math.round(
                scoredItems.reduce((s, d) => s + (d.score ?? 0), 0) /
                  scoredItems.length
              )
            : 0;
        setStats({
          completed: completed.length,
          inProgress: data.filter((d) => d.status === "in_progress").length,
          avgScore: avg,
          total: data.length,
        });
      });
  }, [user]);

  const badges = [
    { emoji: "🏅", name: "متعلم نشط", desc: "أكمل أول درس", earned: stats.completed >= 1 },
    { emoji: "⭐", name: "نجم المنصة", desc: "أكمل 5 دروس", earned: stats.completed >= 5 },
    { emoji: "🔥", name: "سلسلة حارقة", desc: "أكمل 10 دروس", earned: stats.completed >= 10 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="دروس مكتملة"
          value={String(stats.completed)}
          icon={<CheckCircle2 className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-success"
        />
        <StatCard
          title="قيد التقدم"
          value={String(stats.inProgress)}
          icon={<Clock className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-info"
        />
        <StatCard
          title="المعدل العام"
          value={`${stats.avgScore}%`}
          icon={<Star className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-primary"
        />
        <StatCard
          title="إجمالي النشاطات"
          value={String(stats.total)}
          icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />}
          colorClass="bg-secondary"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-secondary" />
          شاراتك
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {badges.map((b) => (
            <div
              key={b.name}
              className={`bg-muted/50 rounded-xl p-4 flex items-center gap-3 transition-opacity ${
                !b.earned ? "opacity-40" : ""
              }`}
            >
              <span className="text-3xl">{b.emoji}</span>
              <div>
                <p className="font-bold text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
                {b.earned && (
                  <span className="text-xs text-success">مكتسبة ✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Learning Path ────────────────────────────────────────────────────────────
const LearningPath = () => {
  const { user } = useAuth();
  const [curricula, setCurricula] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: currData }, { data: progress }] = await Promise.all([
        supabase
          .from("curricula")
          .select("id, title, lessons(id, title, is_published)")
          .eq("is_published", true),
        supabase
          .from("student_progress")
          .select("lesson_id, status")
          .eq("student_id", user.id),
      ]);

      if (!currData) return;

      const progressMap = new Map(
        (progress ?? []).map((p) => [p.lesson_id, p.status])
      );

      const enriched = currData.map((c) => ({
        ...c,
        lessons: (c.lessons ?? [])
          .filter((l: any) => l.is_published)
          .map((l: any) => ({
            ...l,
            status: progressMap.get(l.id) ?? "not_started",
          })),
      }));
      setCurricula(enriched);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startLesson = async (lessonId: string) => {
    if (!user) return;
    // Check if progress record already exists to avoid duplicates
    const { data: existing } = await supabase
      .from("student_progress")
      .select("id, status")
      .eq("student_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (existing) {
      // Already started
      toast.info("الدرس بدأ بالفعل");
      return;
    }

    const { error } = await supabase.from("student_progress").insert({
      student_id: user.id,
      lesson_id: lessonId,
      status: "in_progress",
    });

    if (error) {
      toast.error("حدث خطأ أثناء بدء الدرس");
      return;
    }

    toast.success("تم بدء الدرس");
    fetchData();
  };

  const completeLesson = async (lessonId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("student_progress")
      .update({
        status: "completed",
        score: Math.floor(Math.random() * 31) + 70,
        completed_at: new Date().toISOString(),
      })
      .eq("student_id", user.id)
      .eq("lesson_id", lessonId);

    if (error) {
      toast.error("حدث خطأ أثناء إكمال الدرس");
      return;
    }

    toast.success("تم إكمال الدرس! 🎉");
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">مسار التعلم المخصص لك</p>
      {curricula.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد مناهج منشورة بعد</p>
        </div>
      ) : (
        curricula.map((c) => (
          <div key={c.id} className="space-y-3">
            <h3 className="font-bold text-lg">{c.title}</h3>
            {c.lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground pr-2">لا توجد دروس في هذا المنهج بعد</p>
            ) : (
              c.lessons.map((l: any, i: number) => (
                <div
                  key={l.id}
                  className={`bg-card rounded-2xl border p-5 hover-lift ${
                    l.status === "completed"
                      ? "border-success/30"
                      : l.status === "in_progress"
                      ? "border-primary/30 ring-2 ring-primary/10"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        l.status === "completed"
                          ? "bg-success text-success-foreground"
                          : l.status === "in_progress"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {l.status === "completed" ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.status === "completed"
                          ? "✅ مكتمل"
                          : l.status === "in_progress"
                          ? "▶️ جارٍ"
                          : "⏳ لم يبدأ"}
                      </p>
                    </div>
                    {l.status === "not_started" && (
                      <button
                        onClick={() => startLesson(l.id)}
                        className="bg-gradient-hero text-primary-foreground px-4 py-2 rounded-xl text-xs font-medium flex-shrink-0"
                      >
                        ابدأ
                      </button>
                    )}
                    {l.status === "in_progress" && (
                      <button
                        onClick={() => completeLesson(l.id)}
                        className="bg-success text-success-foreground px-4 py-2 rounded-xl text-xs font-medium flex-shrink-0"
                      >
                        أكمل
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
};

// ─── Flashcards ───────────────────────────────────────────────────────────────
const FlashcardReview = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  useEffect(() => {
    supabase
      .from("quiz_questions")
      .select("question_text, correct_answer, quizzes(title)")
      .limit(12)
      .then(({ data }) => setQuestions(data ?? []));
  }, []);

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const defaultCards = [
    {
      question_text: "ما هي صيغة حل المعادلة التربيعية؟",
      correct_answer: "x = (-b ± √(b²-4ac)) / 2a",
    },
    {
      question_text: "ما هو مجموع زوايا المثلث؟",
      correct_answer: "١٨٠ درجة",
    },
    { question_text: "قانون فيثاغورس", correct_answer: "a² + b² = c²" },
  ];

  const cards = questions.length > 0 ? questions : defaultCards;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        اضغط على البطاقة لكشف الإجابة — نظام التكرار المتباعد
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card: any, i: number) => (
          <button
            key={i}
            onClick={() => toggleFlip(i)}
            className="bg-card rounded-2xl border border-border p-6 hover-lift text-right min-h-[200px] flex flex-col justify-between w-full"
          >
            <div>
              <span className="text-xs text-muted-foreground mb-2 block">
                {(card.quizzes as any)?.title ?? `بطاقة ${i + 1}`}
              </span>
              <p className="font-bold text-lg">{card.question_text}</p>
            </div>
            {flipped.has(i) && (
              <div className="mt-4 pt-4 border-t border-border">
                <p
                  className="text-sm text-primary font-medium font-mono"
                  dir="ltr"
                >
                  {card.correct_answer}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QuizPage = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalPct, setFinalPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("quizzes")
      .select("id, title, description, time_limit_minutes, curricula(title)")
      .eq("is_published", true)
      .then(({ data }) => setQuizzes(data ?? []));
  }, []);

  const startQuiz = async (quiz: any) => {
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("order_index");

    if (!data || data.length === 0) {
      toast.error("هذا الاختبار لا يحتوي على أسئلة بعد");
      return;
    }

    setQuestions(data);
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setScore(0);
    setFinished(false);
    setSelected(null);
    setFinalPct(0);
  };

  const submitAnswer = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);

    const q = questions[currentQ];
    const isCorrect = selected === q.correct_answer;
    // Calculate new score synchronously — avoids stale closure issue
    const newScore = isCorrect ? score + q.points : score;
    setScore(newScore);

    const isLastQuestion = currentQ + 1 >= questions.length;

    if (!isLastQuestion) {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setSubmitting(false);
    } else {
      // Calculate final percentage from local newScore, not stale state
      const totalPoints = questions.reduce((sum: number, q: any) => sum + q.points, 0);
      const pct = totalPoints > 0 ? Math.round((newScore / totalPoints) * 100) : 0;
      setFinalPct(pct);
      setFinished(true);

      if (user && activeQuiz) {
        const { error } = await supabase.from("student_progress").insert({
          student_id: user.id,
          quiz_id: activeQuiz.id,
          status: "completed",
          score: pct,
          completed_at: new Date().toISOString(),
        });
        if (error) console.error("Failed to save quiz result:", error.message);
      }
      setSubmitting(false);
    }
  };

  // ── Finished screen ──
  if (finished) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="bg-card rounded-2xl border border-border p-8">
          <span className="text-6xl block mb-4">
            {finalPct >= 80 ? "🏆" : finalPct >= 60 ? "⭐" : "📝"}
          </span>
          <h2 className="text-2xl font-black mb-2">النتيجة: {finalPct}%</h2>
          <p className="text-muted-foreground">
            {finalPct >= 80
              ? "أداء ممتاز! استمر على هذا المستوى"
              : finalPct >= 60
              ? "جيد! يمكنك التحسين بمزيد من المراجعة"
              : "تحتاج إلى مراجعة إضافية لهذا الموضوع"}
          </p>
          <button
            onClick={() => setActiveQuiz(null)}
            className="mt-6 bg-gradient-hero text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium w-full"
          >
            العودة للاختبارات
          </button>
        </div>
      </div>
    );
  }

  // ── Active quiz screen ──
  if (activeQuiz && questions.length > 0) {
    const q = questions[currentQ];
    const options: string[] = Array.isArray(q.options) ? (q.options as string[]) : [];
    const progress = ((currentQ) / questions.length) * 100;

    return (
      <div className="max-w-2xl space-y-6">
        <button
          onClick={() => setActiveQuiz(null)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← العودة للاختبارات
        </button>
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              السؤال {currentQ + 1} من {questions.length}
            </span>
            <span className="text-xs text-muted-foreground">{activeQuiz.title}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full mb-6">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <h3 className="text-lg font-bold mb-6">{q.question_text}</h3>
          <div className="space-y-3">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(opt)}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                  selected === opt
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={submitAnswer}
              disabled={!selected || submitting}
              className="bg-gradient-hero text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {currentQ + 1 < questions.length ? "التالي ←" : "إنهاء الاختبار"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz list ──
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">اختبارات متعددة الخيارات لتقييم فهمك</p>
      {quizzes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد اختبارات منشورة بعد</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {quizzes.map((q: any) => (
            <div key={q.id} className="bg-card rounded-2xl border border-border p-6 hover-lift">
              <h3 className="font-bold mb-1">{q.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {(q.curricula as any)?.title}
                {q.time_limit_minutes ? ` · ${q.time_limit_minutes} دقيقة` : ""}
              </p>
              {q.description && (
                <p className="text-sm text-muted-foreground mb-4">{q.description}</p>
              )}
              <button
                onClick={() => startQuiz(q)}
                className="bg-gradient-hero text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium w-full"
              >
                ابدأ الاختبار
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Exercises ────────────────────────────────────────────────────────────────
const ExercisePractice = () => {
  const [answers, setAnswers] = useState({ step1: "", step2: "" });
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  const checkAnswer = () => {
    // Simple heuristic check — production would use a proper math evaluator
    const step1Ok = answers.step1.includes("3") && answers.step1.includes("x");
    const step2Ok =
      answers.step2.includes("x") &&
      (answers.step2.includes("3") || answers.step2.includes("1"));
    setCorrect(step1Ok && step2Ok);
    setChecked(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-muted-foreground">حل التمارين خطوة بخطوة</p>
      <div className="bg-card rounded-2xl border border-border p-6">
        <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full">
          تمرين تطبيقي
        </span>
        <h3 className="text-lg font-bold mt-4 mb-2">حل المعادلة التالية:</h3>
        <div
          className="bg-muted rounded-xl p-4 text-center text-xl font-mono my-4"
          dir="ltr"
        >
          3x² - 12x + 9 = 0
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">
              الخطوة ١: استخرج العامل المشترك
            </label>
            <input
              value={answers.step1}
              onChange={(e) => {
                setAnswers((a) => ({ ...a, step1: e.target.value }));
                setChecked(false);
              }}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="مثال: 3(x² - 4x + 3) = 0"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              الخطوة ٢: حلل إلى عوامل
            </label>
            <input
              value={answers.step2}
              onChange={(e) => {
                setAnswers((a) => ({ ...a, step2: e.target.value }));
                setChecked(false);
              }}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="مثال: 3(x-1)(x-3) = 0 → x=1 أو x=3"
              dir="ltr"
            />
          </div>
        </div>
        {checked && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm ${
              correct
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {correct
              ? "✅ إجابة صحيحة! عمل ممتاز"
              : "❌ الإجابة غير كاملة. الحل: 3(x-1)(x-3)=0 → x=1 أو x=3"}
          </div>
        )}
        <button
          onClick={checkAnswer}
          disabled={!answers.step1.trim() || !answers.step2.trim()}
          className="mt-4 bg-gradient-hero text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          تحقق من الإجابة
        </button>
      </div>
    </div>
  );
};

// ─── Badges ───────────────────────────────────────────────────────────────────
const BadgesPage = () => {
  const { user } = useAuth();
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_progress")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "completed")
      .then(({ count }) => setCompletedCount(count ?? 0));
  }, [user]);

  const allBadges = [
    { emoji: "🏅", name: "متعلم نشط", desc: "أكمل أول درس", earned: completedCount >= 1 },
    { emoji: "⭐", name: "نجم المنصة", desc: "أكمل 5 دروس", earned: completedCount >= 5 },
    { emoji: "🔥", name: "سلسلة حارقة", desc: "أكمل 10 دروس", earned: completedCount >= 10 },
    { emoji: "🎯", name: "القناص", desc: "أكمل 20 درساً", earned: completedCount >= 20 },
    { emoji: "🏆", name: "بطل الرياضيات", desc: "أكمل 50 درساً", earned: completedCount >= 50 },
    { emoji: "💎", name: "الماسي", desc: "أكمل 100 درس", earned: completedCount >= 100 },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        شاراتك وإنجازاتك — أكملت {completedCount} درساً
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBadges.map((b) => (
          <div
            key={b.name}
            className={`bg-card rounded-2xl border p-6 text-center transition-opacity ${
              b.earned ? "border-secondary/50" : "border-border opacity-50"
            }`}
          >
            <span className="text-5xl block mb-3">{b.emoji}</span>
            <p className="font-bold">{b.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
            {b.earned && (
              <span className="inline-block mt-2 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                مكتسبة ✓
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const StudentDashboard = () => (
  <DashboardLayout
    title="لوحة الطالب"
    navItems={navItems}
    accentColor="bg-primary"
    roleName="طالب"
  >
    <Routes>
      <Route index element={<DashboardHome />} />
      <Route path="path" element={<LearningPath />} />
      <Route path="flashcards" element={<FlashcardReview />} />
      <Route path="quiz" element={<QuizPage />} />
      <Route path="exercises" element={<ExercisePractice />} />
      <Route path="badges" element={<BadgesPage />} />
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  </DashboardLayout>
);

export default StudentDashboard;
