import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle, Brain, Lightbulb, PenTool, Award, Star, Target, FileText, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const TYPE_META: Record<string, { icon: any; color: string; bg: string; border: string; label: string; ribbon: string }> = {
  explanation:  { icon: BookOpen,  color: "text-indigo-600",  bg: "bg-indigo-50",   border: "border-indigo-200",   label: "مقدمة",        ribbon: "bg-indigo-500" },
  definition:   { icon: Target,    color: "text-blue-600",    bg: "bg-blue-50",     border: "border-blue-200",     label: "تعريف",        ribbon: "bg-blue-500" },
  property:     { icon: Star,      color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200",    label: "خاصية",        ribbon: "bg-amber-500" },
  theorem:      { icon: Award,     color: "text-purple-600",  bg: "bg-purple-50",   border: "border-purple-200",   label: "مبرهنة",       ribbon: "bg-purple-500" },
  example:      { icon: Lightbulb, color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200",  label: "مثال محلول",   ribbon: "bg-emerald-500" },
  exercise:     { icon: PenTool,   color: "text-rose-600",    bg: "bg-rose-50",     border: "border-rose-200",     label: "تمرين",        ribbon: "bg-rose-500" },
  activity:     { icon: Brain,     color: "text-cyan-600",    bg: "bg-cyan-50",     border: "border-cyan-200",     label: "نشاط",         ribbon: "bg-cyan-500" },
};

const DOMAIN_COLORS: Record<string, string> = {
  algebra:     "bg-blue-500/10 text-blue-700 border-blue-500/30",
  geometry:    "bg-green-500/10 text-green-700 border-green-500/30",
  statistics:  "bg-orange-500/10 text-orange-700 border-orange-500/30",
  probability: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  functions:   "bg-cyan-500/10 text-cyan-700 border-cyan-500/30",
  numbers:     "bg-pink-500/10 text-pink-700 border-pink-500/30",
};

// Smart renderer: splits text on $...$ and renders LaTeX inline, leaves Arabic/French as-is
function SmartContent({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span className="leading-loose">
      {parts.map((p, i) => {
        if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
          const expr = p.slice(1, -1);
          return <LatexRenderer key={i} latex={expr} />;
        }
        // Preserve line breaks
        return p.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    const [actRes, linkRes] = await Promise.all([
      supabase.from("textbook_activities").select("*").eq("lesson_id", lessonId).order("order_index"),
      supabase.from("textbook_skill_links").select("*"),
    ]);
    const acts = (actRes.data as any[]) || [];
    setActivities(acts);
    if (linkRes.data) setSkillLinks(linkRes.data as any[]);

    // Load any related KB exercises referenced in metadata
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

  // Group activities by pedagogical section for layout
  const grouped = useMemo(() => {
    const intro = activities.filter(a => a.activity_type === "explanation");
    const concepts = activities.filter(a => ["definition", "property", "theorem"].includes(a.activity_type));
    const examples = activities.filter(a => a.activity_type === "example");
    const exercises = activities.filter(a => ["exercise", "activity"].includes(a.activity_type));
    return { intro, concepts, examples, exercises };
  }, [activities]);

  if (!textbook) return <div className="flex items-center justify-center h-screen"><BookOpen className="w-8 h-8 animate-pulse text-primary" /></div>;

  return (
    <div className="h-screen flex bg-background" dir="rtl">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 border-l border-border bg-card overflow-hidden flex-shrink-0`}>
        <div className="w-72 h-full flex flex-col">
          <div className="p-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
            <h2 className="text-sm font-black text-foreground truncate">{textbook.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{textbook.grade} · {textbook.metadata?.chapters_count || chapters.length} فصل · {textbook.metadata?.activities_count || 0} نشاط</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.map((ch) => (
              <div key={ch.id}>
                <button onClick={() => loadChapterContent(ch.id)}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                    selectedChapter === ch.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${DOMAIN_COLORS[ch.domain]?.split(" ")[0] || "bg-muted"}`} />
                  <span className="flex-1 truncate">{ch.title_ar || ch.title}</span>
                </button>
                {selectedChapter === ch.id && lessons.length > 0 && (
                  <div className="mr-4 mt-1 space-y-0.5 border-r-2 border-primary/20 pr-2">
                    {lessons.map((l) => (
                      <button key={l.id} onClick={() => loadLessonActivities(l.id)}
                        className={`w-full text-right px-3 py-1.5 rounded text-[11px] transition-colors ${
                          selectedLesson === l.id ? "bg-accent text-accent-foreground font-bold" : "hover:bg-accent/30 text-muted-foreground"
                        }`}>
                        {l.title_ar || l.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 z-10 p-1 rounded bg-card border border-border shadow-sm"
        style={{ right: sidebarOpen ? "18.5rem" : "0.5rem" }}>
        {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {currentLesson ? (
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Lesson header */}
            <header className="border-b-2 border-primary/20 pb-6">
              <div className="flex items-center gap-2 mb-3">
                {currentChapter && (
                  <Badge variant="outline" className={DOMAIN_COLORS[currentChapter.domain] || ""}>
                    {currentChapter.title_ar || currentChapter.title}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">الدرس {currentLesson.order_index || ""}</Badge>
              </div>
              <h1 className="text-3xl font-black text-foreground mb-1">{currentLesson.title_ar || currentLesson.title}</h1>
              {currentLesson.title && currentLesson.title_ar && currentLesson.title !== currentLesson.title_ar && (
                <p className="text-sm text-muted-foreground italic" dir="ltr">{currentLesson.title}</p>
              )}
              {currentLesson.objectives?.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs font-black text-primary mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> الأهداف التعلمية
                  </p>
                  <ul className="text-sm text-foreground space-y-1.5 mr-2">
                    {currentLesson.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">◆</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {currentLesson.content_html && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{currentLesson.content_html}</p>
              )}
            </header>

            {/* Section: Introduction */}
            {grouped.intro.length > 0 && (
              <Section title="مقدمة" icon={BookOpen} color="text-indigo-600">
                {grouped.intro.map((a) => <ActivityCard key={a.id} act={a} skills={activitySkills[a.id] || []} />)}
              </Section>
            )}

            {/* Section: Concepts (definitions, properties, theorems) */}
            {grouped.concepts.length > 0 && (
              <Section title="المفاهيم الأساسية" icon={Target} color="text-blue-600">
                {grouped.concepts.map((a) => <ActivityCard key={a.id} act={a} skills={activitySkills[a.id] || []} />)}
              </Section>
            )}

            {/* Section: Worked examples */}
            {grouped.examples.length > 0 && (
              <Section title="أمثلة محلولة" icon={Lightbulb} color="text-emerald-600">
                {grouped.examples.map((a) => (
                  <ActivityCard
                    key={a.id} act={a} skills={activitySkills[a.id] || []}
                    showSolution={!!showSolution[a.id]}
                    onToggleSolution={() => setShowSolution(p => ({ ...p, [a.id]: !p[a.id] }))}
                  />
                ))}
              </Section>
            )}

            {/* Section: Exercises */}
            {grouped.exercises.length > 0 && (
              <Section title="تمارين تطبيقية" icon={PenTool} color="text-rose-600">
                {grouped.exercises.map((a) => (
                  <ExerciseCard
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
              </Section>
            )}

            {activities.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد أنشطة في هذا الدرس</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>اختر درساً من القائمة الجانبية</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────── Sub-components ───────

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className={`flex items-center gap-2 text-lg font-black ${color}`}>
        <Icon className="w-5 h-5" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ActivityCard({ act, skills, showSolution, onToggleSolution }: {
  act: Activity; skills: any[]; showSolution?: boolean; onToggleSolution?: () => void;
}) {
  const meta = TYPE_META[act.activity_type] || TYPE_META.explanation;
  const Icon = meta.icon;
  return (
    <Card className={`overflow-hidden border-2 ${meta.border}`}>
      <div className={`h-1 ${meta.ribbon}`} />
      <CardContent className={`p-5 space-y-3 ${meta.bg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.color}`} />
          <span className={`text-xs font-black ${meta.color}`}>{meta.label}</span>
          {act.title_ar && <span className="text-sm font-bold text-foreground mr-2">{act.title_ar}</span>}
        </div>
        <div className="text-sm text-foreground bg-white/60 rounded-lg p-4 border border-border/50">
          <SmartContent text={act.content_text || act.content_latex} />
        </div>
        {act.solution_text && onToggleSolution && (
          <div>
            <button onClick={onToggleSolution} className="text-xs font-bold text-primary hover:underline">
              {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
            </button>
            {showSolution && (
              <div className="mt-2 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg text-sm">
                <p className="text-[10px] font-black text-emerald-700 mb-2">📝 الحل خطوة بخطوة</p>
                <SmartContent text={act.solution_text} />
              </div>
            )}
          </div>
        )}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
            {skills.slice(0, 5).map((s) => (
              <Badge key={s.id} variant="outline" className="text-[10px]">🧠 {s.name_ar || s.name}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExerciseCard({ act, skills, answer, onAnswer, result, onCheck, showHint, onToggleHint, showSolution, onToggleSolution, relatedKb }: {
  act: Activity; skills: any[];
  answer: string; onAnswer: (v: string) => void;
  result: boolean | null | undefined; onCheck: () => void;
  showHint: boolean; onToggleHint: () => void;
  showSolution: boolean; onToggleSolution: () => void;
  relatedKb: any[];
}) {
  const meta = TYPE_META.exercise;
  return (
    <Card className="overflow-hidden border-2 border-rose-200">
      <div className="h-1 bg-rose-500" />
      <CardContent className="p-5 space-y-4 bg-rose-50/50">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-black text-rose-600">{meta.label}</span>
          {act.title_ar && <span className="text-sm font-bold text-foreground mr-2">{act.title_ar}</span>}
          <div className="mr-auto flex items-center gap-1">
            {Array.from({ length: act.difficulty || 1 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            ))}
            {act.bloom_level >= 4 && <Sparkles className="w-3 h-3 text-amber-500 mr-1" />}
          </div>
        </div>

        <div className="text-sm text-foreground bg-white rounded-lg p-4 border border-border/50">
          <SmartContent text={act.content_text || act.content_latex} />
        </div>

        {/* Interactive answer */}
        {act.is_interactive && act.expected_answer && (
          <div className="bg-white rounded-lg p-4 space-y-3 border border-rose-200">
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

        {/* Hints */}
        {act.hints?.length > 0 && (
          <div>
            <button onClick={onToggleHint} className="text-xs font-bold text-amber-600 hover:underline">
              💡 {showHint ? "إخفاء التلميحات" : `عرض ${act.hints.length} تلميح`}
            </button>
            {showHint && (
              <div className="mt-2 space-y-1.5">
                {act.hints.map((h, i) => (
                  <p key={i} className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                    💡 <SmartContent text={h} />
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solution */}
        {act.solution_text && (
          <div>
            <button onClick={onToggleSolution} className="text-xs font-bold text-primary hover:underline">
              {showSolution ? "▲ إخفاء الحل" : "▼ عرض الحل المفصّل"}
            </button>
            {showSolution && (
              <div className="mt-2 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg text-sm">
                <p className="text-[10px] font-black text-emerald-700 mb-2">📝 الحل خطوة بخطوة</p>
                <SmartContent text={act.solution_text} />
              </div>
            )}
          </div>
        )}

        {/* Related KB exercises */}
        {relatedKb.length > 0 && (
          <div className="pt-2 border-t border-rose-200">
            <p className="text-[10px] font-black text-rose-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> تمارين مشابهة من قاعدة المعرفة
            </p>
            <div className="space-y-1.5">
              {relatedKb.map((ex: any) => (
                <Link key={ex.id} to={`/solve/${ex.id}`}
                  className="flex items-start gap-2 p-2 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 transition-colors text-xs group">
                  <FileText className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 text-foreground line-clamp-2">{ex.text}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-rose-600 flex-shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Linked skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-rose-200">
            {skills.slice(0, 5).map((s) => (
              <Badge key={s.id} variant="outline" className="text-[10px]">🧠 {s.name_ar || s.name}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
