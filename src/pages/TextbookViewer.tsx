import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle, Brain, Lightbulb, PenTool, Award, Star } from "lucide-react";
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
}
interface SkillLink { id: string; activity_id: string; skill_id: string; relevance_score: number; }

const TYPE_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  definition: { icon: BookOpen, color: "text-blue-500", label: "تعريف" },
  property: { icon: Star, color: "text-amber-500", label: "خاصية" },
  theorem: { icon: Award, color: "text-purple-500", label: "مبرهنة" },
  example: { icon: Lightbulb, color: "text-green-500", label: "مثال" },
  exercise: { icon: PenTool, color: "text-red-500", label: "تمرين" },
  activity: { icon: Brain, color: "text-cyan-500", label: "نشاط" },
  explanation: { icon: BookOpen, color: "text-indigo-500", label: "شرح" },
};

const DOMAIN_COLORS: Record<string, string> = {
  algebra: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  geometry: "bg-green-500/10 text-green-500 border-green-500/30",
  statistics: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  probability: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  functions: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
};

export default function TextbookViewer() {
  const { id } = useParams<{ id: string }>();
  const [textbook, setTextbook] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [skillLinks, setSkillLinks] = useState<SkillLink[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean | null>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

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
      .from("textbook_lessons")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("order_index");

    if (lessonData && lessonData.length > 0) {
      setLessons(lessonData as any[]);
      setSelectedLesson((lessonData as any[])[0].id);
      loadLessonActivities((lessonData as any[])[0].id);
    } else {
      setLessons([]);
      setActivities([]);
    }
  }

  async function loadLessonActivities(lessonId: string) {
    setSelectedLesson(lessonId);
    const [actRes, linkRes] = await Promise.all([
      supabase.from("textbook_activities").select("*").eq("lesson_id", lessonId).order("order_index"),
      supabase.from("textbook_skill_links").select("*"),
    ]);
    if (actRes.data) setActivities(actRes.data as any[]);
    if (linkRes.data) setSkillLinks(linkRes.data as any[]);
  }

  function checkAnswer(actId: string, expected: string) {
    const userAnswer = (answers[actId] || "").trim().toLowerCase().replace(/\s/g, "");
    const expectedClean = expected.trim().toLowerCase().replace(/\s/g, "");
    const correct = userAnswer === expectedClean;
    setResults((p) => ({ ...p, [actId]: correct }));
    if (correct) toast.success("✅ إجابة صحيحة!");
    else toast.error("❌ حاول مرة أخرى");
  }

  const currentChapter = chapters.find((c) => c.id === selectedChapter);
  const currentLesson = lessons.find((l) => l.id === selectedLesson);

  const activitySkills = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const link of skillLinks) {
      const skill = skills.find((s) => s.id === link.skill_id);
      if (skill) {
        if (!map[link.activity_id]) map[link.activity_id] = [];
        map[link.activity_id].push(skill);
      }
    }
    return map;
  }, [skillLinks, skills]);

  if (!textbook) return <div className="flex items-center justify-center h-screen"><BookOpen className="w-8 h-8 animate-pulse text-primary" /></div>;

  return (
    <div className="h-screen flex bg-background" dir="rtl">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 border-l border-border bg-card overflow-hidden flex-shrink-0`}>
        <div className="w-72 h-full flex flex-col">
          {/* Book header */}
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-black text-foreground truncate">{textbook.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{textbook.grade} · {textbook.metadata?.chapters_count || 0} فصل</p>
          </div>

          {/* Chapters */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.map((ch) => (
              <div key={ch.id}>
                <button
                  onClick={() => loadChapterContent(ch.id)}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    selectedChapter === ch.id ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ml-2 ${DOMAIN_COLORS[ch.domain]?.split(" ")[0] || "bg-muted"}`} />
                  {ch.title_ar || ch.title}
                </button>

                {/* Lessons under selected chapter */}
                {selectedChapter === ch.id && lessons.length > 0 && (
                  <div className="mr-4 mt-1 space-y-0.5">
                    {lessons.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => loadLessonActivities(l.id)}
                        className={`w-full text-right px-3 py-1.5 rounded text-[11px] transition-colors ${
                          selectedLesson === l.id ? "bg-accent text-accent-foreground font-bold" : "hover:bg-accent/30 text-muted-foreground"
                        }`}
                      >
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

      {/* Toggle sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 right-2 z-10 p-1 rounded bg-card border border-border shadow-sm"
        style={{ right: sidebarOpen ? "18.5rem" : "0.5rem" }}
      >
        {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {currentLesson ? (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Lesson header */}
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-2 mb-2">
                {currentChapter && (
                  <Badge variant="outline" className={DOMAIN_COLORS[currentChapter.domain] || ""}>
                    {currentChapter.domain}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-black text-foreground">{currentLesson.title_ar || currentLesson.title}</h1>
              {currentLesson.objectives?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-muted-foreground mb-1">🎯 الأهداف:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {currentLesson.objectives.map((obj, i) => <li key={i}>• {obj}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Activities */}
            {activities.map((act) => {
              const typeInfo = TYPE_ICONS[act.activity_type] || TYPE_ICONS.explanation;
              const Icon = typeInfo.icon;
              const linkedSkills = activitySkills[act.id] || [];

              return (
                <Card key={act.id} className="overflow-hidden">
                  <div className={`h-1 ${act.activity_type === "exercise" ? "bg-red-500" : act.activity_type === "definition" ? "bg-blue-500" : act.activity_type === "theorem" ? "bg-purple-500" : act.activity_type === "property" ? "bg-amber-500" : "bg-green-500"}`} />
                  <CardContent className="p-5 space-y-4">
                    {/* Activity header */}
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                      <span className="text-xs font-bold text-muted-foreground">{typeInfo.label}</span>
                      {act.title_ar && <span className="text-sm font-bold text-foreground mr-2">{act.title_ar || act.title}</span>}
                      <div className="mr-auto flex items-center gap-1">
                        {Array.from({ length: act.difficulty || 1 }).map((_, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-sm text-foreground leading-relaxed">
                      <LatexRenderer content={act.content_text || act.content_latex} />
                    </div>

                    {/* Interactive exercise */}
                    {act.is_interactive && act.expected_answer && (
                      <div className="bg-accent/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="أدخل إجابتك هنا..."
                            value={answers[act.id] || ""}
                            onChange={(e) => setAnswers((p) => ({ ...p, [act.id]: e.target.value }))}
                            className="flex-1"
                            dir="ltr"
                          />
                          <Button size="sm" onClick={() => checkAnswer(act.id, act.expected_answer)}>
                            تحقق
                          </Button>
                        </div>
                        {results[act.id] !== undefined && results[act.id] !== null && (
                          <div className={`flex items-center gap-2 text-sm ${results[act.id] ? "text-green-500" : "text-red-500"}`}>
                            <CheckCircle className="w-4 h-4" />
                            {results[act.id] ? "إجابة صحيحة! 🎉" : "إجابة خاطئة، حاول مرة أخرى"}
                          </div>
                        )}

                        {/* Hints */}
                        {act.hints?.length > 0 && (
                          <button
                            onClick={() => setShowHint((p) => ({ ...p, [act.id]: !p[act.id] }))}
                            className="text-xs text-primary hover:underline"
                          >
                            💡 {showHint[act.id] ? "إخفاء التلميح" : "عرض تلميح"}
                          </button>
                        )}
                        {showHint[act.id] && act.hints?.map((h, i) => (
                          <p key={i} className="text-xs text-muted-foreground bg-background rounded p-2">💡 {h}</p>
                        ))}
                      </div>
                    )}

                    {/* Solution toggle */}
                    {act.solution_text && (
                      <div>
                        <button
                          onClick={() => setShowSolution((p) => ({ ...p, [act.id]: !p[act.id] }))}
                          className="text-xs text-primary hover:underline"
                        >
                          {showSolution[act.id] ? "إخفاء الحل" : "📝 عرض الحل"}
                        </button>
                        {showSolution[act.id] && (
                          <div className="mt-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-sm">
                            <LatexRenderer content={act.solution_text} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Linked skills */}
                    {linkedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                        {linkedSkills.map((s) => (
                          <Badge key={s.id} variant="outline" className="text-[10px]">
                            🧠 {s.name_ar || s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {activities.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
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
