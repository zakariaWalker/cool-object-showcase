// ===== SkillTreeMap — Hierarchical, deterministic concept map =====
// Domain → Subdomain → Skill. Click a skill to focus on it + its prerequisites.
// Replaces force-directed graphs that produced "noise."

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Target, ArrowRight } from "lucide-react";

export interface TreeSkill {
  id: string;
  name_ar?: string | null;
  name: string;
  domain?: string | null;
  subdomain?: string | null;
  grade?: string | null;
  difficulty?: number | null;
  bloom_level?: number | null;
}
export interface TreeDep { from_skill_id: string; to_skill_id: string; }

interface Props {
  skills: TreeSkill[];
  deps?: TreeDep[];
  highlightIds?: string[];
  onSkillClick?: (skill: TreeSkill) => void;
}

const DOMAIN_LABEL: Record<string, string> = {
  algebra: "الجبر",
  geometry: "الهندسة",
  analysis: "التحليل",
  statistics: "الإحصاء",
  probability: "الاحتمالات",
  arithmetic: "الحساب",
  functions: "الدوال",
  trigonometry: "حساب المثلثات",
  other: "أخرى",
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
  other: "var(--muted)",
};

export function SkillTreeMap({ skills, deps = [], highlightIds = [], onSkillClick }: Props) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [focusedSkill, setFocusedSkill] = useState<TreeSkill | null>(null);

  const tree = useMemo(() => {
    const t: Record<string, Record<string, TreeSkill[]>> = {};
    skills.forEach(s => {
      const dom = s.domain || "other";
      const sub = s.subdomain || "أساسيات";
      if (!t[dom]) t[dom] = {};
      if (!t[dom][sub]) t[dom][sub] = [];
      t[dom][sub].push(s);
    });
    Object.values(t).forEach(subs =>
      Object.values(subs).forEach(arr => arr.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1)))
    );
    return t;
  }, [skills]);

  const skillById = useMemo(() => {
    const m = new Map<string, TreeSkill>();
    skills.forEach(s => m.set(s.id, s));
    return m;
  }, [skills]);

  // Auto-expand domains containing highlights
  useMemo(() => {
    if (highlightIds.length) {
      const doms = new Set<string>();
      const subs = new Set<string>();
      highlightIds.forEach(id => {
        const s = skillById.get(id);
        if (s) {
          doms.add(s.domain || "other");
          subs.add(`${s.domain || "other"}:${s.subdomain || "أساسيات"}`);
        }
      });
      setExpandedDomains(prev => new Set([...prev, ...doms]));
      setExpandedSubs(prev => new Set([...prev, ...subs]));
    }
  }, [highlightIds, skillById]);

  const toggleDomain = (d: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };
  const toggleSub = (key: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const focusedPrereqs = useMemo(() => {
    if (!focusedSkill) return [];
    return deps.filter(d => d.to_skill_id === focusedSkill.id).map(d => skillById.get(d.from_skill_id)).filter(Boolean) as TreeSkill[];
  }, [focusedSkill, deps, skillById]);

  const focusedDependents = useMemo(() => {
    if (!focusedSkill) return [];
    return deps.filter(d => d.from_skill_id === focusedSkill.id).map(d => skillById.get(d.to_skill_id)).filter(Boolean) as TreeSkill[];
  }, [focusedSkill, deps, skillById]);

  const domainEntries = Object.entries(tree).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" dir="rtl">
      {/* Tree */}
      <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pl-2">
        {domainEntries.map(([dom, subs]) => {
          const color = DOMAIN_COLOR[dom] || "var(--primary)";
          const isOpen = expandedDomains.has(dom);
          const totalSkills = Object.values(subs).reduce((s, arr) => s + arr.length, 0);
          return (
            <div key={dom} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => toggleDomain(dom)}
                className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition"
                style={{ background: isOpen ? `hsl(${color} / 0.06)` : undefined }}
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: `hsl(${color})` }}
                />
                <span className="font-bold text-sm flex-1 text-right">{DOMAIN_LABEL[dom] || dom}</span>
                <span className="text-[10px] text-muted-foreground">{totalSkills} مهارة · {Object.keys(subs).length} وحدة</span>
              </button>

              {isOpen && (
                <div className="border-t border-border divide-y divide-border">
                  {Object.entries(subs).map(([sub, sks]) => {
                    const subKey = `${dom}:${sub}`;
                    const subOpen = expandedSubs.has(subKey);
                    return (
                      <div key={subKey}>
                        <button
                          onClick={() => toggleSub(subKey)}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition"
                        >
                          {subOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                          <span className="text-xs font-bold flex-1 text-right">{sub}</span>
                          <span className="text-[10px] text-muted-foreground">{sks.length}</span>
                        </button>
                        {subOpen && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                            {sks.map(s => {
                              const isHighlight = highlightIds.includes(s.id);
                              const isFocused = focusedSkill?.id === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => { setFocusedSkill(s); onSkillClick?.(s); }}
                                  className="text-[10px] px-2 py-1 rounded-md border transition-all flex items-center gap-1"
                                  style={{
                                    background: isFocused
                                      ? `hsl(${color})`
                                      : isHighlight
                                      ? `hsl(${color} / 0.15)`
                                      : "hsl(var(--muted) / 0.4)",
                                    color: isFocused
                                      ? "hsl(var(--background))"
                                      : isHighlight
                                      ? `hsl(${color})`
                                      : "hsl(var(--foreground))",
                                    borderColor: isFocused ? `hsl(${color})` : `hsl(${color} / 0.3)`,
                                  }}
                                  title={`صعوبة ${s.difficulty || 1} · بلوم ${s.bloom_level || 3}`}
                                >
                                  {(s.name_ar || s.name).slice(0, 32)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Focus panel */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-border bg-card p-4 sticky top-4">
          {focusedSkill ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">المهارة المختارة</p>
                  <p className="font-bold text-sm">{focusedSkill.name_ar || focusedSkill.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {DOMAIN_LABEL[focusedSkill.domain || "other"]} · {focusedSkill.subdomain || "أساسيات"}
                  </p>
                </div>
              </div>

              {focusedPrereqs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> متطلبات سابقة ({focusedPrereqs.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {focusedPrereqs.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFocusedSkill(p)}
                        className="text-[10px] px-2 py-1 rounded-md bg-muted/40 text-foreground border border-border hover:bg-primary/10 hover:border-primary/30"
                      >
                        {p.name_ar || p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {focusedDependents.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    تؤدي إلى ({focusedDependents.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {focusedDependents.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFocusedSkill(p)}
                        className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                      >
                        {p.name_ar || p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {focusedPrereqs.length === 0 && focusedDependents.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">لا توجد روابط محددة لهذه المهارة بعد.</p>
              )}

              <div className="pt-3 border-t border-border grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground">الصعوبة</p>
                  <p className="text-sm font-bold">{focusedSkill.difficulty || 1}/4</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground">بلوم</p>
                  <p className="text-sm font-bold">B{focusedSkill.bloom_level || 3}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <Target className="w-8 h-8 text-muted-foreground mx-auto opacity-30" />
              <p className="text-xs text-muted-foreground">اختر مهارة من الشجرة لرؤية متطلباتها وما تؤدي إليه</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
