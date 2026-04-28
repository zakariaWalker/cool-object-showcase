// Lightweight conversion-funnel tracker.
// Writes to public.funnel_events. Safe for anonymous + authed users.
// All calls are fire-and-forget — never throw, never block UI.

import { supabase } from "@/integrations/supabase/client";
import { getAnonymousId } from "@/lib/anonymousId";

const SESSION_KEY = "mathkb_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "no-session";
  }
}

export type FunnelEvent =
  | "diagnostic_viewed"
  | "diagnostic_started"
  | "diagnostic_completed"
  | "diagnostic_abandoned"
  | "gaps_viewed"
  | "soft_gate_shown"
  | "signup_cta_clicked"
  | "signup_completed_from_gate"
  | "gap_retest_clicked"
  | "adaptive_round_clicked"
  | "anonymous_data_migrated";

export async function trackEvent(
  event: FunnelEvent,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const anonId = user ? null : getAnonymousId();

    await (supabase as any).from("funnel_events").insert({
      event_name: event,
      anonymous_id: anonId,
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      properties,
    });
  } catch {
    /* never throw from analytics */
  }
}
