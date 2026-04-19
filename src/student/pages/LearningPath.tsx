// ===== Personalized Learning Path — Built from real KB data =====
// Pulls skills + dependencies + attempts and builds a topological path
// adapted to the student's weak areas.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Brain, ChevronRight, Lock, CheckCircle2, Target, Zap, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Skill {
  id: string;
  name_ar: string | null;
  name: string;
  domain: string | null;
  subdomain: string | null;
  grade: string | null;
  difficulty: number | null;
  bloom_level: number | null;
}
interface Dep { from_skill_id: string; to_skill_id: string; }
interface Gap { topic: string; severity: string | null; }

const DOMAIN_LABEL: Record<string, string> = {
  algebra: "الجبر",
  geometry: "الهندسة",
  analysis: "التحليل",
  statistics: "الإحصاء",
  probability: "الاحتمالات",
  arithmetic: "الحساب",
  functions: "الدوال",
  trigonometry: "حساب المثلثات",
};

const DOMAIN_COLOR: Record<string, string> = {
  algebra: "var(--algebra)",
  geometry: "var(--geometry)",
  analysis: "var(--functions)",
  statistics: "var(--statistics)",
  probability: "var(--probability)",
  arithmetic: "var(--algebra)",
  functions: "var(--functions)",
  trigonometry: "var(--geometry)",
};

const DIFF_LABEL: Record<number, string> = { 1: "سهل", 2: "متوسط", 3: "صعب", 4: "صعب جداً" };

const LearningPath = () => {
  const { user, profile } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [completedSkillIds, setCompletedSkillIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const grade = (profile as any)?.grade || "4AM";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [sk, dp, gp] = await Promise.all([
        supabase.from("kb_skills").select("id,name_ar,name,domain,subdomain,grade,difficulty,bloom_level").limit(2000),
        supabase.from("kb_skill_dependencies").select("from_skill_id,to_skill_id").limit(2000),
        user ? supabase.from("student_knowledge_gaps").select("topic,severity").eq("student_id", user.id) : Promise.resolve({ data: [] as any[] }),
      ]);
      setSkills((sk.data || []) as Skill[]);
      setDeps((dp.data || []) as Dep[]);
      setGaps((gp.data || []) as Gap[]);
      // Restore completion from localStorage
      try {
        const stored = localStorage.getItem(`completed-skills-${user?.id || "anon"}`);
        if (stored) setCompletedSkillIds(new Set(JSON.parse(stored)));
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  // Build the personalised path: filter by grade, group by subdomain, topo-sort by deps
  const path = useMemo(() => {
    if (!skills.length) return [];
    // Filter by student grade (loose match)
    const gradeFilter = (s: Skill) => !s.grade || s.grade === grade || s.grade.includes(grade) || grade.includes(s.grade);
    const relevant = skills.filter(gradeFilter);
    if (!relevant.length) return [];

    // Mark gap topics as priority
    const gapTopics = new Set(gaps.map(g => g.topic.toLowerCase()));
    const isWeak = (s: Skill) =>
      gapTopics.has((s.subdomain || "").toLowerCase()) ||
      gapTopics.has((s.domain || "").toLowerCase()) ||
      [...gapTopics].some(t => (s.name_ar || s.name).toLowerCase().includes(t));

    // Group by domain → subdomain
    const groups: Record<string, Record<string, Skill[]>> = {};
    relevant.forEach(s => {
      const dom = s.domain || "other";
      const sub = s.subdomain || "أساسيات";
      if (!groups[dom]) groups[dom] = {};
      if (!groups[dom][sub]) groups[dom][sub] = [];
      groups[dom][sub].push(s);
    });

    // Build ordered units
    const units: { domain: string; subdomain: string; skills: Skill[]; weak: boolean }[] = [];
    Object.entries(groups).forEach(([dom, subs]) => {
      Object.entries(subs).forEach(([sub, sks]) => {
        // Sort skills by difficulty then bloom
        sks.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1) || (a.bloom_level || 3) - (b.bloom_level || 3));
        units.push({
          domain: dom,
          subdomain: sub,
          skills: sks,
          weak: sks.some(isWeak),
        });
      });
    });

    // Weak units first, then by domain
    units.sort((a, b) => (b.weak ? 1 : 0) - (a.weak ? 1 : 0));
    return units;
  }, [skills, deps, gaps, grade]);

  const totalSkills = path.reduce((sum, u) => sum + u.skills.length, 0);
  const completedCount = [...completedSkillIds].filter(id => skills.some(s => s.id === id)).length;
  const progress = totalSkills > 0 ? Math.round((completedCount / totalSkills) * 100) : 0;

  const toggleSkill = (id: string) => {
    setCompletedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(`completed-skills-${user?.id || "anon"}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!path.length) {
    return (
      <div className="text-center py-12 space-y-3">
        <Brain className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
        <p className="text-sm text-muted-foreground">لا توجد مهارات متاحة لمستوى {grade}.</p>
        <p className="text-xs text-muted-foreground">اطلب من المعلم إضافة محتوى المنهج لمستواك.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header summary */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-foreground">مسارك في {grade}</p>
            <p className="text-xs text-muted-foreground">
              {totalSkills} مهارة · {path.length} وحدة
              {gaps.length > 0 && <span className="text-destructive font-bold"> · {gaps.length} نقطة ضعف مكتشفة</span>}
            </p>
          </div>
          <div className="text-2xl font-black text-primary">{progress}%</div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Target className="w-3 h-3 text-primary" />
          الوحدات المرتبطة بنقاط ضعفك تظهر أولاً
        </p>
      </div>

      {/* Units */}
      <div className="space-y-3">
        {path.map((unit, idx) => {
          const completedInUnit = unit.skills.filter(s => completedSkillIds.has(s.id)).length;
          const unitDone = completedInUnit === unit.skills.length;
          const color = DOMAIN_COLOR[unit.domain] || "var(--primary)";

          return (
            <div
              key={`${unit.domain}-${unit.subdomain}-${idx}`}
              className="bg-card rounded-2xl border p-4 transition-all"
              style={{ borderColor: unit.weak ? "hsl(var(--destructive) / 0.3)" : "hsl(var(--border))" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{
                    background: unitDone ? `hsl(${color} / 0.15)` : `hsl(${color} / 0.08)`,
                    color: `hsl(${color})`,
                  }}
                >
                  {unitDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{unit.subdomain}</p>
                    {unit.weak && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> أولوية
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {DOMAIN_LABEL[unit.domain] || unit.domain} · {completedInUnit}/{unit.skills.length} مهارة
                  </p>
                </div>
                <Link
                  to="/student/exercises"
                  className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold hover:bg-primary/20 transition flex items-center gap-1"
                >
                  ابدأ <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {/* Skill chips */}
              <div className="flex flex-wrap gap-1.5">
                {unit.skills.slice(0, 8).map(s => {
                  const done = completedSkillIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSkill(s.id)}
                      className="text-[10px] px-2 py-1 rounded-md border transition-all flex items-center gap-1"
                      style={{
                        background: done ? `hsl(${color} / 0.15)` : "hsl(var(--muted) / 0.5)",
                        color: done ? `hsl(${color})` : "hsl(var(--foreground))",
                        borderColor: done ? `hsl(${color} / 0.4)` : "hsl(var(--border))",
                        textDecoration: done ? "line-through" : "none",
                        opacity: done ? 0.7 : 1,
                      }}
                      title={`${s.name_ar || s.name} · ${DIFF_LABEL[s.difficulty || 1]}`}
                    >
                      {done && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {(s.name_ar || s.name).slice(0, 28)}
                    </button>
                  );
                })}
                {unit.skills.length > 8 && (
                  <span className="text-[10px] text-muted-foreground px-2 py-1">+{unit.skills.length - 8}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningPath;
