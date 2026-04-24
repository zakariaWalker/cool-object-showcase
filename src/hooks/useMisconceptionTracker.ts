// ===== Misconception Tracker (DB-backed) =====
// Closes the cognitive loop: counts repeated misconceptions per student in the
// database (cross-device) and promotes them to persistent knowledge gaps once
// a threshold defined in misconception_skill_map is hit.

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Misconception } from "@/engine/types";

interface SkillMap {
  misconception_type: string;
  skill_id: string | null;
  skill_name: string;
  topic_ar: string;
  threshold: number;
  severity: string;
}

export function useMisconceptionTracker() {
  const mapRef = useRef<Record<string, SkillMap> | null>(null);

  // Lazy-load the misconception → skill map once
  useEffect(() => {
    if (mapRef.current) return;
    (async () => {
      const { data, error } = await supabase
        .from("misconception_skill_map")
        .select("misconception_type, skill_id, skill_name, topic_ar, threshold, severity");
      if (error || !data) return;
      mapRef.current = Object.fromEntries(
        data.map((r) => [r.misconception_type, r as SkillMap]),
      );
    })();
  }, []);

  /**
   * Records a misconception occurrence in the DB. When the per-student count
   * for that type reaches the configured threshold, promotes it to a persistent
   * knowledge gap and resets the counter.
   */
  const track = useCallback(async (m: Misconception | { type: string }) => {
    const type = (m as any).type as string | undefined;
    if (!type || type === "correct" || type === "unknown") return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const map = mapRef.current?.[type];
    if (!map) return null;

    const studentId = user.id;

    // 1) Atomic-ish increment via upsert: read → +1 → upsert
    const { data: existingCounter } = await (supabase as any)
      .from("misconception_counters")
      .select("count")
      .eq("student_id", studentId)
      .eq("misconception_type", type)
      .maybeSingle();

    const nextCount = (existingCounter?.count || 0) + 1;

    await (supabase as any)
      .from("misconception_counters")
      .upsert(
        {
          student_id: studentId,
          misconception_type: type,
          count: nextCount,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "student_id,misconception_type" },
      );

    if (nextCount < map.threshold) {
      return { promoted: false, count: nextCount, threshold: map.threshold };
    }

    // 2) Threshold hit → upsert into student_knowledge_gaps
    const { data: existingGap } = await supabase
      .from("student_knowledge_gaps")
      .select("id, occurrence_count")
      .eq("student_id", studentId)
      .eq("misconception_type", type)
      .eq("topic", map.topic_ar)
      .maybeSingle();

    if (existingGap) {
      await supabase
        .from("student_knowledge_gaps")
        .update({
          occurrence_count: (existingGap.occurrence_count || 1) + 1,
          last_occurred_at: new Date().toISOString(),
          severity: map.severity,
          resolved: false,
        })
        .eq("id", existingGap.id);
    } else {
      await supabase.from("student_knowledge_gaps").insert({
        student_id: studentId,
        topic: map.topic_ar,
        severity: map.severity,
        misconception_type: type,
        skill_id: map.skill_id,
        occurrence_count: nextCount,
        last_occurred_at: new Date().toISOString(),
      });
    }

    // 3) Reset the counter so we don't re-promote on every subsequent error
    await (supabase as any)
      .from("misconception_counters")
      .update({ count: 0, last_seen_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .eq("misconception_type", type);

    // 4) Bump frequency on kb_skill_errors when we have a skill link (best-effort)
    if (map.skill_id) {
      try {
        const { data: errRow } = await supabase
          .from("kb_skill_errors")
          .select("id, frequency")
          .eq("skill_id", map.skill_id)
          .ilike("error_description", `%${map.topic_ar}%`)
          .maybeSingle();
        if (errRow?.id) {
          await supabase
            .from("kb_skill_errors")
            .update({ frequency: (errRow.frequency || 0) + 1 })
            .eq("id", errRow.id);
        }
      } catch {
        /* non-fatal */
      }
    }

    return {
      promoted: true,
      topic: map.topic_ar,
      severity: map.severity,
      skillId: map.skill_id,
    };
  }, []);

  return { track };
}
