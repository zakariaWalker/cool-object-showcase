// ===== Telegram Mini App (TMA) Startup Helper =====
// Reads the question ID from the URL hash (#/tma/<id>), Telegram initData,
// or a sessionStorage cache, then fetches from /api/question/{id} and returns
// an ImadrassaExercise ready for ExerciseWorkspace to consume.

import { ImadrassaExercise } from "@/engine/dataset-types";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe: {
          start_param?: string;
          user?: { id: number; first_name: string };
        };
        themeParams: Record<string, string>;
        colorScheme: "light" | "dark";
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
      };
    };
  }
}

/**
 * Returns true when running inside a Telegram Mini App context.
 */
export function isTMA(): boolean {
  return !!(window?.Telegram?.WebApp?.initDataUnsafe);
}

/**
 * Initialises the Telegram SDK (must be called as early as possible).
 * Expands the app to full height and signals readiness.
 */
export function initTMA(): void {
  const tg = window?.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
}

// sessionStorage key used to survive Telegram SDK hash-cleanup cycles
const SESSION_KEY = "_tma_question_id";

/**
 * Inner helper: reads the ID purely from the current URL — no side effects.
 * Priority:
 *  1. ?tma_id= query param          (WebAppInfo button — canonical, no-hash format)
 *  2. window.Telegram.WebApp.initDataUnsafe.start_param  (deep-link opens)
 *  3. Hash path  #/tma/<id>          (legacy / manual deep links)
 *  4. ?id= query param               (dev convenience / older URLs)
 *  5. Regular pathname /tma/<id>     (direct URL / server-side catch)
 */
function _resolveFromUrl(): string | null {
  const clean = (id: string) => id.replace(/^gen_/, "").trim();

  const params = new URLSearchParams(location.search);

  // 1. ?tma_id= — sent by build_web_app_button, survives Telegram URL processing
  let tmaId = params.get("tma_id");
  if (!tmaId) {
    // Telegram sometimes puts the query string inside the hash part 
    // e.g., https://domain.com/#tgWebAppData=...&tma_id=123
    const hashParams = new URLSearchParams(location.hash.substring(1));
    tmaId = hashParams.get("tma_id");
  }
  if (tmaId) return clean(tmaId);

  // 2. Telegram start_param (deep links via t.me/bot?startapp=ID)
  const tg = window?.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.start_param) {
    return clean(tg.initDataUnsafe.start_param);
  }

  // 3. Hash path: #/tma/<id>  — legacy hash-based routing
  const hash = location.hash.replace(/^#\/?/, "");
  const hashParts = hash.split(/[/?&]/); // Split by slash or query delimiters inside the hash
  const tmaHashIdx = hashParts.indexOf("tma");
  if (tmaHashIdx !== -1 && hashParts[tmaHashIdx + 1]) {
    return clean(hashParts[tmaHashIdx + 1]);
  }

  // 4. ?id= query param — dev convenience or legacy URLs
  const idParam = params.get("id");
  if (idParam) return clean(idParam);

  // 5. Pathname: /tma/<id> — when server catches the route directly
  const pathParts = location.pathname.split("/");
  const tmaPathIdx = pathParts.indexOf("tma");
  if (tmaPathIdx !== -1 && pathParts[tmaPathIdx + 1]) {
    return clean(pathParts[tmaPathIdx + 1]);
  }

  return null;
}

/**
 * Resolves the current question ID.
 *
 * Reads from the URL first. If found, persists to sessionStorage so that
 * subsequent mounts (caused by Telegram SDK hash-cleanup firing a hashchange
 * that briefly routes to NotFound before landing back on ExercisePage) can
 * still retrieve the ID even after the hash has been modified.
 *
 * The cache is intentionally scoped to the session (tab lifetime) so that
 * opening a second exercise in a new tab always gets its own fresh ID.
 */
export function resolveQuestionId(): string | null {
  return _resolveFromUrl();
}

/**
 * Fetches question data from the FastAPI backend and returns it shaped as
 * an ImadrassaExercise ready for ExerciseWorkspace to consume.
 *
 * VITE_API_BASE should be empty ("") when the SPA is served from the same
 * origin as FastAPI (production). Set it to http://localhost:8000 for dev.
 */
export async function loadQuestionFromTMA(): Promise<ImadrassaExercise | null> {
  const questionId = resolveQuestionId();
  if (!questionId) return null;

  const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
  try {
    const res = await fetch(`${apiBase}/api/question/${questionId}`);
    if (!res.ok) {
      console.warn(`[TMA] /api/question/${questionId} returned ${res.status}`);
      return null;
    }
    return res.json() as Promise<ImadrassaExercise>;
  } catch (err) {
    console.error("[TMA] Failed to load question:", err);
    return null;
  }
}

// ─── localStorage ↔ Supabase Sync ────────────────────────────────────────────

/**
 * Syncs TMA localStorage data (progress, grade, gaps) with Supabase.
 * Call once on TMA init after Telegram user ID is available.
 * Also applies server-side grade and gaps back to localStorage.
 */
export async function syncStudentData(): Promise<void> {
  try {
    const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user;
    const tgId = tgUser?.id;
    if (!tgId) return;  // not in Telegram context

    const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

    // Read local data
    const grade = (() => { try { return localStorage.getItem("elmentor_grade") || ""; } catch { return ""; } })();

    const attempts: { subdomain: string; correct: boolean; ts: number }[] = [];
    try {
      const raw = localStorage.getItem("qed_progress_v1");
      if (raw) {
        const prog = JSON.parse(raw);
        for (const r of (prog.records || []).slice(-100)) {
          attempts.push({ subdomain: r.subdomain, correct: r.correct, ts: r.timestamp });
        }
      }
    } catch {}

    const gaps: { concept: string; frequency: number }[] = [];
    try {
      const raw = localStorage.getItem("qed_knowledge_base");
      if (raw) {
        const kb = JSON.parse(raw);
        for (const g of (kb.learningGaps || []).slice(0, 30)) {
          gaps.push({ concept: g.signature, frequency: g.frequency });
        }
      }
    } catch {}

    // POST to backend
    const res = await fetch(`${apiBase}/api/student/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tg_id: String(tgId), grade, attempts, gaps }),
    });

    if (!res.ok) return;
    const data = await res.json();

    // Apply server grade back to localStorage
    if (data.grade && !grade) {
      try { localStorage.setItem("elmentor_grade", data.grade); } catch {}
    }

    // Apply server gaps back to KB
    if (data.server_gaps?.length > 0) {
      try {
        const raw = localStorage.getItem("qed_knowledge_base");
        const kb = raw ? JSON.parse(raw) : { learningGaps: [] };
        const existing = new Set((kb.learningGaps || []).map((g: any) => g.signature));
        for (const sg of data.server_gaps) {
          if (!existing.has(sg.signature || sg.concept)) {
            kb.learningGaps = kb.learningGaps || [];
            kb.learningGaps.push({
              id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              signature: sg.signature || sg.concept,
              frequency: sg.frequency || 1,
              sourceExercise: "server",
              detectedEntities: [],
            });
          }
        }
        localStorage.setItem("qed_knowledge_base", JSON.stringify(kb));
      } catch {}
    }

    console.log(`[TMA sync] ✓ grade=${data.grade} attempts_saved=${data.attempts_saved}`);
  } catch (e) {
    console.warn("[TMA sync] failed silently:", e);
  }
}
