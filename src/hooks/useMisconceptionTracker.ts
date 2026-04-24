// ===== Misconception Tracker =====
// Closes the cognitive loop: counts repeated misconceptions per student
// and promotes them to persistent knowledge gaps once a threshold is hit.

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

const LOCAL_KEY = "qed:misconception:counters";

function readCounters(studentId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${studentId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCounters(studentId: string, c: Record<string, number>) {
  try {
    localStorage.setItem(`${LOCAL_KEY}:${studentId}`, JSON.stringify(c));
  } catch { /* quota */ }
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
        data.map(r => [r.misconception_type, r as SkillMap])
      );
    })();
  }, []);

  const track = useCallback(async (m: Misconception) => {
    if (m.type === "correct" || m.type === "unknown") return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const map = mapRef.current?.[m.type];
    if (!map) return null;

    // Increment local counter
    const counters = readCounters(user.id);
    counters[m.type] = (counters[m.type] || 0) + 1;
    writeCounters(user.id, counters);

    if (counters[m.type] < map.threshold) {
      return { promoted: false, count: counters[m.type], threshold: map.threshold };
    }

    // Threshold hit → upsert into student_knowledge_gaps
    const { data: existing } = await supabase
      .from("student_knowledge_gaps")
      .select("id, occurrence_count")
      .eq("student_id", user.id)
      .eq("misconception_type", m.type)
      .eq("topic", map.topic_ar)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("student_knowledge_gaps")
        .update({
          occurrence_count: (existing.occurrence_count || 1) + 1,
          last_occurred_at: new Date().toISOString(),
          severity: map.severity,
          resolved: false,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("student_knowledge_gaps").insert({
        student_id: user.id,
        topic: map.topic_ar,
        severity: map.severity,
        misconception_type: m.type,
        skill_id: map.skill_id,
        occurrence_count: counters[m.type],
        last_occurred_at: new Date().toISOString(),
      });
    }

    // Bump frequency on the linked skill error catalogue (best-effort)
    if (map.skill_id) {
      await supabase.rpc("increment_skill_error_frequency", {
        p_skill_id: map.skill_id,
        p_error_type: m.type,
      }).then(() => {}, () => {/* RPC optional */});
    }

    // Reset local counter so we don't re-promote on every subsequent error
    counters[m.type] = 0;
    writeCounters(user.id, counters);

    return { promoted: true, topic: map.topic_ar, severity: map.severity };
  }, []);

  return { track };
}
