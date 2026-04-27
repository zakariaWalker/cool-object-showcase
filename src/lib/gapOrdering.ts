// Prerequisite-aware gap ordering.
// Queries kb_skill_dependencies to make sure foundational gaps surface first
// (so a student is not asked to fix "exponent_error" before "arithmetic_error").

import { supabase } from "@/integrations/supabase/client";

export interface RawGap {
  id?: string;
  skill_id?: string | null;
  topic: string;
  severity?: string | null;
  occurrence_count?: number | null;
  misconception_type?: string | null;
}

export interface OrderedGap extends RawGap {
  /** Higher = more foundational (more skills depend on it). */
  prerequisiteWeight: number;
  /** Skill ids that depend on this gap's skill. */
  blocks: string[];
  priorityScore: number;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Re-orders gaps so foundational ones come first.
 * Pulls dependency edges in a single query when possible.
 */
export async function orderGapsByPrerequisites(gaps: RawGap[]): Promise<OrderedGap[]> {
  if (!gaps.length) return [];

  const skillIds = gaps.map((g) => g.skill_id).filter(Boolean) as string[];

  // Map skill_id -> count of skills that depend on it (i.e. how foundational it is)
  const dependents = new Map<string, string[]>();

  if (skillIds.length > 0) {
    const { data, error } = await (supabase as any)
      .from("kb_skill_dependencies")
      .select("from_skill_id, to_skill_id, dependency_type, strength")
      .in("from_skill_id", skillIds);

    if (!error && Array.isArray(data)) {
      for (const edge of data) {
        // from_skill_id is the prerequisite; to_skill_id depends on it
        const list = dependents.get(edge.from_skill_id) ?? [];
        list.push(edge.to_skill_id);
        dependents.set(edge.from_skill_id, list);
      }
    }
  }

  const enriched: OrderedGap[] = gaps.map((g) => {
    const blocks = g.skill_id ? (dependents.get(g.skill_id) ?? []) : [];
    const prereqWeight = blocks.length;
    const sev = SEVERITY_WEIGHT[(g.severity || "medium").toLowerCase()] ?? 2;
    const occ = Math.min(g.occurrence_count ?? 1, 10);
    // Foundational gaps weigh much more than surface ones.
    const priorityScore = prereqWeight * 10 + sev * 3 + occ;
    return { ...g, prerequisiteWeight: prereqWeight, blocks, priorityScore };
  });

  enriched.sort((a, b) => b.priorityScore - a.priorityScore);
  return enriched;
}

/**
 * In-memory fallback when we don't have skill_ids — uses Bloom-level heuristic
 * (lower Bloom = more foundational).
 */
export function orderGapsByBloom<T extends { bloom_level?: number; severity?: string }>(
  gaps: T[],
): T[] {
  return [...gaps].sort((a, b) => {
    const ba = a.bloom_level ?? 3;
    const bb = b.bloom_level ?? 3;
    if (ba !== bb) return ba - bb; // 1=remember first, 6=create last
    const sa = SEVERITY_WEIGHT[(a.severity || "medium").toLowerCase()] ?? 2;
    const sb = SEVERITY_WEIGHT[(b.severity || "medium").toLowerCase()] ?? 2;
    return sb - sa;
  });
}
