// Migrates anonymous diagnostic/gap data into the authenticated user account.
// Call this once right after a successful sign-in or sign-up.

import { supabase } from "@/integrations/supabase/client";
import { clearAnonymousId } from "./anonymousId";
import { trackEvent } from "./funnelTracking";

const FLAG_KEY = "mathkb_anon_migrated_for";

interface MigrationResult {
  ok: boolean;
  attempts_moved?: number;
  gaps_moved?: number;
  misconceptions_moved?: number;
  skipped?: boolean;
  error?: string;
}

/**
 * Claims the anonymous trail (stored in localStorage) for the currently
 * logged-in user. Idempotent: only runs once per user per browser.
 */
export async function migrateAnonymousDataIfNeeded(userId: string): Promise<MigrationResult | null> {
  if (typeof window === "undefined") return null;

  // Check if we already migrated for this user in this browser
  const alreadyMigratedFor = localStorage.getItem(FLAG_KEY);
  if (alreadyMigratedFor === userId) return { ok: true, skipped: true };

  const anonymousId = localStorage.getItem("mathkb_anon_id");
  if (!anonymousId || anonymousId === userId) {
    localStorage.setItem(FLAG_KEY, userId);
    return { ok: true, skipped: true };
  }

  try {
    const { data, error } = await (supabase as any).rpc("migrate_anonymous_data", {
      _anonymous_id: anonymousId,
    });
    if (error) {
      console.warn("[migrate] RPC error:", error.message);
      return { ok: false, error: error.message };
    }
    // Mark done & clear the anonymous trail
    localStorage.setItem(FLAG_KEY, userId);
    clearAnonymousId();
    console.log("[migrate] anonymous data merged:", data);
    // Funnel: signup conversion (anonymous → authed with carried-over data)
    const result = data as MigrationResult;
    if (result?.ok && !result.skipped) {
      trackEvent("anonymous_data_migrated", {
        attempts_moved: result.attempts_moved ?? 0,
        gaps_moved: result.gaps_moved ?? 0,
        misconceptions_moved: result.misconceptions_moved ?? 0,
      });
      // If user actually had a diagnostic trail, this signup came from the gate
      if ((result.attempts_moved ?? 0) > 0 || (result.gaps_moved ?? 0) > 0) {
        trackEvent("signup_completed_from_gate", {
          attempts: result.attempts_moved ?? 0,
          gaps: result.gaps_moved ?? 0,
        });
      }
    }
    return result;
  } catch (e) {
    console.warn("[migrate] exception:", e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
