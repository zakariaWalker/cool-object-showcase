// ===== Gamification Engine — XP, Levels, Streaks, Badges, Daily Challenge =====
import { supabase } from "@/integrations/supabase/client";

// ── Level thresholds ───────────────────────────────
const LEVEL_XP = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000, 7000, 10000];

export function xpForLevel(level: number): number {
  return LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] || level * 1000;
}

export function levelFromXP(xp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return i + 1;
  }
  return 1;
}

export function xpProgress(xp: number): { current: number; next: number; percent: number } {
  const level = levelFromXP(xp);
  const current = LEVEL_XP[level - 1] || 0;
  const next = LEVEL_XP[level] || current + 1000;
  const percent = Math.min(100, ((xp - current) / (next - current)) * 100);
  return { current, next, percent };
}

export const LEVEL_TITLES = [
  "", "مبتدئ", "متعلم", "ناشط", "مثابر", "متقدم",
  "بارع", "خبير", "أستاذ", "عبقري", "عالم", "فيلسوف", "أسطورة",
];

// ── XP rewards ─────────────────────────────────────
export const XP_REWARDS = {
  exercise_solved: 10,
  exercise_correct: 25,
  daily_challenge: 50,
  streak_bonus_3: 30,
  streak_bonus_7: 100,
  streak_bonus_30: 500,
  diagnostic_complete: 40,
  pattern_mastered: 75,
  first_exercise: 20,
  perfect_round: 60,
};

// ── Badge definitions ──────────────────────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: StudentStats) => boolean;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

export interface StudentStats {
  xp: number;
  level: number;
  streak_days: number;
  total_exercises: number;
  total_correct: number;
  badges: string[];
  mastery: Record<string, number>;
}

export const BADGES: Badge[] = [
  { id: "first_step", name: "الخطوة الأولى", description: "حل أول تمرين", emoji: "🌱", tier: "bronze",
    condition: s => s.total_exercises >= 1 },
  { id: "ten_solved", name: "المثابر", description: "حل 10 تمارين", emoji: "💪", tier: "bronze",
    condition: s => s.total_exercises >= 10 },
  { id: "fifty_solved", name: "المتمرّس", description: "حل 50 تمرين", emoji: "🔥", tier: "silver",
    condition: s => s.total_exercises >= 50 },
  { id: "hundred_solved", name: "المحترف", description: "حل 100 تمرين", emoji: "🏆", tier: "gold",
    condition: s => s.total_exercises >= 100 },
  { id: "streak_3", name: "ثلاثية", description: "سلسلة 3 أيام متتالية", emoji: "⚡", tier: "bronze",
    condition: s => s.streak_days >= 3 },
  { id: "streak_7", name: "أسبوع كامل", description: "سلسلة 7 أيام متتالية", emoji: "🔥", tier: "silver",
    condition: s => s.streak_days >= 7 },
  { id: "streak_30", name: "شهر التميّز", description: "سلسلة 30 يوم متتالي", emoji: "👑", tier: "diamond",
    condition: s => s.streak_days >= 30 },
  { id: "accuracy_80", name: "الدقيق", description: "نسبة صحة أكثر من 80%", emoji: "🎯", tier: "silver",
    condition: s => s.total_exercises >= 10 && (s.total_correct / s.total_exercises) >= 0.8 },
  { id: "accuracy_95", name: "شبه مثالي", description: "نسبة صحة أكثر من 95%", emoji: "💎", tier: "diamond",
    condition: s => s.total_exercises >= 20 && (s.total_correct / s.total_exercises) >= 0.95 },
  { id: "level_5", name: "صاعد", description: "الوصول للمستوى 5", emoji: "⭐", tier: "silver",
    condition: s => s.level >= 5 },
  { id: "level_10", name: "النجم", description: "الوصول للمستوى 10", emoji: "🌟", tier: "gold",
    condition: s => s.level >= 10 },
  { id: "xp_1000", name: "ألف نقطة", description: "جمع 1000 نقطة خبرة", emoji: "💫", tier: "silver",
    condition: s => s.xp >= 1000 },
];

// ── Student ID (anonymous, localStorage-based) ─────
export function getStudentId(): string {
  let id = localStorage.getItem("qed_student_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("qed_student_id", id);
  }
  return id;
}

// ── Load / Save progress ───────────────────────────
export async function loadProgress(): Promise<StudentStats> {
  const studentId = getStudentId();
  const { data } = await (supabase as any)
    .from("student_progress")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (data) {
    // Check streak continuity
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let streak = data.streak_days || 0;
    
    if (data.last_active_date !== today && data.last_active_date !== yesterday) {
      streak = 0; // streak broken
    }

    return {
      xp: data.xp,
      level: data.level,
      streak_days: streak,
      total_exercises: data.total_exercises,
      total_correct: data.total_correct,
      badges: (data.badges as string[]) || [],
      mastery: (data.mastery as Record<string, number>) || {},
    };
  }

  // New student
  return {
    xp: 0, level: 1, streak_days: 0,
    total_exercises: 0, total_correct: 0,
    badges: [], mastery: {},
  };
}

export async function saveProgress(stats: StudentStats): Promise<void> {
  const studentId = getStudentId();
  const today = new Date().toISOString().slice(0, 10);

  await (supabase as any).from("student_progress").upsert({
    student_id: studentId,
    xp: stats.xp,
    level: stats.level,
    streak_days: stats.streak_days,
    last_active_date: today,
    total_exercises: stats.total_exercises,
    total_correct: stats.total_correct,
    badges: stats.badges as any,
    mastery: stats.mastery as any,
    updated_at: new Date().toISOString(),
  }, { onConflict: "student_id" });
}

// ── Record activity ────────────────────────────────
export async function logActivity(action: string, xpEarned: number, metadata: Record<string, any> = {}): Promise<void> {
  await (supabase as any).from("student_activity_log").insert({
    student_id: getStudentId(),
    action,
    xp_earned: xpEarned,
    metadata: metadata as any,
  });
}

// ── Process exercise completion ────────────────────
export interface XPEvent {
  type: string;
  xp: number;
  label: string;
}

export async function recordExerciseCompletion(correct: boolean, patternId?: string): Promise<{
  stats: StudentStats;
  events: XPEvent[];
  newBadges: Badge[];
}> {
  const stats = await loadProgress();
  const events: XPEvent[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Base XP
  const baseXP = correct ? XP_REWARDS.exercise_correct : XP_REWARDS.exercise_solved;
  events.push({ type: "exercise", xp: baseXP, label: correct ? "حل صحيح" : "محاولة حل" });
  stats.xp += baseXP;
  stats.total_exercises += 1;
  if (correct) stats.total_correct += 1;

  // First exercise bonus
  if (stats.total_exercises === 1) {
    events.push({ type: "first", xp: XP_REWARDS.first_exercise, label: "أول تمرين!" });
    stats.xp += XP_REWARDS.first_exercise;
  }

  // Streak management
  const lastDate = localStorage.getItem("qed_last_active");
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  
  if (lastDate === yesterday) {
    stats.streak_days += 1;
  } else if (lastDate !== today) {
    stats.streak_days = 1;
  }
  localStorage.setItem("qed_last_active", today);

  // Streak bonuses
  if (stats.streak_days === 3) {
    events.push({ type: "streak", xp: XP_REWARDS.streak_bonus_3, label: "🔥 سلسلة 3 أيام!" });
    stats.xp += XP_REWARDS.streak_bonus_3;
  }
  if (stats.streak_days === 7) {
    events.push({ type: "streak", xp: XP_REWARDS.streak_bonus_7, label: "🔥🔥 أسبوع كامل!" });
    stats.xp += XP_REWARDS.streak_bonus_7;
  }
  if (stats.streak_days === 30) {
    events.push({ type: "streak", xp: XP_REWARDS.streak_bonus_30, label: "👑 شهر كامل!" });
    stats.xp += XP_REWARDS.streak_bonus_30;
  }

  // Pattern mastery tracking
  if (patternId && correct) {
    const current = stats.mastery[patternId] || 0;
    stats.mastery[patternId] = current + 1;
    if (current + 1 === 5) {
      events.push({ type: "mastery", xp: XP_REWARDS.pattern_mastered, label: "إتقان نمط جديد!" });
      stats.xp += XP_REWARDS.pattern_mastered;
    }
  }

  // Update level
  stats.level = levelFromXP(stats.xp);

  // Check new badges
  const newBadges: Badge[] = [];
  for (const badge of BADGES) {
    if (!stats.badges.includes(badge.id) && badge.condition(stats)) {
      stats.badges.push(badge.id);
      newBadges.push(badge);
    }
  }

  // Save and log
  await saveProgress(stats);
  for (const e of events) {
    await logActivity(e.type, e.xp, { label: e.label });
  }

  return { stats, events, newBadges };
}

// ── Daily challenge ────────────────────────────────
export async function getDailyChallenge(): Promise<{ exerciseId: string; text: string; grade: string; type: string } | null> {
  // Use date as seed for consistent daily selection
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split("-").reduce((a, b) => a + parseInt(b), 0);

  const { count } = await (supabase as any).from("kb_exercises").select("id", { count: "exact", head: true });
  if (!count || count === 0) return null;

  // Use date + a secondary seed to mix it up more if the dataset is small
  const secondarySeed = new Date().getHours(); // Rotate challenge every hour
  const offset = (seed + secondarySeed) % count;
  const { data } = await (supabase as any)
    .from("kb_exercises")
    .select("id, text, grade, type")
    .range(offset, offset)
    .limit(1);

  if (!data || data.length === 0) return null;
  return { exerciseId: data[0].id, text: data[0].text, grade: data[0].grade || "", type: data[0].type || "" };
}

export async function completeDailyChallenge(): Promise<XPEvent> {
  const stats = await loadProgress();
  stats.xp += XP_REWARDS.daily_challenge;
  stats.level = levelFromXP(stats.xp);
  await saveProgress(stats);
  await logActivity("daily_challenge", XP_REWARDS.daily_challenge);
  return { type: "daily", xp: XP_REWARDS.daily_challenge, label: "🎯 تحدي يومي!" };
}
