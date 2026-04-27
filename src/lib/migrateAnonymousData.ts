// Migrates anonymous diagnostic/gap data into the authenticated user account.
// Call this once right after a successful sign-in or sign-up.

import { supabase } from "@/integrations/supabase/client";
import { clearAnonymousId } from "./anonymousId";

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
    return data as MigrationResult;
  } catch (e) {
    console.warn("[migrate] exception:", e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
