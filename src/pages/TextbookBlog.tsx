// ===== Public textbook reader — interactive blog-style with collapsible chapters =====
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, Target, PenTool, Award, Star, Brain,
  Lock, ArrowRight, Sparkles, CheckCircle, ListOrdered, Menu, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LatexRenderer } from "@/components/LatexRenderer";
import { RichContent } from "@/components/textbook/RichContent";
import { toast } from "sonner";

interface Textbook {
  id: string; slug: string | null; title: string; grade: string;
  country_code: string | null; description: string | null; metadata: any;
}
interface Chapter { id: string; order_index: number; title: string; title_ar: string | null; domain: string | null; }
interface Lesson { id: string; chapter_id: string; order_index: number; title: string; title_ar: string | null; objectives: string[] | null; content_html: string | null; }
interface Activity {
  id: string; lesson_id: string; order_index: number; activity_type: string;
  title_ar: string | null; content_text: string; solution_text: string | null;
  hints: string[] | null; expected_answer: string | null; difficulty: number | null;
}
interface Exercise {
  id: string; chapter_id: string | null; order_index: number; exercise_number: string | null;
  statement: string; solution: string | null; questions: any; hints: string[] | null;
  expected_answer: string | null; answer_type: string | null; difficulty: number | null;
}

const TYPE_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  explanation: { icon: BookOpen, label: "مقدمة", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  definition:  { icon: Target, label: "تعريف", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/30" },
  property:    { icon: Star, label: "خاصية", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/30" },
  theorem:     { icon: Award, label: "مبرهنة", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/30" },
  example:     { icon: Lightbulb, label: "مثال محلول", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  exercise:    { icon: PenTool, label: "تمرين", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/30" },
  activity:    { icon: Brain, label: "نشاط", color: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
};

function SmartContent({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span className="leading-loose">
      {parts.map((p, i) => {
        if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
          return <LatexRenderer key={i} latex={p.slice(1, -1)} />;
        }
        return p.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
        ));
      })}
    </span>
  );
}

export default function TextbookBlog() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessonsByChapter, setLessonsByChapter] = useState<Record<string, Lesson[]>>({});
  const [activitiesByLesson, setActivitiesByLesson] = useState<Record<string, Activity[]>>({});
  const [exercisesByChapter, setExercisesByChapter] = useState<Record<string, Exercise[]>>({});
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [readProgress, setReadProgress] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!slugOrId) return;
    (async () => {
      // Try slug first, then fallback to id
      const { data: bySlug } = await (supabase as any)
        .from("textbooks")
        .select("id, slug, title, grade, country_code, description, metadata")
        .eq("status", "completed")
        .eq("is_public", true)
        .eq("slug", slugOrId)
        .maybeSingle();

      let tb: any = bySlug;
      if (!tb) {
        const { data: byId } = await (supabase as any)
          .from("textbooks")
          .select("id, slug, title, grade, country_code, description, metadata")
          .eq("status", "completed")
          .eq("is_public", true)
          .eq("id", slugOrId)
          .maybeSingle();
        tb = byId;
      }

      if (!tb) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTextbook(tb);

      const { data: chData } = await supabase
        .from("textbook_chapters")
        .select("id, order_index, title, title_ar, domain")
        .eq("textbook_id", tb.id)
        .order("order_index");
      const chs = (chData as any) || [];
      setChapters(chs);
      if (chs.length > 0) setOpenChapter(chs[0].id);

      // Load all lessons + activities + exercises for entire textbook in one go
      const chapterIds = chs.map((c: Chapter) => c.id);
      if (chapterIds.length > 0) {
        const [lessonsRes, exercisesRes] = await Promise.all([
          supabase
            .from("textbook_lessons")
            .select("id, chapter_id, order_index, title, title_ar, objectives, content_html")
            .in("chapter_id", chapterIds)
            .order("order_index"),
          supabase
            .from("textbook_exercises" as any)
            .select("id, chapter_id, order_index, exercise_number, statement, solution, questions, hints, expected_answer, answer_type, difficulty")
            .in("chapter_id", chapterIds)
            .order("order_index"),
        ]);

        const lessons = ((lessonsRes.data as any) || []) as Lesson[];
        const lByCh: Record<string, Lesson[]> = {};
        lessons.forEach(l => { (lByCh[l.chapter_id] = lByCh[l.chapter_id] || []).push(l); });
        setLessonsByChapter(lByCh);

        const exs = ((exercisesRes.data as any) || []) as Exercise[];
        const eByCh: Record<string, Exercise[]> = {};
        exs.forEach(e => { if (e.chapter_id) (eByCh[e.chapter_id] = eByCh[e.chapter_id] || []).push(e); });
        setExercisesByChapter(eByCh);

        const lessonIds = lessons.map(l => l.id);
        if (lessonIds.length > 0) {
          const { data: actData } = await supabase
            .from("textbook_activities")
            .select("id, lesson_id, order_index, activity_type, title_ar, content_text, solution_text, hints, expected_answer, difficulty")
            .in("lesson_id", lessonIds)
            .order("order_index");
          const aByL: Record<string, Activity[]> = {};
          ((actData as any) || []).forEach((a: Activity) => { (aByL[a.lesson_id] = aByL[a.lesson_id] || []).push(a); });
          setActivitiesByLesson(aByL);
        }
      }

      setLoading(false);
    })();
  }, [slugOrId]);

  // Scroll-spy: track active chapter + reading progress
  useEffect(() => {
    if (chapters.length === 0) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const max = doc.scrollHeight - window.innerHeight;
      setReadProgress(max > 0 ? Math.min(100, Math.max(0, (scrollTop / max) * 100)) : 0);

      // active section = first one whose top is below the offset (e.g. nav 120px)
      const offset = 140;
      let current: string | null = chapters[0]?.id || null;
      for (const ch of chapters) {
        const el = document.getElementById(`chapter-${ch.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) current = ch.id;
        else break;
      }
      setActiveChapterId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapters]);

  const goToChapter = (id: string) => {
    setOpenChapter(id);
    setTocOpen(false);
    // wait a tick so the chapter expands before scrolling
    requestAnimationFrame(() => {
      const el = document.getElementById(`chapter-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const currentIndex = activeChapterId ? chapters.findIndex(c => c.id === activeChapterId) : -1;
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <BookOpen className="w-10 h-10 animate-pulse text-primary" />
      </div>
    );
  }

  if (notFound || !textbook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
        <BookOpen className="w-12 h-12 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">الكتاب غير موجود أو لم يُنشر بعد</p>
        <Link to="/textbooks" className="text-sm text-primary font-bold underline">← العودة لقائمة الكتب</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Sticky progress bar + mobile TOC trigger */}
      <div className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <Link to="/textbooks" className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary">
            <ChevronLeft className="w-3 h-3" /> كل الكتب
          </Link>
          <div className="flex-1 mx-2 hidden sm:flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold text-muted-foreground truncate">{textbook.title}</span>
            {currentIndex >= 0 && (
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                · فصل {currentIndex + 1}/{chapters.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-primary tabular-nums">{Math.round(readProgress)}%</span>
            <button
              onClick={() => setTocOpen(true)}
              className="lg:hidden inline-flex items-center gap-1 text-[11px] font-bold text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/10"
            >
              <Menu className="w-3 h-3" /> الفهرس
            </button>
          </div>
        </div>
        <div className="h-1 bg-muted/50">
          <div
            className="h-full bg-gradient-to-l from-primary via-accent to-primary transition-[width] duration-150"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      </div>

      {/* Hero */}
      <header className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-foreground mb-2 leading-tight">{textbook.title}</h1>
              {textbook.description && <p className="text-sm text-muted-foreground mb-3">{textbook.description}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{textbook.grade}</Badge>
                <Badge variant="outline">📖 {chapters.length} فصل</Badge>
                {textbook.metadata?.exercises_count > 0 && (
                  <Badge variant="outline">📝 {textbook.metadata.exercises_count} تمرين</Badge>
                )}
                {textbook.metadata?.activities_count > 0 && (
                  <Badge variant="outline"><Sparkles className="w-3 h-3 ml-1" /> {textbook.metadata.activities_count} نشاط</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar TOC (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <TocPanel
              chapters={chapters}
              activeId={activeChapterId}
              onPick={goToChapter}
            />
          </div>
        </aside>

        {/* Mobile TOC drawer */}
        {tocOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setTocOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              dir="rtl"
              className="absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-card border-l border-border p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-primary" /> فهرس الكتاب
                </h3>
                <button onClick={() => setTocOpen(false)} className="p-1 rounded hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <TocPanel
                chapters={chapters}
                activeId={activeChapterId}
                onPick={goToChapter}
                bare
              />
            </div>
          </div>
        )}

        <article className="min-w-0 space-y-6">
          {/* Chapters */}
          {chapters.map((ch, i) => {
            const isOpen = openChapter === ch.id;
            const lessons = lessonsByChapter[ch.id] || [];
            const exercises = exercisesByChapter[ch.id] || [];
            const isLast = i === chapters.length - 1;
            const isFirst = i === 0;
            return (
              <section
                key={ch.id}
                id={`chapter-${ch.id}`}
                className="scroll-mt-24 animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 60, 240)}ms` }}
              >
                <button
                  onClick={() => setOpenChapter(isOpen ? null : ch.id)}
                  className="w-full flex items-center justify-between gap-3 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-3 text-right">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">{i + 1}</div>
                    <div>
                      <h2 className="text-lg font-black text-foreground">{ch.title_ar || ch.title}</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {lessons.length} درس · {exercises.length} تمرين
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-6 pr-4 border-r-2 border-primary/10">
                    {/* Lessons */}
                    {lessons.map(lesson => {
                      const acts = activitiesByLesson[lesson.id] || [];
                      return (
                        <div key={lesson.id} className="space-y-3">
                          <h3 className="text-base font-black text-foreground border-b border-border pb-2">
                            📘 {lesson.title_ar || lesson.title}
                          </h3>
                          {lesson.objectives && lesson.objectives.length > 0 && (
                            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                              <p className="text-[11px] font-black text-primary mb-1.5 flex items-center gap-1">
                                <Target className="w-3 h-3" /> الأهداف التعلمية
                              </p>
                              <ul className="text-xs text-foreground space-y-1">
                                {lesson.objectives.map((o, k) => (
                                  <li key={k} className="flex gap-1.5"><span className="text-primary">◆</span>{o}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {acts.map(act => (
                            <ActivityCard key={act.id} act={act} user={user} navigate={navigate} />
                          ))}
                        </div>
                      );
                    })}

                    {/* Chapter exercises */}
                    {exercises.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-base font-black text-rose-700 dark:text-rose-300 border-b-2 border-rose-200 dark:border-rose-900 pb-2">
                          <PenTool className="w-4 h-4" /> تمارين الفصل ({exercises.length})
                        </h3>
                        {exercises.map(ex => (
                          <ExerciseCard key={ex.id} ex={ex} user={user} navigate={navigate} />
                        ))}
                      </div>
                    )}

                    {lessons.length === 0 && exercises.length === 0 && (
                      <p className="text-xs text-muted-foreground py-6 text-center">لا توجد دروس أو تمارين في هذا الفصل بعد</p>
                    )}

                    {/* Prev / Next chapter nav */}
                    <div className="flex items-stretch gap-3 pt-4 mt-4 border-t border-border">
                      {!isFirst ? (
                        <button
                          onClick={() => goToChapter(chapters[i - 1].id)}
                          className="flex-1 group flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-right"
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-muted-foreground">الفصل السابق</div>
                            <div className="text-xs font-black text-foreground truncate">
                              {i}. {chapters[i - 1].title_ar || chapters[i - 1].title}
                            </div>
                          </div>
                        </button>
                      ) : <div className="flex-1" />}
                      {!isLast ? (
                        <button
                          onClick={() => goToChapter(chapters[i + 1].id)}
                          className="flex-1 group flex items-center justify-end gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-left"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-primary">الفصل التالي</div>
                            <div className="text-xs font-black text-foreground truncate">
                              {i + 2}. {chapters[i + 1].title_ar || chapters[i + 1].title}
                            </div>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-primary flex-shrink-0" />
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> أكملتَ الكتاب!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </article>
      </div>
    </div>
  );
}

// ─── Sidebar TOC panel ───
function TocPanel({
  chapters, activeId, onPick, bare = false,
}: {
  chapters: Chapter[];
  activeId: string | null;
  onPick: (id: string) => void;
  bare?: boolean;
}) {
  const inner = (
    <div className="space-y-1">
      {!bare && (
        <h2 className="flex items-center gap-2 text-xs font-black text-foreground mb-2 px-1">
          <ListOrdered className="w-3.5 h-3.5 text-primary" /> فهرس الكتاب
        </h2>
      )}
      <div className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-1">
        {chapters.map((ch, i) => {
          const active = ch.id === activeId;
          return (
            <button
              key={ch.id}
              onClick={() => onPick(ch.id)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition-all text-right ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              <span className={`flex items-center gap-2 text-[11px] font-bold min-w-0 ${active ? "" : ""}`}>
                <span className={`text-[10px] flex-shrink-0 ${active ? "opacity-90" : "text-primary"}`}>{i + 1}.</span>
                <span className="truncate">{ch.title_ar || ch.title}</span>
              </span>
              {active && <ArrowRight className="w-3 h-3 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
  if (bare) return inner;
  return (
    <Card className="border-2 border-primary/15 bg-card">
      <CardContent className="p-3">{inner}</CardContent>
    </Card>
  );
}

// ─── Activity card (lesson-level) ───
function ActivityCard({ act, user, navigate }: { act: Activity; user: any; navigate: any }) {
  const meta = TYPE_META[act.activity_type] || TYPE_META.explanation;
  const Icon = meta.icon;
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const isExercise = act.activity_type === "exercise" || act.activity_type === "activity";

  function tryCheck() {
    if (!user) {
      toast.info("سجّل الدخول لحفظ تقدّمك وحلّ التمارين");
      navigate("/auth");
      return;
    }
    const u = (answer || "").trim().toLowerCase().replace(/\s/g, "");
    const e = (act.expected_answer || "").trim().toLowerCase().replace(/\s/g, "");
    const ok = u === e;
    setResult(ok);
    if (ok) toast.success("✅ إجابة صحيحة!");
    else toast.error("❌ حاول مرة أخرى");
  }

  return (
    <Card className={`overflow-hidden border ${meta.bg} animate-slide-in-up hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.color}`} />
          <span className={`text-[11px] font-black ${meta.color}`}>{meta.label}</span>
          {act.title_ar && <span className="text-sm font-bold text-foreground mr-1">{act.title_ar}</span>}
        </div>
        <div className="bg-card/70 rounded-lg p-3 border border-border/50">
          <RichContent text={act.content_text} />
        </div>

        {isExercise && (
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="إجابتك..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="text-sm"
              />
              <Button size="sm" onClick={tryCheck} className="flex-shrink-0">
                {!user && <Lock className="w-3 h-3 ml-1" />}
                تحقّق
              </Button>
            </div>
            {result !== null && (
              <p className={`text-xs font-bold flex items-center gap-1 ${result ? "text-emerald-600" : "text-rose-600"}`}>
                {result ? <CheckCircle className="w-3 h-3" /> : "❌"}
                {result ? "إجابة صحيحة" : "غير صحيحة، حاول مرة أخرى"}
              </p>
            )}
            {act.hints && act.hints.length > 0 && (
              <div>
                <button onClick={() => setShowHint(!showHint)} className="text-[11px] font-bold text-amber-600 hover:underline">
                  💡 {showHint ? "إخفاء" : "عرض"} التلميح
                </button>
                {showHint && (
                  <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded text-xs text-foreground">
                    {act.hints[0]}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {act.solution_text && (
          <div>
            <button onClick={() => setShowSolution(!showSolution)} className="text-[11px] font-bold text-primary hover:underline">
              {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
            </button>
            {showSolution && (
              <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded animate-fade-in">
                <RichContent text={act.solution_text} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Exercise card (chapter-level) ───
function ExerciseCard({ ex, user, navigate }: { ex: Exercise; user: any; navigate: any }) {
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  function tryCheck() {
    if (!user) {
      toast.info("سجّل الدخول لحفظ تقدّمك وحلّ التمارين");
      navigate("/auth");
      return;
    }
    const u = (answer || "").trim().toLowerCase().replace(/\s/g, "");
    const e = (ex.expected_answer || "").trim().toLowerCase().replace(/\s/g, "");
    const ok = u === e;
    setResult(ok);
    if (ok) toast.success("✅ إجابة صحيحة!");
    else toast.error("❌ راجع الحل المفصّل");
  }

  const questions = Array.isArray(ex.questions) ? ex.questions : [];

  return (
    <Card className="overflow-hidden border-2 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 animate-slide-in-up hover:shadow-lg transition-shadow">
      <div className="h-1 bg-gradient-to-l from-rose-400 via-rose-500 to-rose-400" />
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-black text-rose-700 dark:text-rose-300">تمرين {ex.exercise_number || ex.order_index}</span>
          </div>
          {ex.difficulty && (
            <Badge variant="outline" className="text-[10px]">
              {"⭐".repeat(Math.min(ex.difficulty, 3))}
            </Badge>
          )}
        </div>
        <div className="bg-card/70 rounded-lg p-4 border border-border/50">
          <RichContent text={ex.statement} />
        </div>
        {questions.length > 0 && (
          <ol className="text-sm text-foreground space-y-2 mr-2 list-decimal pr-4 marker:text-rose-500 marker:font-black">
            {questions.map((q: string, i: number) => (
              <li key={i} className="pl-2 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <RichContent text={q} />
              </li>
            ))}
          </ol>
        )}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="إجابتك..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="text-sm"
          />
          <Button size="sm" onClick={tryCheck} className="flex-shrink-0">
            {!user && <Lock className="w-3 h-3 ml-1" />}
            تحقّق
          </Button>
        </div>
        {result !== null && (
          <p className={`text-xs font-bold flex items-center gap-1 ${result ? "text-emerald-600" : "text-rose-600"}`}>
            {result ? <CheckCircle className="w-3 h-3" /> : "❌"}
            {result ? "إجابة صحيحة" : "غير صحيحة"}
          </p>
        )}

        {ex.hints && ex.hints.length > 0 && (
          <div>
            <button onClick={() => setShowHint(!showHint)} className="text-[11px] font-bold text-amber-600 hover:underline">
              💡 {showHint ? "إخفاء" : "عرض"} التلميح
            </button>
            {showHint && (
              <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded text-xs text-foreground">
                {ex.hints[0]}
              </div>
            )}
          </div>
        )}

        {ex.solution && (
          <div>
            <button onClick={() => setShowSolution(!showSolution)} className="text-xs font-bold text-primary hover:underline">
              {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
            </button>
            {showSolution && (
              <div className="mt-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900 rounded animate-fade-in">
                <RichContent text={ex.solution} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
