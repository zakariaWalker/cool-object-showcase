import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

// ── Types ──
interface Skill { id: string; name: string; name_ar: string | null; domain: string | null; subdomain: string | null; grade: string | null; bloom_level: number | null; difficulty: number | null; }
interface Pattern { id: string; name: string; type: string | null; description: string | null; }
interface Exercise { id: string; text: string; type: string | null; grade: string | null; chapter: string | null; }
interface ExamEntry { id: string; year: string; session: string; format: string; grade: string; }
interface ExamQuestion { id: string; exam_id: string; text: string; section_label: string; question_number: number; bloom_level: number | null; concepts: string[] | null; points: number; type: string; }
interface Link { skill_id: string; pattern_id?: string; exercise_id?: string; exam_question_id?: string; }

// ── Domain icons ──
const DOMAIN_ICONS: Record<string, string> = {
  algebra: "🔤", geometry: "📐", analysis: "📈", statistics: "📊", probability: "🎲", arithmetic: "🔢",
};

// ── SVG mini graph ──
function MiniGraph({ skills, links }: { skills: Skill[]; links: { from: string; to: string }[] }) {
  const nodes = skills.slice(0, 30);
  const w = 700, h = 350;
  const positions = nodes.map((_, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const r = 130;
    return { x: w / 2 + Math.cos(angle) * r, y: h / 2 + Math.sin(angle) * r };
  });
  const idxMap = new Map(nodes.map((n, i) => [n.id, i]));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-[350px]">
      {links.map((l, i) => {
        const fi = idxMap.get(l.from), ti = idxMap.get(l.to);
        if (fi === undefined || ti === undefined) return null;
        return <line key={i} x1={positions[fi].x} y1={positions[fi].y} x2={positions[ti].x} y2={positions[ti].y} stroke="hsl(var(--primary)/0.3)" strokeWidth={1} />;
      })}
      {nodes.map((n, i) => (
        <g key={n.id} transform={`translate(${positions[i].x},${positions[i].y})`}>
          <circle r={16} fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth={1.5} />
          <text y={-22} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={8} fontWeight={600}>
            {DOMAIN_ICONS[n.domain || ""] || "📚"} {(n.name_ar || n.name).slice(0, 12)}
          </text>
          <text y={4} textAnchor="middle" fill="hsl(var(--primary))" fontSize={10} fontWeight={700}>
            {(n.name_ar || n.name).slice(0, 6)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Stats card ──
function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-black text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-primary">{sub}</p>}
      </div>
    </div>
  );
}

// ── Linking matrix row ──
function LinkRow({ question, skills, linked, onToggle }: {
  question: ExamQuestion; skills: Skill[]; linked: Set<string>;
  onToggle: (qId: string, sId: string, add: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">Q{question.question_number}</span>
        <p className="text-xs text-foreground flex-1 line-clamp-2" dir="rtl">{question.text}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">B{question.bloom_level || "?"}</span>
        <span className="text-xs text-muted-foreground">{linked.size} مهارة</span>
        <span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="mt-3 flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
          {skills.map(s => {
            const isLinked = linked.has(s.id);
            return (
              <button key={s.id} onClick={() => onToggle(question.id, s.id, !isLinked)}
                className="text-[10px] px-2 py-1 rounded-md border transition-all"
                style={{
                  background: isLinked ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  color: isLinked ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  borderColor: isLinked ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}>
                {DOMAIN_ICONS[s.domain || ""] || "📚"} {s.name_ar || s.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════
export default function UnifiedKBPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [skillPatternLinks, setSkillPatternLinks] = useState<{ skill_id: string; pattern_id: string }[]>([]);
  const [skillExerciseLinks, setSkillExerciseLinks] = useState<{ skill_id: string; exercise_id: string }[]>([]);
  const [examSkillLinks, setExamSkillLinks] = useState<{ exam_question_id: string; skill_id: string }[]>([]);
  const [deps, setDeps] = useState<{ from_skill_id: string; to_skill_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);

  // ── Load all data ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [sk, pt, ex, em, eq, spl, sel, eql, dp] = await Promise.all([
        supabase.from("kb_skills").select("id,name,name_ar,domain,subdomain,grade,bloom_level,difficulty").limit(500),
        supabase.from("kb_patterns").select("id,name,type,description").limit(500),
        supabase.from("kb_exercises").select("id,text,type,grade,chapter").limit(500),
        supabase.from("exam_kb_entries").select("*").limit(200),
        supabase.from("exam_kb_questions").select("*").limit(1000),
        supabase.from("kb_skill_pattern_links").select("skill_id,pattern_id").limit(2000),
        supabase.from("kb_skill_exercise_links").select("skill_id,exercise_id").limit(2000),
        supabase.from("exam_kb_question_skill_links").select("exam_question_id,skill_id").limit(2000),
        supabase.from("kb_skill_dependencies").select("from_skill_id,to_skill_id").limit(2000),
      ]);
      setSkills((sk.data || []) as Skill[]);
      setPatterns((pt.data || []) as Pattern[]);
      setExercises((ex.data || []) as Exercise[]);
      setExams((em.data || []) as ExamEntry[]);
      setExamQuestions((eq.data || []) as ExamQuestion[]);
      setSkillPatternLinks((spl.data || []) as any[]);
      setSkillExerciseLinks((sel.data || []) as any[]);
      setExamSkillLinks((eql.data || []) as any[]);
      setDeps((dp.data || []) as any[]);
      setLoading(false);
    })();
  }, []);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const linkedSkillIds = new Set([
      ...skillPatternLinks.map(l => l.skill_id),
      ...skillExerciseLinks.map(l => l.skill_id),
      ...examSkillLinks.map(l => l.skill_id),
    ]);
    const orphanSkills = skills.filter(s => !linkedSkillIds.has(s.id));
    const linkedExamQIds = new Set(examSkillLinks.map(l => l.exam_question_id));
    const unlinkedExamQs = examQuestions.filter(q => !linkedExamQIds.has(q.id));
    const domainDist: Record<string, number> = {};
    skills.forEach(s => { domainDist[s.domain || "other"] = (domainDist[s.domain || "other"] || 0) + 1; });
    return { linkedSkillIds, orphanSkills, unlinkedExamQs, domainDist, linkedExamQIds };
  }, [skills, skillPatternLinks, skillExerciseLinks, examSkillLinks, examQuestions]);

  // ── Toggle exam↔skill link ──
  const toggleExamSkillLink = async (qId: string, sId: string, add: boolean) => {
    if (add) {
      const { error } = await supabase.from("exam_kb_question_skill_links").insert({ exam_question_id: qId, skill_id: sId });
      if (error) { toast.error("فشل الربط"); return; }
      setExamSkillLinks(prev => [...prev, { exam_question_id: qId, skill_id: sId }]);
      toast.success("تم الربط ✓");
    } else {
      await supabase.from("exam_kb_question_skill_links").delete().eq("exam_question_id", qId).eq("skill_id", sId);
      setExamSkillLinks(prev => prev.filter(l => !(l.exam_question_id === qId && l.skill_id === sId)));
      toast.success("تم إلغاء الربط");
    }
  };

  // ── Auto-link by concepts ──
  const autoLinkByConcepts = async () => {
    let count = 0;
    for (const q of examQuestions) {
      if (!q.concepts?.length) continue;
      const matched = skills.filter(s =>
        q.concepts!.some(c => (s.name_ar || s.name).toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes((s.name_ar || s.name).toLowerCase()))
      );
      for (const s of matched) {
        const exists = examSkillLinks.some(l => l.exam_question_id === q.id && l.skill_id === s.id);
        if (!exists) {
          const { error } = await supabase.from("exam_kb_question_skill_links").insert({ exam_question_id: q.id, skill_id: s.id }).select();
          if (!error) { count++; setExamSkillLinks(prev => [...prev, { exam_question_id: q.id, skill_id: s.id }]); }
        }
      }
    }
    toast.success(`تم ربط ${count} رابط تلقائياً`);
  };

  const filteredQuestions = selectedExam
    ? examQuestions.filter(q => q.exam_id === selectedExam)
    : examQuestions;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-sm font-black text-foreground">🔗 قاعدة المعرفة الموحدة</h1>
          <span className="text-[10px] text-muted-foreground mr-auto">
            {skills.length} مهارة · {patterns.length} نمط · {exercises.length} تمرين · {examQuestions.length} سؤال امتحان
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">📊 نظرة عامة</TabsTrigger>
            <TabsTrigger value="graph">🗺️ خريطة الربط</TabsTrigger>
            <TabsTrigger value="link-exams">🔗 ربط الامتحانات</TabsTrigger>
            <TabsTrigger value="coverage">📋 تغطية المهارات</TabsTrigger>
          </TabsList>

          {/* ════ TAB 1: Overview ════ */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard icon="🧠" label="المهارات" value={skills.length} sub={`${stats.orphanSkills.length} غير مربوطة`} />
              <StatCard icon="🧩" label="الأنماط" value={patterns.length} sub={`${skillPatternLinks.length} رابط`} />
              <StatCard icon="📝" label="التمارين" value={exercises.length} sub={`${skillExerciseLinks.length} رابط`} />
              <StatCard icon="📄" label="أسئلة الامتحان" value={examQuestions.length} sub={`${examSkillLinks.length} رابط · ${stats.unlinkedExamQs.length} غير مربوطة`} />
            </div>

            {/* Domain breakdown */}
            <div className="rounded-xl border border-border bg-card p-4 mb-6">
              <h3 className="text-sm font-bold text-foreground mb-3">توزيع المهارات حسب المجال</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.domainDist).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                  <div key={d} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                    <span className="text-lg">{DOMAIN_ICONS[d] || "📚"}</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{c}</p>
                      <p className="text-[10px] text-muted-foreground">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coverage matrix summary */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">مصفوفة التغطية</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-right px-3 py-2 font-bold text-muted-foreground">المجال</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground">مهارات</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground">أنماط مربوطة</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground">تمارين مربوطة</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground">أسئلة امتحان</th>
                      <th className="text-center px-3 py-2 font-bold text-muted-foreground">تغطية %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.domainDist).sort((a, b) => b[1] - a[1]).map(([domain, count]) => {
                      const domainSkillIds = new Set(skills.filter(s => s.domain === domain).map(s => s.id));
                      const pLinks = skillPatternLinks.filter(l => domainSkillIds.has(l.skill_id)).length;
                      const eLinks = skillExerciseLinks.filter(l => domainSkillIds.has(l.skill_id)).length;
                      const qLinks = examSkillLinks.filter(l => domainSkillIds.has(l.skill_id)).length;
                      const linked = [...domainSkillIds].filter(id => stats.linkedSkillIds.has(id)).length;
                      const coverage = count > 0 ? Math.round((linked / count) * 100) : 0;
                      return (
                        <tr key={domain} className="border-t border-border">
                          <td className="px-3 py-2 font-medium text-foreground">{DOMAIN_ICONS[domain] || "📚"} {domain}</td>
                          <td className="text-center px-3 py-2 text-foreground">{count}</td>
                          <td className="text-center px-3 py-2 text-foreground">{pLinks}</td>
                          <td className="text-center px-3 py-2 text-foreground">{eLinks}</td>
                          <td className="text-center px-3 py-2 text-foreground">{qLinks}</td>
                          <td className="text-center px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${coverage >= 70 ? "bg-green-500/20 text-green-400" : coverage >= 40 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                              {coverage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ════ TAB 2: Graph ════ */}
          <TabsContent value="graph">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-foreground mb-2">🗺️ خريطة الترابط بين المهارات</h3>
              <p className="text-[10px] text-muted-foreground mb-3">أول 30 مهارة مع الترابطات بينها</p>
              <MiniGraph skills={skills} links={deps.map(d => ({ from: d.from_skill_id, to: d.to_skill_id }))} />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-black text-foreground">{deps.length}</p>
                <p className="text-[10px] text-muted-foreground">ترابطات المهارات</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-black text-foreground">{skillPatternLinks.length}</p>
                <p className="text-[10px] text-muted-foreground">مهارة ↔ نمط</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-black text-foreground">{examSkillLinks.length}</p>
                <p className="text-[10px] text-muted-foreground">سؤال ↔ مهارة</p>
              </div>
            </div>
          </TabsContent>

          {/* ════ TAB 3: Link Exams ════ */}
          <TabsContent value="link-exams">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <select value={selectedExam || ""} onChange={e => setSelectedExam(e.target.value || null)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs">
                <option value="">كل الامتحانات</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.format} {e.year} - {e.session} ({e.grade})</option>
                ))}
              </select>
              <button onClick={autoLinkByConcepts}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground">
                ⚡ ربط تلقائي بالمفاهيم
              </button>
              <span className="text-[10px] text-muted-foreground mr-auto">
                {filteredQuestions.length} سؤال · {examSkillLinks.length} رابط
              </span>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredQuestions.slice(0, 50).map(q => {
                const linked = new Set(examSkillLinks.filter(l => l.exam_question_id === q.id).map(l => l.skill_id));
                return <LinkRow key={q.id} question={q} skills={skills} linked={linked} onToggle={toggleExamSkillLink} />;
              })}
              {filteredQuestions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">لا توجد أسئلة امتحان — استورد امتحانات أولاً من صفحة Exam KB</div>
              )}
            </div>
          </TabsContent>

          {/* ════ TAB 4: Coverage ════ */}
          <TabsContent value="coverage">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Orphan skills */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">⚠️ مهارات غير مربوطة ({stats.orphanSkills.length})</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {stats.orphanSkills.map(s => (
                    <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-xs">
                      <span>{DOMAIN_ICONS[s.domain || ""] || "📚"}</span>
                      <span className="text-foreground">{s.name_ar || s.name}</span>
                      <span className="text-[10px] text-muted-foreground mr-auto">{s.domain}</span>
                    </div>
                  ))}
                  {stats.orphanSkills.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">✅ كل المهارات مربوطة</p>}
                </div>
              </div>

              {/* Unlinked exam questions */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">📄 أسئلة امتحان غير مربوطة ({stats.unlinkedExamQs.length})</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {stats.unlinkedExamQs.slice(0, 30).map(q => (
                    <div key={q.id} className="px-2 py-1.5 rounded bg-muted/50 text-xs text-foreground line-clamp-1" dir="rtl">
                      Q{q.question_number}: {q.text.slice(0, 80)}…
                    </div>
                  ))}
                  {stats.unlinkedExamQs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">✅ كل الأسئلة مربوطة</p>}
                </div>
              </div>
            </div>

            {/* Skill detail table */}
            <div className="rounded-xl border border-border bg-card p-4 mt-4">
              <h3 className="text-sm font-bold text-foreground mb-3">📋 تفصيل المهارات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-right px-3 py-2 text-muted-foreground font-bold">المهارة</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-bold">المجال</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-bold">بلوم</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-bold">أنماط</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-bold">تمارين</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-bold">امتحانات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.slice(0, 50).map(s => {
                      const pCount = skillPatternLinks.filter(l => l.skill_id === s.id).length;
                      const eCount = skillExerciseLinks.filter(l => l.skill_id === s.id).length;
                      const qCount = examSkillLinks.filter(l => l.skill_id === s.id).length;
                      return (
                        <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 text-foreground font-medium">{DOMAIN_ICONS[s.domain || ""] || "📚"} {s.name_ar || s.name}</td>
                          <td className="text-center px-3 py-2 text-muted-foreground">{s.domain}</td>
                          <td className="text-center px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">B{s.bloom_level || "?"}</span></td>
                          <td className="text-center px-3 py-2 text-foreground">{pCount}</td>
                          <td className="text-center px-3 py-2 text-foreground">{eCount}</td>
                          <td className="text-center px-3 py-2 text-foreground">{qCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
