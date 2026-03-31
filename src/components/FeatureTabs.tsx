// ===== FeatureTabs — الميزات الخمس =====
// Tabs mounted directly inside TMAExerciseView, below the exercise.
// 1. كاشف الثغرات   2. مسار التعلم   3. خريطة المفاهيم
// 4. المدرّس الآلي   5. لوحة الأستاذ
// All data comes from localStorage (KB + progress) + Claude API for tutor.

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ImadrassaExercise } from "@/engine/dataset-types";
import { ParsedExercise } from "@/engine/exercise-parser";
import { Domain } from "@/engine/types";
import { getProgressRemote, getGapsRemote, syncLocalToSupabase } from "@/engine/progress-store";
import { useProfile, PROFILES } from "@/engine/profile-store";
import { DiagnosticProfiler } from "./DiagnosticProfiler";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KBPattern { name: string; description: string; type_ar: string; steps: string[]; linked_needs: string[] }
interface ExerciseRecord { domain: Domain; subdomain: string; correct: boolean; timestamp: number; input: string }
interface ProgressState { records: ExerciseRecord[]; streak: number; totalSolved: number; byDomain: Record<Domain, number> }
interface KBGap { id: string; signature: string; frequency: number; sourceExercise: string; detectedEntities: string[] }

// ─── DZ curriculum concept labels ─────────────────────────────────────────────

const AR: Record<string, string> = {
  "تحليل": "التحليل إلى عوامل", "قاعدة_الصفر": "قاعدة الصفر",
  "عزل_مجهول": "عزل المجهول", "نقل_حدود": "نقل الحدود",
  "معادلة_خطية": "المعادلة الخطية", "معادلة_تربيعية": "المعادلة التربيعية",
  "كسر": "الكسور", "توحيد_مقامات": "توحيد المقامات",
  "جمع_كسور": "جمع الكسور", "اختصار": "اختصار الكسور",
  "توزيع": "قانون التوزيع", "هوية_جبرية": "الهويات الجبرية",
  "تربيع": "التربيع", "عامل_مشترك": "العامل المشترك",
  "مساحة": "حساب المساحة", "محيط": "حساب المحيط",
  "نظرية_فيثاغورس": "نظرية فيثاغورس", "نسب_مثلثية": "النسب المثلثية",
  "خاصية_طالس": "خاصية طالس", "إحداثيات": "الإحداثيات",
  "مشتقة": "المشتقة", "دالة": "مفهوم الدالة",
  "مجال_تعريف": "مجال التعريف", "جدول_تغيرات": "جدول التغيرات",
  "تكامل": "التكامل", "احتمال": "الاحتمالات",
  "وسط_حسابي": "الوسط الحسابي", "وسيط": "الوسيط",
  "انحراف_معياري": "الانحراف المعياري", "تباين": "التباين",
  "متتالية_حسابية": "المتتالية الحسابية", "متتالية_هندسية": "المتتالية الهندسية",
  "ضرب": "الضرب", "قسمة": "القسمة", "جمع": "الجمع", "طرح": "الطرح",
  "جذر": "الجذر التربيعي", "ترتيب": "ترتيب الأعداد",
  "gcd": "القاسم المشترك الأكبر", "lcm": "المضاعف المشترك الأصغر",
  "تقريب": "التقريب", "أقواس": "فتح الأقواس",
};
const label = (k: string) => AR[k] ?? k;

// ─── Prereq graph ─────────────────────────────────────────────────────────────

const PREREQS: Record<string, string[]> = {
  "ضرب": ["جمع", "طرح"], "قسمة": ["ضرب"],
  "كسر": ["قسمة", "ضرب"], "اختصار": ["كسر", "gcd"],
  "توحيد_مقامات": ["كسر", "lcm"], "جمع_كسور": ["توحيد_مقامات"],
  "نقل_حدود": ["جمع", "طرح"], "عزل_مجهول": ["نقل_حدود", "قسمة"],
  "معادلة_خطية": ["عزل_مجهول"],
  "تربيع": ["ضرب"], "توزيع": ["ضرب", "أقواس"],
  "عامل_مشترك": ["توزيع"], "هوية_جبرية": ["تربيع", "توزيع"],
  "تحليل": ["عامل_مشترك", "هوية_جبرية"],
  "معادلة_تربيعية": ["تحليل", "تربيع"],
  "جذر": ["تربيع"], "مجال_تعريف": ["كسر", "جذر"],
  "دالة": ["معادلة_خطية"], "مشتقة": ["دالة", "تربيع"],
  "جدول_تغيرات": ["مشتقة"], "تكامل": ["مشتقة"],
  "مساحة": ["ضرب"], "محيط": ["جمع"],
  "نظرية_فيثاغورس": ["جذر", "تربيع"],
  "نسب_مثلثية": ["نظرية_فيثاغورس", "قسمة"],
  "خاصية_طالس": ["نسب_مثلثية"], "إحداثيات": ["مساحة", "جمع"],
  "وسط_حسابي": ["جمع", "قسمة"], "وسيط": ["ترتيب"],
  "تباين": ["وسط_حسابي", "تربيع"], "انحراف_معياري": ["تباين", "جذر"],
  "احتمال": ["كسر", "قسمة"],
  "متتالية_حسابية": ["جمع", "ضرب"], "متتالية_هندسية": ["ضرب", "قسمة"],
};

// Domain → core concepts mapping
const DOMAIN_CONCEPTS: Record<string, string[]> = {
  algebra: ["معادلة_خطية", "معادلة_تربيعية", "تحليل", "هوية_جبرية", "عزل_مجهول"],
  geometry: ["نظرية_فيثاغورس", "مساحة", "محيط", "نسب_مثلثية", "خاصية_طالس"],
  statistics: ["وسط_حسابي", "وسيط", "انحراف_معياري", "تباين"],
  probability: ["احتمال"],
  functions: ["دالة", "مشتقة", "جدول_تغيرات", "مجال_تعريف", "تكامل"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadProgress() {
  // synchronous local fallback — used only in non-async contexts
  try {
    const raw = localStorage.getItem("qed_progress_v1");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { records: [], streak: 0, totalSolved: 0, byDomain: { algebra: 0, geometry: 0, statistics: 0, probability: 0, functions: 0 } };
}

function loadKBGaps() {
  // synchronous local fallback
  try {
    const raw = localStorage.getItem("qed_knowledge_base");
    if (raw) return (JSON.parse(raw).learningGaps || []) as KBGap[];
  } catch {}
  return [];
}

// Severity helper
function severity(failRate: number): "high" | "medium" | "low" {
  if (failRate >= 0.6) return "high";
  if (failRate >= 0.35) return "medium";
  return "low";
}
const SEV_COLOR = { high: "hsl(var(--destructive))", medium: "hsl(var(--accent))", low: "hsl(var(--geometry))" };
const SEV_BG    = { high: "hsl(var(--destructive) / 0.08)", medium: "hsl(var(--accent) / 0.08)", low: "hsl(var(--geometry) / 0.05)" };
const SEV_AR    = { high: "ثغرة حرجة", medium: "ثغرة متوسطة", low: "ثغرة بسيطة" };

// Diagnostic questions moved to profile-store.ts and DiagnosticProfiler.tsx

// ─── 1. كاشف الثغرات ─────────────────────────────────────────────────────────

function GapDetector() {
  const [gaps, setGaps] = useState<{ concept: string; failRate: number; failCount: number; total: number; sev: "high"|"medium"|"low"; prereqs: string[] }[]>([]);
  const [kbGaps, setKbGaps] = useState<KBGap[]>([]);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  const { profile } = useProfile();
  const [quizMode, setQuizMode] = useState(false);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    async function load() {
      // Sync any local data first
      syncLocalToSupabase().catch(() => {});
      const prog = await getProgressRemote();
      const bySubdomain: Record<string, { ok: number; fail: number }> = {};
      for (const r of prog.records) {
        if (!bySubdomain[r.subdomain]) bySubdomain[r.subdomain] = { ok: 0, fail: 0 };
        if (r.correct) bySubdomain[r.subdomain].ok++;
        else bySubdomain[r.subdomain].fail++;
      }
      const computed = Object.entries(bySubdomain)
        .filter(([, v]) => v.fail + v.ok >= 2)
        .map(([concept, v]) => {
          const total = v.ok + v.fail;
          const failRate = v.fail / total;
          return { concept, failRate, failCount: v.fail, total, sev: severity(failRate), prereqs: PREREQS[concept] ?? [] };
        })
        .sort((a, b) => b.failRate - a.failRate);
      setGaps(computed);
      // Load gaps from Supabase
      const remoteGaps = await getGapsRemote();
      setKbGaps(remoteGaps.slice(0, 8) as any);
    }
    load();
  }, [quizDone]);

  function resetQuiz() {
    setQuizMode(false);
    setQuizDone(false);
  }

  const noData = gaps.length === 0 && kbGaps.length === 0;

  // ── Quiz Mode UI ──────────────────────────────────────────────────────────
  if (quizMode) {
    return (
      <DiagnosticProfiler level="3AS" onClose={() => { setQuizMode(false); setQuizDone(true); }} />
    );
  }

  // ── Normal Gap View ───────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7 }}>
        يحلل طريقتك في الحل ويكشف "بنيتك الذهنية" — أو ابدأ التشخيص الآن.
      </p>

      {profile && (
        <div style={{ background: "hsl(var(--primary) / 0.07)", border: "1.5px solid hsl(var(--primary) / 0.3)", borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 24 }}>{PROFILES[profile].id === 'strategic' ? '🎯' : PROFILES[profile].id === 'conceptual' ? '💡' : PROFILES[profile].id === 'procedural' ? '📋' : '⚡'}</div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "hsl(var(--primary))", margin: 0, textTransform: "uppercase" }}>نمط تفكيرك الحالي:</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: "hsl(var(--foreground))", margin: "2px 0" }}>{PROFILES[profile].title}</p>
          </div>
        </div>
      )}

      {/* Start diagnostic button */}
      <button
        onClick={() => { setQuizMode(true); setQuizDone(false); }}
        style={{ background: "linear-gradient(135deg,#7B75CC,#9B7BC4)", color: "hsl(var(--card))", border: "none", borderRadius: 12, padding: "13px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        🧠 {profile ? "أعد تشخيص طريقة التفكير" : "ابدأ تشخيص طريقة التفكير (Psych Profile)"}
      </button>

      {noData && (
        <div style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 8 }}>
            حلّ بعض التمارين أو ابدأ التقييم أعلاه — ستظهر ثغراتك هنا تلقائياً.
          </p>
        </div>
      )}

      {gaps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>
            🔍 ثغرات من جلساتك ({gaps.length} مفهوم)
          </p>
          {gaps.map(g => (
            <div key={g.concept}
              style={{ background: SEV_BG[g.sev], borderRadius: 12, border: `1px solid ${SEV_COLOR[g.sev]}30`, overflow: "hidden" }}>
              <button onClick={() => setExpandedGap(expandedGap === g.concept ? null : g.concept)}
                style={{ width: "100%", background: "none", border: "none", padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "right" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: SEV_COLOR[g.sev], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "hsl(var(--foreground))" }}>{label(g.concept)}</span>
                <span style={{ fontSize: 11, color: SEV_COLOR[g.sev], fontWeight: 700 }}>
                  {Math.round(g.failRate * 100)}% خطأ
                </span>
                <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ width: `${g.failRate * 100}%`, height: "100%", background: SEV_COLOR[g.sev], borderRadius: 3 }} />
                </div>
              </button>
              {expandedGap === g.concept && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Chip color={SEV_COLOR[g.sev]} bg={`${SEV_COLOR[g.sev]}18`}>{SEV_AR[g.sev]}</Chip>
                    <Chip color="hsl(var(--muted-foreground))" bg="#f3f4f6">{g.failCount} خطأ من {g.total} محاولة</Chip>
                  </div>
                  {g.prereqs.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "0 0 6px 0" }}>المفاهيم الأساسية المطلوبة:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {g.prereqs.map(p => <Chip key={p} color="hsl(var(--primary))" bg="hsl(var(--primary) / 0.1)">{label(p)}</Chip>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
<br/>

      {kbGaps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>
            🧠 ثغرات مرصودة من قاعدة المعرفة
          </p>
          {kbGaps.map(g => (
            <div key={g.id} style={{ background: "hsl(var(--card))", borderRadius: 10, border: "1px solid #e5e7eb", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "hsl(var(--foreground))", fontWeight: 600 }}>{label(g.signature)}</span>
              <Chip color="hsl(var(--primary))" bg="#F5F3FF">تكرار {g.frequency}</Chip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 2. مولّد مسار التعلم ─────────────────────────────────────────────────────

function LearningPath({ domain }: { domain?: Domain }) {
  const [path, setPath] = useState<{ concept: string; status: "done"|"gap"|"next"|"locked"; description: string }[]>([]);
  const [exercises, setExercises] = useState<Record<string, { id: string; title: string }[]>>({});
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const [loadingEx, setLoadingEx] = useState(false);

  const activeDomain = domain ?? "algebra";

  useEffect(() => {
    async function load() {
      const prog = await getProgressRemote();
      const bySubdomain: Record<string, { ok: number; fail: number }> = {};
      for (const r of prog.records) {
        if (!bySubdomain[r.subdomain]) bySubdomain[r.subdomain] = { ok: 0, fail: 0 };
        if (r.correct) bySubdomain[r.subdomain].ok++;
        else bySubdomain[r.subdomain].fail++;
      }

      const domainConcepts = DOMAIN_CONCEPTS[activeDomain] ?? DOMAIN_CONCEPTS.algebra;
      const visited = new Set<string>();
      const ordered: string[] = [];

      function visit(c: string) {
        if (visited.has(c)) return;
        visited.add(c);
        for (const p of PREREQS[c] ?? []) {
          if (domainConcepts.includes(p) || (PREREQS[c] ?? []).length <= 3) visit(p);
        }
        ordered.push(c);
      }
      for (const c of domainConcepts) visit(c);

      const built = ordered.map(c => {
        const s = bySubdomain[c];
        if (!s) return { concept: c, status: "next" as const, description: "لم تتدرب على هذا المفهوم بعد" };
        const rate = s.ok / (s.ok + s.fail);
        if (rate >= 0.7) return { concept: c, status: "done" as const, description: `أتقنت — ${Math.round(rate*100)}% صحيح` };
        if (rate < 0.4) return { concept: c, status: "gap" as const, description: `ثغرة — ${Math.round(rate*100)}% صحيح فقط` };
        return { concept: c, status: "next" as const, description: `في التقدم — ${Math.round(rate*100)}% صحيح` };
      });

      const finalPath = built.map((item, idx) => {
        if (item.status !== "next") return item;
        const prereqs = PREREQS[item.concept] ?? [];
        const prereqsDone = prereqs.every(p => {
          const pi = built.find(x => x.concept === p);
          return !pi || pi.status === "done";
        });
        if (!prereqsDone && idx > 0) return { ...item, status: "locked" as const, description: "أكمل المفاهيم السابقة أولاً" };
        return item;
      });

      setPath(finalPath);
    }
    load();
  }, [activeDomain]);

  // Fetch exercises from library for a concept
  async function fetchExercisesFor(concept: string) {
    if (exercises[concept] !== undefined) {
      setExpandedConcept(expandedConcept === concept ? null : concept);
      return;
    }
    setLoadingEx(true);
    setExpandedConcept(concept);
    try {
      const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
      const grade = (() => { try { return localStorage.getItem("elmentor_grade") || "middle_4"; } catch { return "middle_4"; } })();
      const res = await fetch(`${apiBase}/api/exercises/${activeDomain}?grade=${grade}&subdomain=${concept}&limit=3`);
      if (res.ok) {
        const data = await res.json();
        const exList = (data.chapters ?? []).flatMap((ch: any) =>
          (ch.exercises ?? []).slice(0, 2).map((ex: any) => ({
            id: ex.id ?? ex.url ?? "",
            title: ex.title ?? ex.statement?.slice(0, 60) ?? "تمرين",
          }))
        ).slice(0, 3);
        setExercises(prev => ({ ...prev, [concept]: exList.length ? exList : [] }));
      }
    } catch {}
    setLoadingEx(false);
  }

  const STATUS_STYLE = {
    done:   { icon: "✅", color: "hsl(var(--geometry))", bg: "hsl(var(--geometry) / 0.08)", border: "hsl(var(--geometry) / 0.3)" },
    gap:    { icon: "⚠️", color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.08)", border: "hsl(var(--destructive) / 0.2)" },
    next:   { icon: "▶️", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.1)", border: "hsl(var(--primary) / 0.3)" },
    locked: { icon: "🔒", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--card))", border: "hsl(var(--border))" },
  };

  const nextGap = path.find(p => p.status === "gap");
  const nextUp   = path.find(p => p.status === "next");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7 }}>
        مسار مخصص لإتقان مفاهيم هذا المجال بالترتيب الصحيح.
      </p>

      {/* Recommendation banner */}
      {(nextGap || nextUp) && (
        <div style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", borderRadius: 12, padding: "14px 16px", color: "hsl(var(--card))" }}>
          <p style={{ fontSize: 11, opacity: 0.8, margin: "0 0 4px 0" }}>📍 التوصية الآن</p>
          <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
            {nextGap ? `عالج ثغرة: ${label(nextGap.concept)}` : `ابدأ بـ: ${label(nextUp!.concept)}`}
          </p>
        </div>
      )}

      {/* Path steps */}
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div style={{ position: "absolute", right: 18, top: 0, bottom: 0, width: 2, background: "hsl(var(--border))", zIndex: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1 }}>
          {path.map((item, i) => {
            const st = STATUS_STYLE[item.status];
            return (
              <motion.div key={item.concept}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Node dot */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: st.bg, border: `2px solid ${st.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {st.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: st.color, margin: "0 0 2px 0" }}>{label(item.concept)}</p>
                      {(item.status === "gap" || item.status === "next") && (
                        <button
                          onClick={() => fetchExercisesFor(item.concept)}
                          style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, border: "none", background: st.color, color: "hsl(var(--card))", cursor: "pointer", flexShrink: 0, fontFamily: "'Tajawal',sans-serif" }}
                        >
                          {expandedConcept === item.concept ? "▲ إخفاء" : "📚 تمارين"}
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: 0 }}>{item.description}</p>
                  </div>
                  {/* Exercises panel */}
                  <AnimatePresence>
                    {expandedConcept === item.concept && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden", marginTop: 6 }}>
                        {loadingEx ? (
                          <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", padding: "8px 12px" }}>⏳ جارٍ تحميل التمارين...</p>
                        ) : (exercises[item.concept] ?? []).length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {(exercises[item.concept] ?? []).map((ex, ei) => (
                              <div key={ei} style={{ background: "hsl(var(--card))", border: `1px solid ${st.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "hsl(var(--foreground))", cursor: "pointer" }}
                                onClick={() => { const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, ""); if (ex.id) window.open(`${apiBase}/exercise/${ex.id}`, "_blank"); }}>
                                📝 {ex.title}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", padding: "8px 12px" }}>لا توجد تمارين محددة — استخدم المكتبة.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {path.length === 0 && (
        <div style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
          <span style={{ fontSize: 28 }}>🗺️</span>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 8 }}>حلّ بعض التمارين لتوليد مسارك الشخصي.</p>
        </div>
      )}
    </div>
  );
}

// ─── 3. خريطة المفاهيم ───────────────────────────────────────────────────────

function ConceptMapView({ domain }: { domain?: Domain }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const activeDomain = domain ?? "algebra";
  const coreConcepts = DOMAIN_CONCEPTS[activeDomain] ?? DOMAIN_CONCEPTS.algebra;

  // Collect all reachable nodes from core concepts (BFS)
  const allNodes = new Set<string>();
  const queue = [...coreConcepts];
  while (queue.length) {
    const c = queue.shift()!;
    if (allNodes.has(c)) continue;
    allNodes.add(c);
    for (const p of PREREQS[c] ?? []) queue.push(p);
  }

  const nodeList = Array.from(allNodes);

  // Simple layered layout: assign depth
  const depth: Record<string, number> = {};
  function assignDepth(c: string, d: number) {
    if (depth[c] !== undefined && depth[c] <= d) return;
    depth[c] = d;
    for (const p of PREREQS[c] ?? []) assignDepth(p, d + 1);
  }
  for (const c of coreConcepts) assignDepth(c, 0);

  const maxDepth = Math.max(...Object.values(depth), 0);

  // Group by depth layer
  const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const n of nodeList) layers[depth[n] ?? maxDepth].push(n);

  // Assign positions (SVG: 360×400, RTL feel — core at top)
  const W = 360, H = Math.max(300, (maxDepth + 1) * 70 + 40);
  const POS: Record<string, { x: number; y: number }> = {};
  layers.forEach((layer, d) => {
    const y = 30 + d * Math.min(70, (H - 60) / (maxDepth + 1));
    layer.forEach((c, i) => {
      const x = (W / (layer.length + 1)) * (i + 1);
      POS[c] = { x, y };
    });
  });

  // Edges
  const edges: { from: string; to: string }[] = [];
  for (const n of nodeList) {
    for (const p of PREREQS[n] ?? []) {
      if (allNodes.has(p)) edges.push({ from: p, to: n });
    }
  }

  // Domain-matched color
  const DOMAIN_COLOR: Record<string, string> = {
    algebra: "#7B75CC", geometry: "#4DA88D", statistics: "#C49A4A",
    probability: "#9B7BC4", functions: "#C46B7E",
  };
  const accent = DOMAIN_COLOR[activeDomain] ?? "#7B75CC";

  function nodeColor(c: string) {
    if (coreConcepts.includes(c)) return accent;
    return "hsl(var(--muted-foreground))";
  }

  const selNode = selectedNode;

  // Build simple ordered chain: just core concepts for this domain in prereq order
  const chain: string[] = [];
  const chainVisited = new Set<string>();
  function addToChain(c: string) {
    if (chainVisited.has(c)) return;
    chainVisited.add(c);
    for (const p of PREREQS[c] ?? []) {
      if (coreConcepts.includes(p)) addToChain(p);
    }
    chain.push(c);
  }
  for (const c of coreConcepts) addToChain(c);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7 }}>
        اضغط على أي مفهوم لتفاصيله — الترتيب من الأساسي إلى المتقدم.
      </p>

      {/* Simple horizontal chain — scrollable */}
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: "max-content", padding: "4px 2px" }}>
          {chain.map((c, i) => {
            const isCore = coreConcepts.includes(c);
            const isSel = selectedNode === c;
            return (
              <div key={c} style={{ display: "flex", alignItems: "center" }}>
                {/* Node card */}
                <button
                  onClick={() => setSelectedNode(isSel ? null : c)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 4, padding: "10px 12px", borderRadius: 12,
                    border: `2px solid ${isSel ? accent : isCore ? `${accent}60` : "hsl(var(--border))"}`,
                    background: isSel ? accent : isCore ? `${accent}10` : "hsl(var(--card))",
                    cursor: "pointer", minWidth: 72, transition: "all 0.15s",
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {i === 0 ? "🌱" : i === chain.length - 1 ? "🏆" : isCore ? "⭐" : "📌"}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: isSel ? 800 : isCore ? 700 : 500,
                    color: isSel ? "hsl(var(--card))" : isCore ? accent : "hsl(var(--muted-foreground))",
                    textAlign: "center", lineHeight: 1.3, maxWidth: 70,
                  }}>
                    {label(c)}
                  </span>
                </button>
                {/* Arrow between nodes */}
                {i < chain.length - 1 && (
                  <div style={{ fontSize: 16, color: "hsl(var(--border))", padding: "0 4px" }}>→</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected node detail */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ background: `${accent}10`, border: `1.5px solid ${accent}30`, borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: accent, margin: "0 0 8px 0" }}>
              {label(selectedNode)}
            </p>
            {(PREREQS[selectedNode] ?? []).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>يتطلب:</span>
                {(PREREQS[selectedNode] ?? []).map(p => (
                  <span key={p} style={{ fontSize: 11, background: "hsl(var(--primary) / 0.1)", color: accent, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
                    {label(p)}
                  </span>
                ))}
              </div>
            )}
            {Object.entries(PREREQS).filter(([, v]) => v.includes(selectedNode)).map(([k]) => k).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>يُمكّن:</span>
                {Object.entries(PREREQS).filter(([, v]) => v.includes(selectedNode)).map(([k]) => (
                  <span key={k} style={{ fontSize: 11, background: "hsl(var(--geometry) / 0.05)", color: "hsl(var(--geometry))", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
                    {label(k)}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {chain.length === 0 && (
        <div style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: "20px", textAlign: "center" }}>
          <span style={{ fontSize: 28 }}>🕸️</span>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 8 }}>لا توجد بيانات للمجال الحالي.</p>
        </div>
      )}
    </div>
  );
}

// ─── 4. المدرّس الآلي ────────────────────────────────────────────────────────

function AITutor({ exercise, kbPattern }: { exercise: ImadrassaExercise; kbPattern: KBPattern | null }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user"|"assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build system context from exercise + KB pattern
  const systemPrompt = `أنت مدرّس رياضيات متخصص في المنهج الجزائري (BEM/BAC). تشرح بالعربية بأسلوب واضح ومشجع للطلاب.

التمرين الحالي:
العنوان: ${exercise.title || "تمرين رياضي"}
النص: ${exercise.statement || ""}
الأسئلة: ${exercise.questions.join(" | ")}
${kbPattern ? `النمط المعرفي: ${kbPattern.name} — ${kbPattern.description}
الخطوات المعروفة: ${kbPattern.steps.join(" → ")}
المفاهيم: ${kbPattern.linked_needs.join(", ")}` : ""}

قواعد:
- اشرح خطوة بخطوة مع السبب (لماذا هذه الخطوة؟)
- استخدم أمثلة بسيطة إذا لزم
- إذا كان الطالب يخطئ، صحّح بلطف
- لا تعطِ الإجابة كاملة مرة واحدة إلا إذا طُلب ذلك صراحة
- اكتب المعادلات بصيغة LaTeX ضمن علامتي $`;

  async function sendMessage() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setError("");

    const newMessages: { role: "user"|"assistant"; content: string }[] = [
      ...messages,
      { role: "user", content: q },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const key = GEMINI_KEY;
      if (!key) {
        setError("مفتاح Gemini غير مُهيَّأ — أضف VITE_GEMINI_KEY في ملف .env");
        setLoading(false);
        return;
      }
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemPrompt,
      });

      // Build chat history (all except last user message)
      const history = newMessages.slice(0, -1).map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(q);
      const reply = result.response.text();

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("حدث خطأ في الاتصال — تحقق من الشبكة.");
      console.error("[AITutor Gemini]", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7 }}>
        اسأل عن أي خطوة في التمرين — سيشرح لك المدرّس الآلي بالعربية خطوة بخطوة.
      </p>

      {/* Chat area */}
      <div style={{ minHeight: 180, maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
        {messages.length === 0 && (
          <div style={{ background: "hsl(var(--geometry) / 0.05)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 13, color: "hsl(var(--geometry))", fontWeight: 700, margin: "0 0 6px 0" }}>
              مرحباً! أنا مدرّسك الآلي 🤖
            </p>
            <p style={{ fontSize: 12, color: "hsl(var(--foreground))", margin: 0 }}>
              يمكنك أن تسألني عن أي شيء في هذا التمرين:
            </p>
            <ul style={{ fontSize: 12, color: "hsl(var(--foreground))", margin: "8px 0 0 0", paddingRight: 16, lineHeight: 2 }}>
              <li>«كيف أبدأ حل هذا التمرين؟»</li>
              <li>«لماذا نستخدم هذه القاعدة؟»</li>
              <li>«اشرح لي الخطوة الأولى»</li>
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? "#7B75CC" : "hsl(var(--card))",
              color: m.role === "user" ? "hsl(var(--card))" : "hsl(var(--foreground))",
              border: m.role === "user" ? "none" : "1px solid #E5E7EB",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "10px 14px",
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </motion.div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: "hsl(var(--card))", borderRadius: "18px 18px 18px 4px", alignSelf: "flex-start", border: "1px solid #E5E7EB" }}>
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#7B75CC" }}
              />
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "hsl(var(--destructive))" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          placeholder="اسأل المدرّس..."
          rows={2}
          style={{
            flex: 1, resize: "none", borderRadius: 14, border: "1px solid #D1D5DB",
            padding: "10px 14px", fontSize: 13, fontFamily: "'Tajawal', sans-serif",
            direction: "rtl", outline: "none", lineHeight: 1.6,
            background: "hsl(var(--card))",
          }}
        />
        <button onClick={sendMessage} disabled={!question.trim() || loading}
          style={{
            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
            background: question.trim() && !loading ? "#7B75CC" : "hsl(var(--border))",
            border: "none", cursor: question.trim() && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, transition: "background 0.2s",
          }}>
          ✈️
        </button>
      </div>

      <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", margin: 0, textAlign: "center" }}>
        مدعوم بـ Gemini Flash · elmentor AI
      </p>
    </div>
  );
}

// ─── 5. لوحة تحكم الأستاذ ────────────────────────────────────────────────────

function TeacherPanel() {
  const [stats, setStats] = useState<{
    totalSolved: number; streak: number;
    byDomain: Record<string, number>;
    weakConcepts: { concept: string; failRate: number }[];
    strongConcepts: { concept: string; successRate: number }[];
    recentActivity: { date: string; count: number }[];
    overallRate: number;
  } | null>(null);

  useEffect(() => {
    const prog = loadProgress();
    const total = prog.records.length;
    if (total === 0) { setStats(null); return; }

    const correct = prog.records.filter(r => r.correct).length;
    const overallRate = correct / total;

    // By subdomain stats
    const bySD: Record<string, { ok: number; fail: number }> = {};
    for (const r of prog.records) {
      if (!bySD[r.subdomain]) bySD[r.subdomain] = { ok: 0, fail: 0 };
      if (r.correct) bySD[r.subdomain].ok++;
      else bySD[r.subdomain].fail++;
    }

    const subdomainList = Object.entries(bySD)
      .filter(([, v]) => v.ok + v.fail >= 2)
      .map(([concept, v]) => {
        const tot = v.ok + v.fail;
        return { concept, failRate: v.fail / tot, successRate: v.ok / tot };
      });

    const weakConcepts = subdomainList
      .filter(x => x.failRate > 0.3)
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);

    const strongConcepts = subdomainList
      .filter(x => x.successRate >= 0.7)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    // Recent 7-day activity
    const now = Date.now();
    const days7 = 7 * 24 * 60 * 60 * 1000;
    const recentMap: Record<string, number> = {};
    for (const r of prog.records) {
      if (now - r.timestamp > days7) continue;
      const d = new Date(r.timestamp).toLocaleDateString("ar-DZ", { weekday: "short" });
      recentMap[d] = (recentMap[d] ?? 0) + 1;
    }
    const recentActivity = Object.entries(recentMap).map(([date, count]) => ({ date, count }));

    setStats({
      totalSolved: total,
      streak: prog.streak,
      byDomain: prog.byDomain,
      weakConcepts,
      strongConcepts,
      recentActivity,
      overallRate,
    });
  }, []);

  if (!stats) {
    return (
      <div style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: "24px 16px", textAlign: "center" }}>
        <span style={{ fontSize: 32 }}>📊</span>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 10 }}>
          حلّ التمارين لبناء لوحة متابعتك.
        </p>
      </div>
    );
  }

  const rateColor = stats.overallRate >= 0.65 ? "#4DA88D" : stats.overallRate >= 0.4 ? "#C49A4A" : "#D06060";

  const DOMAIN_AR: Record<string, string> = {
    algebra: "الجبر", geometry: "الهندسة", statistics: "الإحصاء",
    probability: "الاحتمالات", functions: "الدوال",
  };
  const DOMAIN_COLOR: Record<string, string> = {
    algebra: "#7B75CC", geometry: "#4DA88D", statistics: "#C49A4A",
    probability: "#9B7BC4", functions: "#C46B7E",
  };

  const maxDomain = Math.max(...Object.values(stats.byDomain));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7 }}>
        ملخص أدائك الكامل — ثغراتك الجماعية وتقدمك عبر الوقت.
      </p>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "إجمالي التمارين", value: stats.totalSolved, icon: "📚" },
          { label: "معدل النجاح", value: `${Math.round(stats.overallRate * 100)}%`, icon: "🎯", valueColor: rateColor },
          { label: "سلسلة الأيام", value: `${stats.streak} يوم`, icon: "🔥" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "hsl(var(--card))", borderRadius: 12, padding: "12px 10px", textAlign: "center", border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{kpi.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: kpi.valueColor ?? "hsl(var(--foreground))", lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 9, color: "hsl(var(--muted-foreground))", marginTop: 4, lineHeight: 1.3 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Domain bars */}
      <div style={{ background: "hsl(var(--card))", borderRadius: 12, padding: "14px", border: "1px solid #E5E7EB" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 10px 0" }}>📈 التمارين حسب المجال</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(stats.byDomain).map(([domain, count]) => {
            if (!count) return null;
            const pct = maxDomain ? (count / maxDomain) * 100 : 0;
            const color = DOMAIN_COLOR[domain] ?? "hsl(var(--muted-foreground))";
            return (
              <div key={domain}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: "hsl(var(--foreground))", fontWeight: 600 }}>{DOMAIN_AR[domain] ?? domain}</span>
                  <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{count} تمرين</span>
                </div>
                <div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                    style={{ height: "100%", background: color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak concepts */}
      {stats.weakConcepts.length > 0 && (
        <div style={{ background: "hsl(var(--destructive) / 0.08)", borderRadius: 12, padding: "14px", border: "1px solid #FECACA" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--destructive))", margin: "0 0 10px 0" }}>
            ⚠️ أضعف المفاهيم — يُوصى بإعادة الشرح
          </p>
          {stats.weakConcepts.map(w => (
            <div key={w.concept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "hsl(var(--foreground))", fontWeight: 600 }}>{label(w.concept)}</span>
              <Chip color="hsl(var(--destructive))" bg="hsl(var(--destructive) / 0.08)">{Math.round(w.failRate * 100)}% خطأ</Chip>
            </div>
          ))}
        </div>
      )}

      {/* Strong concepts */}
      {stats.strongConcepts.length > 0 && (
        <div style={{ background: "hsl(var(--geometry) / 0.08)", borderRadius: 12, padding: "14px", border: "1px solid #A7F3D0" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--geometry))", margin: "0 0 10px 0" }}>
            ✅ أقوى المفاهيم — مُتقَنة
          </p>
          {stats.strongConcepts.map(s => (
            <div key={s.concept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "hsl(var(--foreground))", fontWeight: 600 }}>{label(s.concept)}</span>
              <Chip color="hsl(var(--geometry))" bg="hsl(var(--geometry) / 0.15)">{Math.round(s.successRate * 100)}% صحيح</Chip>
            </div>
          ))}
        </div>
      )}

      {/* Weekly activity */}
      {stats.recentActivity.length > 0 && (
        <div style={{ background: "hsl(var(--card))", borderRadius: 12, padding: "14px", border: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 10px 0" }}>📅 نشاط الأسبوع الحالي</p>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
            {stats.recentActivity.map(d => {
              const maxCount = Math.max(...stats.recentActivity.map(x => x.count));
              const h = maxCount ? (d.count / maxCount) * 50 + 10 : 10;
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", height: h, background: "hsl(var(--primary))", borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
                  <span style={{ fontSize: 9, color: "hsl(var(--muted-foreground))" }}>{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Chip ──────────────────────────────────────────────────────────────

function Chip({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// ─── Main FeatureTabs Component ───────────────────────────────────────────────

interface FeatureTabsProps {
  exercise: ImadrassaExercise;
  parsed: ParsedExercise | null;
  kbPattern: KBPattern | null;
}

const TABS = [
  { icon: "🔍", label: "كاشف الثغرات", shortLabel: "الثغرات" },
  { icon: "🗺️", label: "مسار التعلم", shortLabel: "المسار" },
  { icon: "🕸️", label: "خريطة المفاهيم", shortLabel: "المفاهيم" },
  { icon: "🤖", label: "المدرّس الآلي", shortLabel: "المدرّس" },
  { icon: "📊", label: "لوحة الأستاذ", shortLabel: "الأستاذ" },
];

export function FeatureTabs({ exercise, parsed, kbPattern }: FeatureTabsProps) {
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const domain = parsed?.classification.domain;

  return (
    <div
      style={{
        background: "hsl(var(--card))",
        borderRadius: 16,
        boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
        overflow: "hidden",
        fontFamily: "'Tajawal', sans-serif",
        direction: "rtl",
      }}
    >
      {/* Section header */}
      <div style={{ background: "hsl(var(--card))", borderBottom: "1px solid #E5E7EB", padding: "12px 16px" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "hsl(var(--foreground))" }}>⚡ أدوات التعلم الذكي</span>
        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginRight: 8 }}>اختر الأداة</span>
      </div>

      {/* Tab chips — horizontal scroll */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 14px", scrollbarWidth: "none" }}>
        {TABS.map((t, i) => {
          const active = activeTab === i;
          return (
            <button key={i}
              onClick={() => setActiveTab(active ? null : i)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 20, flexShrink: 0,
                background: active ? "hsl(var(--primary))" : "#F1F5F9",
                border: active ? "none" : "1px solid #E5E7EB",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "'Tajawal', sans-serif",
              }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? "hsl(var(--card))" : "hsl(var(--foreground))", whiteSpace: "nowrap" }}>
                {t.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab !== null && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            style={{ padding: "0 14px 18px" }}
          >
            {/* Tab title */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingTop: 2 }}>
              <span style={{ fontSize: 20 }}>{TABS[activeTab].icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "hsl(var(--foreground))" }}>{TABS[activeTab].label}</span>
            </div>

            {activeTab === 0 && <GapDetector />}
            {activeTab === 1 && <LearningPath domain={domain} />}
            {activeTab === 2 && <ConceptMapView domain={domain} />}
            {activeTab === 3 && <AITutor exercise={exercise} kbPattern={kbPattern} />}
            {activeTab === 4 && <TeacherPanel />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
