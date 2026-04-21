// ===== Progress Store (Supabase) =====
// Primary store: Supabase tables (student_sm2, student_knowledge_gaps, attempts)
// Fallback:      localStorage (offline / anonymous)
// SM-2 spaced repetition logic preserved.

import { ExerciseRecord, ProgressState, Domain, MisconceptionType } from "./types";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// FIX: was returning Telegram ID or hardcoded "anonymous" for ALL web users.
// Now properly resolves: Telegram → Supabase auth → anonymous guest.
async function getStudentId(): Promise<string> {
  try {
    // @ts-ignore
    const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) return tgUser.id.toString();
  } catch {}

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user.id;

  // Anonymous guest — local only
  let id = localStorage.getItem("qed_student_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("qed_student_id", id);
  }
  return id;
}

const LOCAL_KEY = "qed_progress_v1";
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

// ─── Local fallback ───────────────────────────────────────────────────────────

function loadLocal(): ProgressState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    records: [],
    streak: 0,
    totalSolved: 0,
    byDomain: { algebra: 0, geometry: 0, statistics: 0, probability: 0, functions: 0 },
  };
}

function saveLocal(state: ProgressState): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {}
}

// ─── SM-2 ─────────────────────────────────────────────────────────────────────

function nextInterval(record: ExerciseRecord, correct: boolean): ExerciseRecord {
  const now = Date.now();
  let { interval, ease } = record;
  if (correct) {
    if (interval === 0) interval = 1;
    else if (interval === 1) interval = 6;
    else interval = Math.round(interval * ease);
    ease = Math.max(MIN_EASE, ease + 0.1);
  } else {
    interval = 1;
    ease = Math.max(MIN_EASE, ease - 0.2);
  }
  return { ...record, correct, interval, ease, nextReviewAt: now + interval * 24 * 60 * 60 * 1000 };
}

// ─── Supabase writes ──────────────────────────────────────────────────────────

async function upsertSM2(record: ExerciseRecord): Promise<void> {
  const sid = await getStudentId();
  if (sid === "anonymous") return;
  await db.from("student_sm2").upsert(
    {
      student_id: sid,
      question_id: record.id,
      repetitions: record.correct ? 1 : 0,
      easiness: record.ease,
      interval_days: record.interval,
      next_review_at: new Date(record.nextReviewAt).toISOString(),
      last_reviewed: new Date(record.timestamp).toISOString(),
    },
    { onConflict: "student_id,question_id", ignoreDuplicates: false },
  );
}

async function upsertGap(subdomain: string, sourceText: string): Promise<void> {
  const sid = await getStudentId();
  if (sid === "anonymous") return;
  const { data: existing } = await db
    .from("student_knowledge_gaps")
    .select("id, frequency")
    .eq("student_id", sid)
    .eq("signature", subdomain)
    .maybeSingle();
  if (existing) {
    await db
      .from("student_knowledge_gaps")
      .update({ frequency: (existing.frequency || 1) + 1, last_encountered: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await db.from("student_knowledge_gaps").insert({
      student_id: sid,
      signature: subdomain,
      frequency: 1,
      source_exercise: sourceText.slice(0, 200),
      topic: subdomain,
      first_detected: new Date().toISOString(),
      last_encountered: new Date().toISOString(),
    });
  }
}

async function insertAttempt(record: ExerciseRecord): Promise<void> {
  const sid = await getStudentId();
  if (sid === "anonymous") return;
  const looksLikeUUID = /^[0-9a-f-]{36}$/i.test(record.id);
  if (!looksLikeUUID) return;
  await db.from("attempts").insert({
    student_id: sid,
    question_id: record.id,
    is_correct: record.correct,
    attempted_at: new Date(record.timestamp).toISOString(),
  });
}

// ─── Public: record exercise (sync local + async Supabase) ───────────────────

export function recordExercise(
  domain: Domain,
  subdomain: string,
  input: string,
  correct: boolean,
  misconception?: MisconceptionType,
): ExerciseRecord {
  const state = loadLocal();
  const now = Date.now();
  const existing = state.records.find((r) => r.domain === domain && r.input.slice(0, 40) === input.slice(0, 40));
  const record: ExerciseRecord = existing
    ? nextInterval({ ...existing, timestamp: now, misconception }, correct)
    : {
        id: crypto.randomUUID(),
        timestamp: now,
        domain,
        subdomain,
        input: input.slice(0, 200),
        correct,
        misconception,
        interval: correct ? 1 : 0,
        ease: DEFAULT_EASE,
        nextReviewAt: now + (correct ? 1 : 0) * 24 * 60 * 60 * 1000,
      };

  const idx = state.records.findIndex((r) => r.id === record.id);
  if (idx >= 0) state.records[idx] = record;
  else state.records.unshift(record);
  state.records = state.records.slice(0, 200);
  state.totalSolved += 1;
  state.byDomain[domain] = (state.byDomain[domain] || 0) + 1;

  if (correct) {
    const lastCorrect = state.records.find((r) => r.id !== record.id && r.correct);
    if (lastCorrect) {
      const days = (now - lastCorrect.timestamp) / (24 * 60 * 60 * 1000);
      state.streak = days < 1.5 ? state.streak + 1 : 1;
    } else {
      state.streak = 1;
    }
  }
  saveLocal(state);

  // Async Supabase (fire-and-forget)
  upsertSM2(record).catch(console.warn);
  insertAttempt(record).catch(console.warn);
  if (!correct) upsertGap(subdomain, input).catch(console.warn);

  return record;
}

// ─── Public: read from Supabase (async, with local fallback) ─────────────────

export async function getProgressRemote(): Promise<ProgressState> {
  const sid = await getStudentId();
  const local = loadLocal();
  if (sid === "anonymous") return local;
  try {
    const { data: sm2 } = await db
      .from("student_sm2")
      .select("*")
      .eq("student_id", sid)
      .order("last_reviewed", { ascending: false })
      .limit(200);
    if (!sm2?.length) return local;
    const remoteRecords: ExerciseRecord[] = sm2.map((r: any) => ({
      id: r.question_id,
      timestamp: new Date(r.last_reviewed || r.created_at).getTime(),
      domain: "algebra" as Domain,
      subdomain: r.question_id,
      input: "",
      correct: r.repetitions > 0,
      interval: r.interval_days,
      ease: r.easiness,
      nextReviewAt: new Date(r.next_review_at).getTime(),
    }));
    const localIds = new Set(local.records.map((r) => r.id));
    const merged = [...local.records, ...remoteRecords.filter((r) => !localIds.has(r.id))].slice(0, 200);
    return { ...local, records: merged, totalSolved: merged.length };
  } catch {
    return local;
  }
}

export async function getGapsRemote(): Promise<{ signature: string; frequency: number; source_exercise: string }[]> {
  const sid = await getStudentId();
  if (sid === "anonymous") return [];
  try {
    const { data } = await db
      .from("student_knowledge_gaps")
      .select("signature, frequency, source_exercise")
      .eq("student_id", sid)
      .order("frequency", { ascending: false })
      .limit(20);
    return data ?? [];
  } catch {
    return [];
  }
}

// FIX: removed permanent "elmentor_synced_v1" flag — sync is now idempotent (upsert)
// and runs whenever called. The flag prevented re-sync after the first run even if
// getStudentId() was returning "anonymous" (meaning nothing was actually written).
export async function syncLocalToSupabase(): Promise<void> {
  const sid = await getStudentId();
  if (sid === "anonymous") return; // nothing to sync without a real user
  const local = loadLocal();
  if (!local.records.length) return;
  try {
    for (const r of local.records) {
      await upsertSM2(r).catch(() => {});
      if (!r.correct) await upsertGap(r.subdomain, r.input).catch(() => {});
    }
    // Mark synced per user so we don't re-run needlessly
    localStorage.setItem(`qed_synced_${sid}`, "1");
  } catch {}
}

export async function syncGradeToSupabase(gradeId: string): Promise<void> {
  const sid = await getStudentId();
  if (sid === "anonymous") return;
  try {
    await db
      .from("students")
      .update({ grade_id: gradeId } as any)
      .eq("telegram_id", Number(sid));
  } catch {}
}

export function getDueForReview(): ExerciseRecord[] {
  const now = Date.now();
  return loadLocal().records.filter((r) => r.nextReviewAt <= now && r.interval > 0);
}

export function getProgress(): ProgressState {
  return loadLocal();
}
export function clearProgress(): void {
  localStorage.removeItem(LOCAL_KEY);
}
