// ===== Textbook reader — long-form magazine article =====
// Each lesson is rendered as a single editorial article: kicker, headline, lede,
// byline strip, hero cover, and inline sections (intro / concepts / examples /
// exercises). The chapter/lesson navigator lives in a slide-over drawer instead
// of a permanent sidebar — so the prose has the spotlight.
import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, ChevronLeft, ChevronRight, CheckCircle, Brain, Lightbulb, PenTool,
  Award, Star, Target, FileText, ExternalLink, Sparkles, Menu, X, Clock, ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LatexRenderer } from "@/components/LatexRenderer";

interface Chapter { id: string; order_index: number; title: string; title_ar: string; domain: string; }
interface Lesson { id: string; chapter_id: string; order_index: number; title: string; title_ar: string; objectives: string[]; content_html: string; }
interface Activity {
  id: string; lesson_id: string; order_index: number; activity_type: string;
  title: string; title_ar: string; content_text: string; content_latex: string;
  solution_text: string; difficulty: number; bloom_level: number;
  hints: string[]; is_interactive: boolean; expected_answer: string; answer_type: string;
  metadata?: any;
}
interface SkillLink { id: string; activity_id: string; skill_id: string; relevance_score: number; }

const TYPE_META: Record<string, { icon: any; label: string; tone: string }> = {
  explanation:  { icon: BookOpen,  label: "مقدمة",      tone: "text-indigo-700" },
  definition:   { icon: Target,    label: "تعريف",      tone: "text-blue-700" },
  property:     { icon: Star,      label: "خاصية",      tone: "text-amber-700" },
  theorem:      { icon: Award,     label: "مبرهنة",     tone: "text-purple-700" },
  example:      { icon: Lightbulb, label: "مثال محلول", tone: "text-emerald-700" },
  exercise:     { icon: PenTool,   label: "تمرين",      tone: "text-rose-700" },
  activity:     { icon: Brain,     label: "نشاط",       tone: "text-cyan-700" },
};

const DOMAIN_TONE: Record<string, { dot: string; chip: string; cover: string }> = {
  algebra:     { dot: "bg-algebra",     chip: "bg-algebra/10 text-algebra border-algebra/30",         cover: "from-algebra/30 via-algebra/15 to-background" },
  geometry:    { dot: "bg-geometry",    chip: "bg-geometry/10 text-geometry border-geometry/30",     cover: "from-geometry/30 via-geometry/15 to-background" },
  statistics:  { dot: "bg-statistics",  chip: "bg-statistics/10 text-statistics border-statistics/30", cover: "from-statistics/30 via-statistics/15 to-background" },
  probability: { dot: "bg-probability", chip: "bg-probability/10 text-probability border-probability/30", cover: "from-probability/30 via-probability/15 to-background" },
  functions:   { dot: "bg-functions",   chip: "bg-functions/10 text-functions border-functions/30",   cover: "from-functions/30 via-functions/15 to-background" },
  numbers:     { dot: "bg-accent",      chip: "bg-accent/10 text-accent border-accent/30",           cover: "from-accent/30 via-accent/15 to-background" },
};
const toneOf = (d?: string) => (d && DOMAIN_TONE[d]) || { dot: "bg-muted-foreground", chip: "bg-muted text-foreground border-border", cover: "from-primary/20 via-accent/15 to-background" };

const readingMinutes = (acts: Activity[]) => {
  const n = acts.length;
  return Math.max(3, Math.round(n * 1.2 + 4));
};

// Smart inline renderer: KaTeX for $...$, preserves line breaks
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

export default function TextbookViewer() {
  const { id } = useParams<{ id: string }>();
  const [textbook, setTextbook] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [skillLinks, setSkillLinks] = useState<SkillLink[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [kbExercises, setKbExercises] = useState<Record<string, any>>({});
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean | null>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { if (id) loadData(); }, [id]);

  async function loadData() {
    const [tbRes, chRes, skillsRes] = await Promise.all([
      supabase.from("textbooks").select("*").eq("id", id!).single(),
      supabase.from("textbook_chapters").select("*").eq("textbook_id", id!).order("order_index"),
      supabase.from("kb_skills").select("id, name, name_ar, domain").limit(500),
    ]);
    if (tbRes.data) setTextbook(tbRes.data);
    if (chRes.data) {
      const chs = chRes.data as any[];
      setChapters(chs);
      if (chs.length > 0) {
        setSelectedChapter(chs[0].id);
        loadChapterContent(chs[0].id);
      }
    }
    if (skillsRes.data) setSkills(skillsRes.data as any[]);
  }

  async function loadChapterContent(chapterId: string) {
    setSelectedChapter(chapterId);
    setSelectedLesson(null);
    const { data: lessonData } = await supabase
      .from("textbook_lessons").select("*").eq("chapter_id", chapterId).order("order_index");
    if (lessonData && lessonData.length > 0) {
      setLessons(lessonData as any[]);
      setSelectedLesson((lessonData as any[])[0].id);
      loadLessonActivities((lessonData as any[])[0].id);
    } else {
      setLessons([]); setActivities([]);
    }
  }

  async function loadLessonActivities(lessonId: string) {
    setSelectedLesson(lessonId);
    setDrawerOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    const [actRes, linkRes] = await Promise.all([
      supabase.from("textbook_activities").select("*").eq("lesson_id", lessonId).order("order_index"),
      supabase.from("textbook_skill_links").select("*"),
    ]);
    const acts = (actRes.data as any[]) || [];
    setActivities(acts);
    if (linkRes.data) setSkillLinks(linkRes.data as any[]);

    const allRelatedIds = new Set<string>();
    for (const a of acts) {
      const ids = a.metadata?.related_kb_exercise_ids || [];
      ids.forEach((id: string) => allRelatedIds.add(id));
    }
    if (allRelatedIds.size > 0) {
      const { data: exData } = await supabase
        .from("kb_exercises").select("id, text, difficulty")
        .in("id", Array.from(allRelatedIds));
      const map: Record<string, any> = {};
      (exData || []).forEach((e: any) => { map[e.id] = e; });
      setKbExercises(map);
    } else {
      setKbExercises({});
    }
  }

  function checkAnswer(actId: string, expected: string) {
    const u = (answers[actId] || "").trim().toLowerCase().replace(/\s/g, "");
    const e = expected.trim().toLowerCase().replace(/\s/g, "");
    const ok = u === e;
    setResults((p) => ({ ...p, [actId]: ok }));
    if (ok) toast.success("✅ إجابة صحيحة!"); else toast.error("❌ حاول مرة أخرى");
  }

  const currentChapter = chapters.find((c) => c.id === selectedChapter);
  const currentLesson = lessons.find((l) => l.id === selectedLesson);
  const tone = toneOf(currentChapter?.domain);

  const activitySkills = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const link of skillLinks) {
      const sk = skills.find((s) => s.id === link.skill_id);
      if (sk) {
        if (!map[link.activity_id]) map[link.activity_id] = [];
        map[link.activity_id].push(sk);
      }
    }
    return map;
  }, [skillLinks, skills]);

  const grouped = useMemo(() => {
    const intro = activities.filter(a => a.activity_type === "explanation");
    const concepts = activities.filter(a => ["definition", "property", "theorem"].includes(a.activity_type));
    const examples = activities.filter(a => a.activity_type === "example");
    const exercises = activities.filter(a => ["exercise", "activity"].includes(a.activity_type));
    return { intro, concepts, examples, exercises };
  }, [activities]);

  // Prev / next lesson navigation across the whole book
  const flatLessonIndex = useMemo(() => {
    // We only have lessons of the current chapter loaded; prev/next within chapter is enough for now.
    const idx = lessons.findIndex(l => l.id === selectedLesson);
    return {
      prev: idx > 0 ? lessons[idx - 1] : null,
      next: idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null,
      idx, total: lessons.length,
    };
  }, [lessons, selectedLesson]);

  if (!textbook) {
    return (
      <div className="flex items-center justify-center h-screen">
        <BookOpen className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const minutes = readingMinutes(activities);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Top bar — simple, sticky */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <Link to="/textbooks" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight className="w-3.5 h-3.5" /> المجلّة
          </Link>
          <div className="text-[11px] font-bold text-foreground truncate max-w-[40%] text-center">
            {textbook.title}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-4 h-4" /> الفهرس
          </button>
        </div>
      </div>

      {/* Article */}
      {currentLesson ? (
        <article className="max-w-3xl mx-auto px-4 md:px-6 pb-24">
          {/* Masthead */}
          <header className="pt-10 md:pt-16 pb-8 space-y-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
              {currentChapter?.title_ar || currentChapter?.title || "مقال"}
              <span>•</span>
              <span>الدرس {flatLessonIndex.idx + 1} / {flatLessonIndex.total}</span>
            </div>

            <h1 className="font-black text-foreground text-3xl md:text-5xl leading-[1.15] tracking-tight">
              {currentLesson.title_ar || currentLesson.title}
            </h1>

            {currentLesson.title && currentLesson.title_ar && currentLesson.title !== currentLesson.title_ar && (
              <p className="text-sm text-muted-foreground italic" dir="ltr">{currentLesson.title}</p>
            )}

            {currentLesson.content_html && (
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
                {currentLesson.content_html}
              </p>
            )}

            {/* Byline strip */}
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
              {currentChapter?.title_ar || "الدرس"}
            </div>
          </div>

          {/* Objectives — pull-quote style */}
          {currentLesson.objectives?.length > 0 && (
            <aside className="mb-10 border-r-4 border-primary pr-5 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> ما ستتعلمه
              </p>
              <ul className="space-y-1.5 text-base text-foreground font-medium leading-relaxed">
                {currentLesson.objectives.map((obj, i) => (
                  <li key={i}>— {obj}</li>
                ))}
              </ul>
            </aside>
          )}

          {/* Article body */}
          <div className="space-y-12">
            {grouped.intro.length > 0 && (
              <ArticleSection number="01" title="مقدّمة" kicker="افتتاحية">
                {grouped.intro.map((a) => <Prose key={a.id} act={a} skills={activitySkills[a.id] || []} />)}
              </ArticleSection>
            )}

            {grouped.concepts.length > 0 && (
              <ArticleSection number="02" title="المفاهيم الأساسية" kicker="جوهر الدرس">
                {grouped.concepts.map((a) => <ConceptBlock key={a.id} act={a} skills={activitySkills[a.id] || []} />)}
              </ArticleSection>
            )}

            {grouped.examples.length > 0 && (
              <ArticleSection number="03" title="أمثلة محلولة" kicker="بالتطبيق">
                {grouped.examples.map((a) => (
                  <ExampleBlock
                    key={a.id} act={a}
                    skills={activitySkills[a.id] || []}
                    showSolution={!!showSolution[a.id]}
                    onToggleSolution={() => setShowSolution(p => ({ ...p, [a.id]: !p[a.id] }))}
                  />
                ))}
              </ArticleSection>
            )}

            {grouped.exercises.length > 0 && (
              <ArticleSection number="04" title="تمارين تطبيقية" kicker="جرّب بنفسك">
                {grouped.exercises.map((a) => (
                  <ExerciseBlock
                    key={a.id} act={a}
                    skills={activitySkills[a.id] || []}
                    answer={answers[a.id] || ""}
                    onAnswer={(v) => setAnswers(p => ({ ...p, [a.id]: v }))}
                    result={results[a.id]}
                    onCheck={() => checkAnswer(a.id, a.expected_answer)}
                    showHint={!!showHint[a.id]}
                    onToggleHint={() => setShowHint(p => ({ ...p, [a.id]: !p[a.id] }))}
                    showSolution={!!showSolution[a.id]}
                    onToggleSolution={() => setShowSolution(p => ({ ...p, [a.id]: !p[a.id] }))}
                    relatedKb={(a.metadata?.related_kb_exercise_ids || []).map((id: string) => kbExercises[id]).filter(Boolean)}
                  />
                ))}
              </ArticleSection>
            )}

            {activities.length === 0 && (
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
              {flatLessonIndex.prev ? (
                <button
                  onClick={() => loadLessonActivities(flatLessonIndex.prev!.id)}
                  className="text-right p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-card transition-all group"
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1 justify-end">
                    السابق <ArrowRight className="w-3 h-3" />
                  </div>
                  <div className="text-sm font-black text-foreground group-hover:text-primary line-clamp-2">
                    {flatLessonIndex.prev.title_ar || flatLessonIndex.prev.title}
                  </div>
                </button>
              ) : <div />}
              {flatLessonIndex.next ? (
                <button
                  onClick={() => loadLessonActivities(flatLessonIndex.next!.id)}
                  className="text-right p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-card transition-all group sm:text-left"
                >
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1 sm:justify-start justify-end">
                    <ArrowLeft className="w-3 h-3" /> التالي
                  </div>
                  <div className="text-sm font-black text-foreground group-hover:text-primary line-clamp-2">
                    {flatLessonIndex.next.title_ar || flatLessonIndex.next.title}
                  </div>
                </button>
              ) : <div />}
            </div>
          </footer>
        </article>
      ) : (
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
          <p>اختر درساً من الفهرس</p>
        </div>
      )}

      {/* Drawer — table of contents */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-fade-in" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="relative ml-auto w-80 max-w-[85vw] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">الفهرس</p>
                <p className="text-sm font-black text-foreground truncate">{textbook.title}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {chapters.map((ch) => {
                const t = toneOf(ch.domain);
                return (
                  <div key={ch.id}>
                    <button
                      onClick={() => loadChapterContent(ch.id)}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                        selectedChapter === ch.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                      <span className="flex-1 truncate">{ch.title_ar || ch.title}</span>
                    </button>
                    {selectedChapter === ch.id && lessons.length > 0 && (
                      <div className="mr-4 mt-1 space-y-0.5 border-r-2 border-primary/20 pr-2">
                        {lessons.map((l, i) => (
                          <button
                            key={l.id}
                            onClick={() => loadLessonActivities(l.id)}
                            className={`w-full text-right px-3 py-1.5 rounded text-[11px] transition-colors flex items-center gap-2 ${
                              selectedLesson === l.id ? "bg-accent text-accent-foreground font-bold" : "hover:bg-accent/30 text-muted-foreground"
                            }`}
                          >
                            <span className="text-[9px] font-mono opacity-50">{String(i + 1).padStart(2, "0")}</span>
                            <span className="flex-1 truncate">{l.title_ar || l.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
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

// ─── Article scaffolding ─────────────────────────────────────────────────

function ArticleSection({
  number, title, kicker, children,
}: { number: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-3 border-b border-border pb-3">
        <span className="font-black text-3xl md:text-4xl text-foreground/20 font-mono">{number}</span>
        <div>
          {kicker && (
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">{kicker}</div>
          )}
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

// ─── Prose-style explanation block (no card chrome) ──────────────────────
function Prose({ act, skills }: { act: Activity; skills: any[] }) {
  return (
    <div className="space-y-3">
      {act.title_ar && (
        <h3 className="text-base md:text-lg font-black text-foreground">{act.title_ar}</h3>
      )}
      <div className="text-[15px] md:text-base text-foreground leading-loose font-medium">
        <SmartContent text={act.content_text || act.content_latex} />
      </div>
      {skills.length > 0 && <SkillTags skills={skills} />}
    </div>
  );
}

// ─── Concept block: definition / property / theorem (highlighted call-out)
function ConceptBlock({ act, skills }: { act: Activity; skills: any[] }) {
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
        <SmartContent text={act.content_text || act.content_latex} />
      </div>
      {skills.length > 0 && <div className="mt-4 pt-3 border-t border-border"><SkillTags skills={skills} /></div>}
    </div>
  );
}

// ─── Worked example ─────────────────────────────────────────────────────
function ExampleBlock({
  act, skills, showSolution, onToggleSolution,
}: { act: Activity; skills: any[]; showSolution?: boolean; onToggleSolution?: () => void }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3 text-emerald-700">
        <Lightbulb className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">مثال محلول</span>
        {act.title_ar && <span className="text-sm font-black text-foreground mr-2">— {act.title_ar}</span>}
      </div>
      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <SmartContent text={act.content_text || act.content_latex} />
      </div>
      {act.solution_text && onToggleSolution && (
        <div className="mt-4">
          <button onClick={onToggleSolution} className="text-xs font-black text-emerald-700 hover:underline">
            {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
          </button>
          {showSolution && (
            <div className="mt-3 p-4 bg-background border border-emerald-200 rounded-xl text-[15px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">الحل خطوة بخطوة</p>
              <SmartContent text={act.solution_text} />
            </div>
          )}
        </div>
      )}
      {skills.length > 0 && <div className="mt-4 pt-3 border-t border-emerald-200"><SkillTags skills={skills} /></div>}
    </div>
  );
}

// ─── Interactive exercise ───────────────────────────────────────────────
function ExerciseBlock({
  act, skills, answer, onAnswer, result, onCheck, showHint, onToggleHint, showSolution, onToggleSolution, relatedKb,
}: {
  act: Activity; skills: any[];
  answer: string; onAnswer: (v: string) => void;
  result: boolean | null | undefined; onCheck: () => void;
  showHint: boolean; onToggleHint: () => void;
  showSolution: boolean; onToggleSolution: () => void;
  relatedKb: any[];
}) {
  return (
    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2 text-rose-700">
        <PenTool className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">تمرين</span>
        {act.title_ar && <span className="text-sm font-black text-foreground mr-2">— {act.title_ar}</span>}
        <div className="ml-auto flex items-center gap-1">
          {Array.from({ length: act.difficulty || 1 }).map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          ))}
          {act.bloom_level >= 4 && <Sparkles className="w-3 h-3 text-amber-500 mr-1" />}
        </div>
      </div>

      <div className="text-[15px] md:text-base text-foreground leading-loose">
        <SmartContent text={act.content_text || act.content_latex} />
      </div>

      {act.is_interactive && act.expected_answer && (
        <div className="bg-background rounded-xl p-4 space-y-3 border border-rose-200">
          <div className="flex items-center gap-2">
            <Input
              placeholder="أدخل إجابتك هنا..."
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
              className="flex-1 font-mono"
              dir="ltr"
            />
            <Button size="sm" onClick={onCheck} className="bg-rose-600 hover:bg-rose-700">تحقق</Button>
          </div>
          {result !== undefined && result !== null && (
            <div className={`flex items-center gap-2 text-sm font-bold ${result ? "text-emerald-600" : "text-rose-600"}`}>
              <CheckCircle className="w-4 h-4" />
              {result ? "إجابة صحيحة! 🎉" : "إجابة خاطئة، حاول مرة أخرى"}
            </div>
          )}
        </div>
      )}

      {act.hints?.length > 0 && (
        <div>
          <button onClick={onToggleHint} className="text-xs font-black text-amber-700 hover:underline">
            💡 {showHint ? "إخفاء التلميحات" : `عرض ${act.hints.length} تلميح`}
          </button>
          {showHint && (
            <div className="mt-2 space-y-1.5">
              {act.hints.map((h, i) => (
                <p key={i} className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  💡 <SmartContent text={h} />
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {act.solution_text && (
        <div>
          <button onClick={onToggleSolution} className="text-xs font-black text-rose-700 hover:underline">
            {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
          </button>
          {showSolution && (
            <div className="mt-2 p-4 bg-background border border-rose-200 rounded-xl text-[15px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-2">الحل خطوة بخطوة</p>
              <SmartContent text={act.solution_text} />
            </div>
          )}
        </div>
      )}

      {relatedKb.length > 0 && (
        <div className="pt-3 border-t border-rose-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> تمارين مشابهة
          </p>
          <div className="space-y-1.5">
            {relatedKb.map((ex: any) => (
              <Link
                key={ex.id} to={`/solve/${ex.id}`}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-background hover:bg-rose-50 border border-rose-200 transition-colors text-xs group"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="flex-1 text-foreground line-clamp-2">{ex.text}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-rose-600 flex-shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && <div className="pt-3 border-t border-rose-200"><SkillTags skills={skills} /></div>}
    </div>
  );
}

function SkillTags({ skills }: { skills: any[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, 5).map((s) => (
        <Badge key={s.id} variant="outline" className="text-[10px] font-bold">
          🧠 {s.name_ar || s.name}
        </Badge>
      ))}
    </div>
  );
}
