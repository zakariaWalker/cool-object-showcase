// ===== Public textbook reader — magazine-style long-form article =====
// Reads one lesson at a time as an editorial article: kicker, big headline, lede,
// byline, hero cover, numbered sections (intro / concepts / examples / exercises),
// and prev/next lesson navigation. The full book index lives in a slide-over drawer.
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Lightbulb, Target, PenTool, Award, Star, Brain,
  Lock, Sparkles, CheckCircle, Menu, X, Clock, ArrowRight, ArrowLeft,
} from "lucide-react";
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

const TYPE_META: Record<string, { icon: any; label: string; tone: string }> = {
  explanation: { icon: BookOpen,  label: "مقدّمة",      tone: "text-indigo-700 dark:text-indigo-300" },
  definition:  { icon: Target,    label: "تعريف",       tone: "text-blue-700 dark:text-blue-300" },
  property:    { icon: Star,      label: "خاصية",       tone: "text-amber-700 dark:text-amber-300" },
  theorem:     { icon: Award,     label: "مبرهنة",      tone: "text-purple-700 dark:text-purple-300" },
  example:     { icon: Lightbulb, label: "مثال محلول",  tone: "text-emerald-700 dark:text-emerald-300" },
  exercise:    { icon: PenTool,   label: "تمرين",       tone: "text-rose-700 dark:text-rose-300" },
  activity:    { icon: Brain,     label: "نشاط",        tone: "text-cyan-700 dark:text-cyan-300" },
};

const DOMAIN_TONE: Record<string, { dot: string; cover: string }> = {
  algebra:     { dot: "bg-blue-500",    cover: "from-sky-200 via-indigo-200 to-violet-300" },
  geometry:    { dot: "bg-emerald-500", cover: "from-emerald-200 via-teal-200 to-cyan-300" },
  statistics:  { dot: "bg-orange-500",  cover: "from-orange-200 via-amber-200 to-yellow-300" },
  probability: { dot: "bg-purple-500",  cover: "from-violet-200 via-purple-200 to-fuchsia-300" },
  functions:   { dot: "bg-cyan-500",    cover: "from-cyan-200 via-sky-200 to-blue-300" },
  numbers:     { dot: "bg-pink-500",    cover: "from-pink-200 via-rose-200 to-red-300" },
};
const toneOf = (d?: string | null) =>
  (d && DOMAIN_TONE[d]) || { dot: "bg-muted-foreground", cover: "from-amber-200 via-rose-200 to-fuchsia-300" };

export default function TextbookBlog() {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessonsByChapter, setLessonsByChapter] = useState<Record<string, Lesson[]>>({});
  const [activitiesByLesson, setActivitiesByLesson] = useState<Record<string, Activity[]>>({});
  const [exercisesByChapter, setExercisesByChapter] = useState<Record<string, Exercise[]>>({});
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      const chs = ((chData as any) || []) as Chapter[];
      setChapters(chs);

      const chapterIds = chs.map((c) => c.id);
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
        lessons.forEach((l) => { (lByCh[l.chapter_id] = lByCh[l.chapter_id] || []).push(l); });
        setLessonsByChapter(lByCh);

        // Auto-select the first lesson of the first chapter
        if (lessons.length > 0 && !activeLessonId) {
          const first = lessons.sort((a, b) =>
            chs.findIndex(c => c.id === a.chapter_id) - chs.findIndex(c => c.id === b.chapter_id) ||
            (a.order_index ?? 0) - (b.order_index ?? 0)
          )[0];
          setActiveLessonId(first.id);
        }

        const exs = ((exercisesRes.data as any) || []) as Exercise[];
        const eByCh: Record<string, Exercise[]> = {};
        exs.forEach((e) => { if (e.chapter_id) (eByCh[e.chapter_id] = eByCh[e.chapter_id] || []).push(e); });
        setExercisesByChapter(eByCh);

        const lessonIds = lessons.map((l) => l.id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOrId]);

  // Flat ordered list of all lessons across all chapters → enables prev/next navigation.
  const flatLessons = useMemo(() => {
    const out: { lesson: Lesson; chapter: Chapter; indexInBook: number }[] = [];
    chapters.forEach((ch) => {
      (lessonsByChapter[ch.id] || []).forEach((l) => out.push({ lesson: l, chapter: ch, indexInBook: out.length }));
    });
    return out;
  }, [chapters, lessonsByChapter]);

  const currentEntry = useMemo(
    () => flatLessons.find((e) => e.lesson.id === activeLessonId) || flatLessons[0],
    [flatLessons, activeLessonId]
  );

  const goToLesson = (id: string) => {
    setActiveLessonId(id);
    setTocOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  if (!currentEntry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
        <BookOpen className="w-12 h-12 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">لا توجد دروس في هذا الكتاب بعد</p>
        <Link to="/textbooks" className="text-sm text-primary font-bold underline">← العودة لقائمة الكتب</Link>
      </div>
    );
  }

  const { lesson, chapter, indexInBook } = currentEntry;
  const tone = toneOf(chapter.domain);
  const acts = activitiesByLesson[lesson.id] || [];
  const chapterExercises = exercisesByChapter[chapter.id] || [];

  const grouped = {
    intro:    acts.filter((a) => a.activity_type === "explanation"),
    concepts: acts.filter((a) => ["definition", "property", "theorem"].includes(a.activity_type)),
    examples: acts.filter((a) => a.activity_type === "example"),
    exercises:acts.filter((a) => ["exercise", "activity"].includes(a.activity_type)),
  };

  const minutes = Math.max(3, Math.round(acts.length * 1.2 + chapterExercises.length * 0.4 + 4));
  const prev = indexInBook > 0 ? flatLessons[indexInBook - 1] : null;
  const next = indexInBook < flatLessons.length - 1 ? flatLessons[indexInBook + 1] : null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <Link to="/textbooks" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="w-3.5 h-3.5" /> المجلّة
          </Link>
          <div className="text-[11px] font-bold text-foreground truncate max-w-[40%] text-center">
            {textbook.title}
          </div>
          <button
            onClick={() => setTocOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-4 h-4" /> الفهرس
          </button>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 md:px-6 pb-24">
        {/* Masthead */}
        <header className="pt-10 md:pt-16 pb-8 space-y-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
            {chapter.title_ar || chapter.title || "مقال"}
            <span>•</span>
            <span>الدرس {indexInBook + 1} / {flatLessons.length}</span>
          </div>

          <h1 className="font-black text-foreground text-3xl md:text-5xl leading-[1.15] tracking-tight">
            {lesson.title_ar || lesson.title}
          </h1>

          {lesson.title && lesson.title_ar && lesson.title !== lesson.title_ar && (
            <p className="text-sm text-muted-foreground italic" dir="ltr">{lesson.title}</p>
          )}

          {lesson.content_html && (
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
              {lesson.content_html}
            </p>
          )}

          {/* Byline */}
          <div className="flex items-center gap-4 pt-3 border-t border-border text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${tone.cover} flex items-center justify-center`}>
                <BookOpen className="w-4 h-4 text-foreground/40" />
              </div>
              <div className="leading-tight">
                <div className="font-black text-foreground text-xs">{textbook.title}</div>
                <div>{textbook.grade}</div>
              </div>
            </div>
            <span className="ml-auto flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> ~{minutes} د قراءة
            </span>
          </div>
        </header>

        {/* Hero cover */}
        <div className={`aspect-[16/7] rounded-2xl bg-gradient-to-br ${tone.cover} relative overflow-hidden mb-10 shadow-sm`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-16 h-16 md:w-20 md:h-20 text-foreground/20" />
          </div>
          <div className="absolute bottom-3 right-4 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur text-[10px] font-black tracking-widest uppercase text-foreground">
            {chapter.title_ar || "الدرس"}
          </div>
        </div>

        {/* Pull-quote: objectives */}
        {lesson.objectives && lesson.objectives.length > 0 && (
          <aside className="mb-10 border-r-4 border-primary pr-5 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" /> ما ستتعلمه
            </p>
            <ul className="space-y-1.5 text-base text-foreground font-medium leading-relaxed">
              {lesson.objectives.map((obj, i) => (<li key={i}>— {obj}</li>))}
            </ul>
          </aside>
        )}

        {/* Body sections */}
        <div className="space-y-12">
          {grouped.intro.length > 0 && (
            <ArticleSection number="01" title="مقدّمة" kicker="افتتاحية">
              {grouped.intro.map((a) => <Prose key={a.id} act={a} />)}
            </ArticleSection>
          )}

          {grouped.concepts.length > 0 && (
            <ArticleSection number="02" title="المفاهيم الأساسية" kicker="جوهر الدرس">
              {grouped.concepts.map((a) => <ConceptBlock key={a.id} act={a} />)}
            </ArticleSection>
          )}

          {grouped.examples.length > 0 && (
            <ArticleSection number="03" title="أمثلة محلولة" kicker="بالتطبيق">
              {grouped.examples.map((a) => <ExampleBlock key={a.id} act={a} />)}
            </ArticleSection>
          )}

          {grouped.exercises.length > 0 && (
            <ArticleSection number="04" title="تمارين تطبيقية" kicker="جرّب بنفسك">
              {grouped.exercises.map((a) => (
                <ExerciseFromActivity key={a.id} act={a} user={user} navigate={navigate} />
              ))}
            </ArticleSection>
          )}

          {/* Chapter-level exercises (only on the last lesson of each chapter) */}
          {chapterExercises.length > 0 && isLastLessonOfChapter(currentEntry, flatLessons) && (
            <ArticleSection number="05" title={`تمارين الفصل (${chapterExercises.length})`} kicker="تطبيق شامل">
              {chapterExercises.map((ex) => (
                <ChapterExerciseBlock key={ex.id} ex={ex} user={user} navigate={navigate} />
              ))}
            </ArticleSection>
          )}

          {acts.length === 0 && chapterExercises.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد أنشطة في هذا الدرس</p>
            </div>
          )}
        </div>

        {/* End-of-article navigation */}
        <footer className="mt-16 pt-8 border-t border-border space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className="w-8 h-px bg-border" />
              نهاية المقال
              <span className="w-8 h-px bg-border" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {prev ? (
              <button
                onClick={() => goToLesson(prev.lesson.id)}
                className="text-right p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-card transition-all group"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1 justify-end">
                  السابق <ArrowRight className="w-3 h-3" />
                </div>
                <div className="text-sm font-black text-foreground group-hover:text-primary line-clamp-2">
                  {prev.lesson.title_ar || prev.lesson.title}
                </div>
              </button>
            ) : <div />}
            {next ? (
              <button
                onClick={() => goToLesson(next.lesson.id)}
                className="text-right p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-card transition-all group sm:text-left"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1 sm:justify-start justify-end">
                  <ArrowLeft className="w-3 h-3" /> التالي
                </div>
                <div className="text-sm font-black text-foreground group-hover:text-primary line-clamp-2">
                  {next.lesson.title_ar || next.lesson.title}
                </div>
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-center text-xs font-black text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="w-4 h-4 ml-1.5" /> أكملتَ الكتاب!
              </div>
            )}
          </div>
        </footer>
      </article>

      {/* Drawer — full table of contents */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setTocOpen(false)}>
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-in" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="relative ml-auto w-80 max-w-[85vw] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
            dir="rtl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">الفهرس</p>
                <p className="text-sm font-black text-foreground truncate">{textbook.title}</p>
              </div>
              <button onClick={() => setTocOpen(false)} className="p-1 rounded hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {chapters.map((ch, ci) => {
                const t = toneOf(ch.domain);
                const lessons = lessonsByChapter[ch.id] || [];
                return (
                  <div key={ch.id} className="space-y-0.5">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-black text-foreground">
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      <span className="text-muted-foreground font-mono opacity-70">{String(ci + 1).padStart(2, "0")}</span>
                      <span className="flex-1 truncate">{ch.title_ar || ch.title}</span>
                    </div>
                    <div className="pr-4 space-y-0.5 border-r border-border/60 mr-3">
                      {lessons.map((l, li) => (
                        <button
                          key={l.id}
                          onClick={() => goToLesson(l.id)}
                          className={`w-full text-right px-2.5 py-1.5 rounded-lg text-[11px] transition-colors flex items-center gap-2 ${
                            l.id === activeLessonId
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                          }`}
                        >
                          <span className={`text-[9px] font-mono ${l.id === activeLessonId ? "opacity-80" : "opacity-50"}`}>
                            {String(li + 1).padStart(2, "0")}
                          </span>
                          <span className="flex-1 truncate">{l.title_ar || l.title}</span>
                        </button>
                      ))}
                      {lessons.length === 0 && (
                        <p className="text-[10px] text-muted-foreground px-2 py-1 italic">لا توجد دروس</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// Helper: is this entry the final lesson of its chapter? Used so chapter-wide
// exercises only appear once, at the end of the chapter — not on every lesson.
function isLastLessonOfChapter(
  entry: { lesson: Lesson; chapter: Chapter; indexInBook: number },
  flat: { lesson: Lesson; chapter: Chapter; indexInBook: number }[]
) {
  const next = flat[entry.indexInBook + 1];
  return !next || next.chapter.id !== entry.chapter.id;
}

// ─── Article scaffolding ────────────────────────────────────────────────
function ArticleSection({
  number, title, kicker, children,
}: { number: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-3 border-b border-border pb-3">
        <span className="font-black text-3xl md:text-4xl text-foreground/20 font-mono">{number}</span>
        <div>
          {kicker && <div className="text-[10px] font-black uppercase tracking-widest text-primary">{kicker}</div>}
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

// ─── Prose-style explanation block (no card chrome) ─────────────────────
function Prose({ act }: { act: Activity }) {
  return (
    <div className="space-y-3">
      {act.title_ar && <h3 className="text-base md:text-lg font-black text-foreground">{act.title_ar}</h3>}
      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <RichContent text={act.content_text} />
      </div>
    </div>
  );
}

// ─── Concept call-out (definition / property / theorem) ─────────────────
function ConceptBlock({ act }: { act: Activity }) {
  const meta = TYPE_META[act.activity_type] || TYPE_META.definition;
  const Icon = meta.icon;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
      <div className={`flex items-center gap-2 mb-3 ${meta.tone}`}>
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">{meta.label}</span>
        {act.title_ar && <span className="text-sm font-black text-foreground mr-2">— {act.title_ar}</span>}
      </div>
      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <RichContent text={act.content_text} />
      </div>
    </div>
  );
}

// ─── Worked example (collapsible solution) ──────────────────────────────
function ExampleBlock({ act }: { act: Activity }) {
  const [showSolution, setShowSolution] = useState(false);
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3 text-emerald-700 dark:text-emerald-300">
        <Lightbulb className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">مثال محلول</span>
        {act.title_ar && <span className="text-sm font-black text-foreground mr-2">— {act.title_ar}</span>}
      </div>
      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <RichContent text={act.content_text} />
      </div>
      {act.solution_text && (
        <div className="mt-4">
          <button onClick={() => setShowSolution((v) => !v)} className="text-xs font-black text-emerald-700 dark:text-emerald-300 hover:underline">
            {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
          </button>
          {showSolution && (
            <div className="mt-3 p-4 bg-background border border-emerald-200 dark:border-emerald-900 rounded-xl text-[15px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-2">الحل خطوة بخطوة</p>
              <RichContent text={act.solution_text} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Interactive activity-level exercise ────────────────────────────────
function ExerciseFromActivity({ act, user, navigate }: { act: Activity; user: any; navigate: any }) {
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
    const e = (act.expected_answer || "").trim().toLowerCase().replace(/\s/g, "");
    const ok = u === e;
    setResult(ok);
    if (ok) toast.success("✅ إجابة صحيحة!");
    else toast.error("❌ حاول مرة أخرى");
  }

  return (
    <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
        <PenTool className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">تمرين</span>
        {act.title_ar && <span className="text-sm font-black text-foreground mr-2">— {act.title_ar}</span>}
        {act.difficulty ? (
          <div className="ml-auto flex items-center gap-1">
            {Array.from({ length: act.difficulty }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            ))}
          </div>
        ) : null}
      </div>

      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <RichContent text={act.content_text} />
      </div>

      <div className="bg-background rounded-xl p-4 space-y-3 border border-rose-200 dark:border-rose-900">
        <div className="flex gap-2">
          <Input
            placeholder="إجابتك..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="flex-1 font-mono"
            dir="ltr"
          />
          <Button size="sm" onClick={tryCheck} className="bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0">
            {!user && <Lock className="w-3 h-3 ml-1" />}
            تحقق
          </Button>
        </div>
        {result !== null && (
          <p className={`text-xs font-bold flex items-center gap-1 ${result ? "text-emerald-600" : "text-rose-600"}`}>
            {result ? <CheckCircle className="w-3 h-3" /> : "❌"}
            {result ? "إجابة صحيحة" : "غير صحيحة، حاول مرة أخرى"}
          </p>
        )}
      </div>

      {act.hints && act.hints.length > 0 && (
        <div>
          <button onClick={() => setShowHint((v) => !v)} className="text-xs font-black text-amber-700 hover:underline">
            💡 {showHint ? "إخفاء التلميحات" : `عرض ${act.hints.length} تلميح`}
          </button>
          {showHint && (
            <div className="mt-2 space-y-1.5">
              {act.hints.map((h, i) => (
                <p key={i} className="text-[13px] text-amber-900 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                  💡 {h}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {act.solution_text && (
        <div>
          <button onClick={() => setShowSolution((v) => !v)} className="text-xs font-black text-rose-700 dark:text-rose-300 hover:underline">
            {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
          </button>
          {showSolution && (
            <div className="mt-2 p-4 bg-background border border-rose-200 dark:border-rose-900 rounded-xl text-[15px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 mb-2">الحل خطوة بخطوة</p>
              <RichContent text={act.solution_text} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chapter-level exercise (richer: numbered sub-questions, hints, solution) ─
function ChapterExerciseBlock({ ex, user, navigate }: { ex: Exercise; user: any; navigate: any }) {
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
    <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <PenTool className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            تمرين {ex.exercise_number || ex.order_index}
          </span>
        </div>
        {ex.difficulty && (
          <Badge variant="outline" className="text-[10px]">{"⭐".repeat(Math.min(ex.difficulty, 3))}</Badge>
        )}
      </div>

      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <RichContent text={ex.statement} />
      </div>

      {questions.length > 0 && (
        <ol className="text-[15px] text-foreground space-y-2 mr-2 list-decimal pr-5 marker:text-rose-500 marker:font-black">
          {questions.map((q: string, i: number) => (
            <li key={i} className="pl-2"><RichContent text={q} /></li>
          ))}
        </ol>
      )}

      <div className="bg-background rounded-xl p-4 space-y-3 border border-rose-200 dark:border-rose-900">
        <div className="flex gap-2">
          <Input
            placeholder="إجابتك..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="flex-1 font-mono"
            dir="ltr"
          />
          <Button size="sm" onClick={tryCheck} className="bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0">
            {!user && <Lock className="w-3 h-3 ml-1" />}
            تحقق
          </Button>
        </div>
        {result !== null && (
          <p className={`text-xs font-bold flex items-center gap-1 ${result ? "text-emerald-600" : "text-rose-600"}`}>
            {result ? <CheckCircle className="w-3 h-3" /> : "❌"}
            {result ? "إجابة صحيحة" : "غير صحيحة"}
          </p>
        )}
      </div>

      {ex.hints && ex.hints.length > 0 && (
        <div>
          <button onClick={() => setShowHint((v) => !v)} className="text-xs font-black text-amber-700 hover:underline">
            💡 {showHint ? "إخفاء التلميحات" : `عرض ${ex.hints.length} تلميح`}
          </button>
          {showHint && (
            <div className="mt-2 space-y-1.5">
              {ex.hints.map((h, i) => (
                <p key={i} className="text-[13px] text-amber-900 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                  💡 {h}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {ex.solution && (
        <div>
          <button onClick={() => setShowSolution((v) => !v)} className="text-xs font-black text-rose-700 dark:text-rose-300 hover:underline">
            {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
          </button>
          {showSolution && (
            <div className="mt-2 p-4 bg-background border border-rose-200 dark:border-rose-900 rounded-xl text-[15px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 mb-2">الحل خطوة بخطوة</p>
              <RichContent text={ex.solution} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
