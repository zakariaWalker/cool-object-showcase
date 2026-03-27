// ===== Cognitive Profile Store — Dynamic loop for personalized teaching =====
import { useState, useEffect } from "react";

export type ProfileType = "reactive" | "procedural" | "conceptual" | "strategic" | null;

export interface DiagnosticRecord {
  exerciseId: number;
  type: "standard" | "trap" | "logic" | "open";
  timeToFirstAction: number;
  totalTime: number;
  attempts: number;
  errors: number;
  errorTypes: string[];
  strategyChanges: number;
  hintUsed: boolean;
  correct: boolean;
  explanation: string;
  confidence: number;
  answer: string;
}

export interface ProfileDefinition {
  id: ProfileType;
  nameAr: string;
  title: string;
  nextMission: string;
  desc: string;
  systemPromptModifier: string;
}

export const PROFILES: Record<NonNullable<ProfileType>, ProfileDefinition> = {
  reactive: {
    id: "reactive",
    nameAr: "انعكاسي",
    title: "Starter (مُبادر سريع)",
    nextMission: "المهمة القادمة: التفكير قبل القفز للحل وتطبيق الخطوات بهدوء.",
    desc: "تميل إلى البدء فوراً بدون تحليل مسبق. تعتمد على الحدس والسرعة أكثر من التخطيط.",
    systemPromptModifier: "You must use Guided steps (خطوة بخطوة). Ask very small, incremental questions rather than giving a full exercise. Force the student to start and attempt something even if they guess wrong. Do not overwhelm them.",
  },
  procedural: {
    id: "procedural",
    nameAr: "إجرائي",
    title: "Builder (مُطبّق قوانين)",
    nextMission: "المهمة القادمة: فهم 'لماذا' نستعمل هذه الخطوات بدلاً من حفظها فقط.",
    desc: "تعتمد على القوانين والخطوات المحفوظة. قوي في التطبيق المباشر لكن قد تواجه صعوبة مع الجديد.",
    systemPromptModifier: "You must use Concept-breaking tasks. Frequently ask 'لماذا؟' (Why did you do this?). Present traps where rote memorization fails and the direct formula cannot be used. Emphasize why a formula works over how to use it.",
  },
  conceptual: {
    id: "conceptual",
    nameAr: "مفاهيمي",
    title: "Thinker (مُفكّر عميق)",
    nextMission: "المهمة القادمة: تحدي الاستراتيجيات — اختيار أسرع طريق للحل وعدم التردد.",
    desc: "تفهم المنطق والسبب وراء الحلول. قادر على تكييف المعرفة لمواقف جديدة، لكنك تحلل أكثر من اللازم أحياناً.",
    systemPromptModifier: "You must provide Strategy challenges. Show them multiple methods to solve the same problem and ask them to compare efficiently. Challenge their execution speed and push them to pick the fastest strategy.",
  },
  strategic: {
    id: "strategic",
    nameAr: "استراتيجي",
    title: "Master (مُخطّط استراتيجي)",
    nextMission: "المهمة القادمة: حل مسائل مركبة مفتوحة تحت ضغط الوقت.",
    desc: "تخطط وتبدّل استراتيجياتك بمرونة. تفهم المنهجية بدقة وتجيد التعامل مع المشاكل المعقدة والخادعة.",
    systemPromptModifier: "You must provide Advanced open problems. Apply time pressure challenges and multi-step complex scenarios. Do not hold their hand; give them a challenging constraint and let them engineer the solution.",
  }
};

const STORAGE_KEY = "qed_cognitive_profile_v1";

export function saveProfile(type: ProfileType) {
  try {
    if (type) localStorage.setItem(STORAGE_KEY, type);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getProfile(): ProfileType {
  try {
    return (localStorage.getItem(STORAGE_KEY) as ProfileType) || null;
  } catch {
    return null;
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<ProfileType>(getProfile());

  useEffect(() => {
    const handleStorage = () => setProfileState(getProfile());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setProfile = (type: ProfileType) => {
    saveProfile(type);
    setProfileState(type);
    // Dispatch event so other hooks in same window catch it
    window.dispatchEvent(new Event("storage"));
  };

  return { profile, setProfile };
}

// The exact logic ported from thinking-profiler.html
export function computeProfileFromRecords(records: DiagnosticRecord[]): { type: NonNullable<ProfileType>; scores: any } {
  const scores = { reactive: 0, procedural: 0, conceptual: 0, strategic: 0 };

  for (const rec of records) {
    if (rec.timeToFirstAction < 3) scores.reactive += 2;
    if (rec.attempts >= 3) scores.reactive += 1;
    if (rec.errors > 1 && rec.errorTypes.includes("random")) scores.reactive += 1;

    if (rec.correct && rec.attempts === 1 && rec.explanation.length < 20) scores.procedural += 2;
    if (!rec.hintUsed && rec.correct) scores.procedural += 1;
    if (rec.strategyChanges === 0 && rec.correct) scores.procedural += 1;

    if (rec.explanation.length > 30) scores.conceptual += 2;
    if (rec.errors > 0 && rec.errorTypes.every(e => e !== "random")) scores.conceptual += 1;
    if (rec.confidence > 0.6 && rec.correct) scores.conceptual += 1;

    if (rec.strategyChanges > 0) scores.strategic += 3;
    if (rec.explanation.length > 60) scores.strategic += 2;
    if (rec.hintUsed && rec.correct) scores.strategic += 1;
    if (rec.type === "open" && (rec.answer.length > 20 || rec.explanation.length > 40)) scores.strategic += 2;
  }

  const hasStrategyChange = records.some(r => r.strategyChanges > 0);
  const avgExplainLen = records.reduce((a, r) => a + (r.explanation?.length || 0), 0) / Math.max(1, records.length);
  const hasExplanation = avgExplainLen > 25;
  const directFormula = records.filter(r => r.timeToFirstAction < 4 && r.correct).length >= 2;

  let type: NonNullable<ProfileType> = "reactive";
  if (hasStrategyChange && hasExplanation) type = "strategic";
  else if (hasExplanation) type = "conceptual";
  else if (directFormula) type = "procedural";

  return { type, scores };
}
