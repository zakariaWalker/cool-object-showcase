// Admin KB state store — powered by Supabase, multi-country
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Exercise {
  id: string;
  text: string;
  type: string;
  chapter: string;
  grade: string;
  stream: string;
  label: string;
  source: string;
  countryCode: string;
}

export interface Pattern {
  id: string;
  name: string;
  type: string;
  description?: string;
  steps: string[];
  concepts?: string[];
  examples: string[];
  createdAt: string;
}

export interface Deconstruction {
  id: string;
  exerciseId: string;
  patternId: string;
  steps?: string[];
  needs: string[];
  notes: string;
  countryCode: string;
  createdAt: string;
}

export type AdminView = "dashboard" | "classify" | "patterns" | "deconstruct" | "kb" | "viz";

export function useAdminKBStore() {
  const [view, setView] = useState<AdminView>("dashboard");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [deconstructions, setDeconstructions] = useState<Deconstruction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>(() => {
    try { return localStorage.getItem("admin_kb_country") || "DZ"; } catch { return "DZ"; }
  });

  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  useEffect(() => {
    try { localStorage.setItem("admin_kb_country", countryFilter); } catch {}
  }, [countryFilter]);

  // Load all data from Supabase on mount
  useEffect(() => {
    loadFromSupabase();
  }, []);

  async function loadFromSupabase() {
    setLoading(true);
    try {
      const allExercises: any[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("kb_exercises")
          .select("*")
          .order("grade")
          .order("chapter")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allExercises.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const allBreakdowns: any[] = [];
      let bFrom = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("exercise_breakdowns")
          .select("*")
          .order("grade")
          .range(bFrom, bFrom + PAGE - 1);
        if (error) { console.warn("Failed to load exercise_breakdowns:", error); break; }
        if (!data || data.length === 0) break;
        allBreakdowns.push(...data);
        if (data.length < PAGE) break;
        bFrom += PAGE;
      }

      const kbIds = new Set(allExercises.map((e: any) => e.id));

      const breakdownExercises = allBreakdowns
        .filter((b: any) => !kbIds.has(b.id))
        .map((b: any) => ({
          id: b.id,
          text: b.source_text,
          type: b.domain || "unclassified",
          chapter: b.subdomain || "",
          grade: b.grade || "",
          stream: "",
          label: `difficulty:${b.difficulty || 1}`,
          source: b.source_origin || "breakdown",
          countryCode: "DZ",
        }));

      const merged = [
        ...allExercises.map((e: any) => ({
          id: e.id,
          text: e.text,
          type: e.type || "unclassified",
          chapter: e.chapter || "",
          grade: e.grade || "",
          stream: e.stream || "",
          label: e.label || "",
          source: e.source || "",
          countryCode: e.country_code || "DZ",
        })),
        ...breakdownExercises,
      ];

      if (merged.length > 0) {
        setExercises(merged);
        setLoaded(true);
      }

      const allDeconstructions: any[] = [];
      let deconFrom = 0;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("kb_deconstructions")
          .select("*")
          .order("created_at")
          .range(deconFrom, deconFrom + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allDeconstructions.push(...data);
        if (data.length < PAGE) break;
        deconFrom += PAGE;
      }

      const patRes = await (supabase as any).from("kb_patterns").select("*").order("created_at");

      if (patRes.data) {
        setPatterns(patRes.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type || "",
          description: p.description || "",
          steps: Array.isArray(p.steps) ? p.steps : [],
          concepts: Array.isArray(p.concepts) ? p.concepts : [],
          examples: [],
          createdAt: p.created_at,
        })));
      }

      if (allDeconstructions.length > 0) {
        setDeconstructions(allDeconstructions.map((d: any) => ({
          id: d.id,
          exerciseId: d.exercise_id,
          patternId: d.pattern_id,
          steps: Array.isArray(d.steps) ? d.steps : [],
          needs: Array.isArray(d.needs) ? d.needs : [],
          notes: d.notes || "",
          countryCode: d.country_code || "DZ",
          createdAt: d.created_at,
        })));
      }
    } catch (err) {
      console.error("Failed to load KB from Supabase:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter by current country (patterns are shared across countries)
  const countryExercises = exercises.filter(e => e.countryCode === countryFilter);
  const countryDeconstructions = deconstructions.filter(d => d.countryCode === countryFilter);

  // Cycle counts are computed by the consumer using country_grades metadata.
  // We just expose totals here; the dashboard hook fills in cycle aggregation.
  const stats = {
    total: countryExercises.length,
    classified: countryExercises.filter(e => e.type !== "other" && e.type !== "unclassified").length,
    deconstructed: countryDeconstructions.length,
    patternCount: patterns.length,
    cycleCounts: {} as Record<string, number>, // populated by the consumer (AdminDashboard) via useCountryGrades
    progress: countryExercises.length ? Math.round((countryDeconstructions.length / countryExercises.length) * 100) : 0,
  };

  const filteredExercises = countryExercises.filter(e => {
    if (gradeFilter && e.grade !== gradeFilter) return false;
    if (searchQuery && !e.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const classifyExercise = useCallback(async (id: string, type: string) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, type } : e));
    if (isUUID(id)) {
      await (supabase as any).from("kb_exercises").update({ type }).eq("id", id);
    }
  }, []);

  const addPattern = useCallback(async (pattern: Pattern) => {
    setPatterns(prev => [...prev, pattern]);
    const { data } = await (supabase as any).from("kb_patterns").insert({
      name: pattern.name,
      type: pattern.type,
      description: pattern.description || "",
      steps: pattern.steps,
      concepts: pattern.concepts || [],
    }).select("id").single();
    if (data?.id) {
      setPatterns(prev => prev.map(p => p.id === pattern.id ? { ...p, id: data.id } : p));
    }
  }, []);

  const updatePattern = useCallback(async (id: string, updates: Partial<Pattern>) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (!isUUID(id)) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.concepts !== undefined) dbUpdates.concepts = updates.concepts;
    await (supabase as any).from("kb_patterns").update(dbUpdates).eq("id", id);
  }, []);

  const deletePattern = useCallback(async (id: string) => {
    setPatterns(prev => prev.filter(p => p.id !== id));
    if (isUUID(id)) await (supabase as any).from("kb_patterns").delete().eq("id", id);
  }, []);

  const addDeconstruction = useCallback(async (decon: Deconstruction) => {
    setDeconstructions(prev => [...prev, decon]);
    if (!isUUID(decon.exerciseId) || (decon.patternId && !isUUID(decon.patternId))) return;
    const { data } = await (supabase as any).from("kb_deconstructions").insert({
      exercise_id: decon.exerciseId,
      pattern_id: decon.patternId,
      steps: decon.steps || [],
      needs: decon.needs,
      notes: decon.notes,
      country_code: decon.countryCode || countryFilter,
    }).select("id").single();
    if (data?.id) {
      setDeconstructions(prev => prev.map(d => d.id === decon.id ? { ...d, id: data.id } : d));
    }
  }, [countryFilter]);

  const updateDeconstruction = useCallback(async (id: string, updates: Partial<Deconstruction>) => {
    setDeconstructions(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (!isUUID(id)) return;
    const dbUpdates: any = {};
    if (updates.patternId !== undefined) dbUpdates.pattern_id = updates.patternId;
    if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
    if (updates.needs !== undefined) dbUpdates.needs = updates.needs;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await (supabase as any).from("kb_deconstructions").update(dbUpdates).eq("id", id);
  }, []);

  const deleteDeconstruction = useCallback(async (id: string) => {
    setDeconstructions(prev => prev.filter(d => d.id !== id));
    if (isUUID(id)) await (supabase as any).from("kb_deconstructions").delete().eq("id", id);
  }, []);

  const importData = useCallback((data: { exercises?: Exercise[]; patterns?: Pattern[]; deconstructions?: Deconstruction[] }) => {
    const idMap = new Map<string, string>();
    const resolveId = (oldId: string) => {
      if (!oldId || isUUID(oldId)) return oldId;
      if (!idMap.has(oldId)) idMap.set(oldId, crypto.randomUUID());
      return idMap.get(oldId)!;
    };

    if (data.exercises) {
      const mapped = data.exercises.map(e => ({ ...e, id: resolveId(e.id), countryCode: e.countryCode || countryFilter }));
      setExercises(prev => [...prev.filter(p => !mapped.some(m => m.id === p.id)), ...mapped]);
      setLoaded(true);
    }
    if (data.patterns) {
      const mapped = data.patterns.map(p => ({ ...p, id: resolveId(p.id) }));
      setPatterns(prev => [...prev.filter(p => !mapped.some(m => m.id === p.id)), ...mapped]);
    }
    if (data.deconstructions) {
      const mapped = data.deconstructions.map(d => ({
        ...d,
        id: resolveId(d.id),
        exerciseId: resolveId(d.exerciseId),
        patternId: resolveId(d.patternId),
        countryCode: d.countryCode || countryFilter,
      }));
      setDeconstructions(prev => [...prev.filter(d => !mapped.some(m => m.id === d.id)), ...mapped]);
    }
  }, [countryFilter]);

  const saveAllToDB = useCallback(async () => {
    setLoading(true);
    try {
      const BATCH = 500;

      if (exercises.length > 0) {
        for (let i = 0; i < exercises.length; i += BATCH) {
          const batch = exercises.slice(i, i + BATCH).map(e => {
            const row: any = {
              text: e.text,
              type: e.type,
              chapter: e.chapter,
              grade: e.grade,
              stream: e.stream,
              label: e.label,
              source: e.source,
              country_code: e.countryCode || "DZ",
            };
            if (isUUID(e.id)) row.id = e.id;
            return row;
          });
          const toUpdate = batch.filter(r => r.id);
          const toInsert = batch.filter(r => !r.id);

          if (toUpdate.length > 0) {
            const { error } = await (supabase as any).from("kb_exercises").upsert(toUpdate, { onConflict: "id" });
            if (error) { console.error("kb_exercises upsert error:", error); throw error; }
          }
          if (toInsert.length > 0) {
            const { error } = await (supabase as any).from("kb_exercises").insert(toInsert);
            if (error) { console.error("kb_exercises insert error:", error); throw error; }
          }
        }
      }

      if (patterns.length > 0) {
        for (let i = 0; i < patterns.length; i += BATCH) {
          const batch = patterns.slice(i, i + BATCH).map(p => {
            const row: any = {
              name: p.name,
              type: p.type,
              description: p.description || "",
              steps: p.steps,
              concepts: p.concepts || [],
            };
            if (isUUID(p.id)) row.id = p.id;
            return row;
          });
          const toUpdate = batch.filter(r => r.id);
          const toInsert = batch.filter(r => !r.id);

          if (toUpdate.length > 0) {
            const { error } = await (supabase as any).from("kb_patterns").upsert(toUpdate, { onConflict: "id" });
            if (error) { console.error("kb_patterns upsert error:", error); throw error; }
          }
          if (toInsert.length > 0) {
            const { error } = await (supabase as any).from("kb_patterns").insert(toInsert);
            if (error) { console.error("kb_patterns insert error:", error); throw error; }
          }
        }
      }

      if (deconstructions.length > 0) {
        for (let i = 0; i < deconstructions.length; i += BATCH) {
          const batch = deconstructions.slice(i, i + BATCH)
            .filter(d => isUUID(d.exerciseId) && (!d.patternId || isUUID(d.patternId)))
            .map(d => {
              const row: any = {
                exercise_id: d.exerciseId,
                pattern_id: d.patternId,
                steps: d.steps || [],
                needs: d.needs,
                notes: d.notes,
                country_code: d.countryCode || "DZ",
              };
              if (isUUID(d.id)) row.id = d.id;
              return row;
            });

          const toUpdate = batch.filter(r => r.id);
          const toInsert = batch.filter(r => !r.id);

          if (toUpdate.length > 0) {
            const { error } = await (supabase as any).from("kb_deconstructions").upsert(toUpdate, { onConflict: "id" });
            if (error) { console.error("kb_deconstructions upsert error:", error); throw error; }
          }
          if (toInsert.length > 0) {
            const { error } = await (supabase as any).from("kb_deconstructions").insert(toInsert);
            if (error) { console.error("kb_deconstructions insert error:", error); throw error; }
          }
        }
      }

      console.log("✅ All KB data saved to DB");
      return true;
    } catch (err) {
      console.error("Failed to save KB to DB:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [exercises, patterns, deconstructions]);

  const exportData = useCallback(() => {
    return {
      exercises: countryExercises,
      patterns,
      deconstructions: countryDeconstructions,
    };
  }, [countryExercises, patterns, countryDeconstructions]);

  const resetAll = useCallback(() => {
    setExercises([]);
    setPatterns([]);
    setDeconstructions([]);
    setLoaded(false);
  }, []);

  return {
    view, setView,
    exercises: countryExercises, // expose country-filtered exercises
    allExercises: exercises,     // raw for cross-country tooling
    setExercises, loaded, setLoaded, loading,
    patterns,
    deconstructions: countryDeconstructions,
    allDeconstructions: deconstructions,
    stats, filteredExercises,
    gradeFilter, setGradeFilter,
    searchQuery, setSearchQuery,
    countryFilter, setCountryFilter,
    classifyExercise, addPattern, updatePattern, deletePattern,
    addDeconstruction, updateDeconstruction, deleteDeconstruction,
    importData, exportData, resetAll, saveAllToDB,
    reload: loadFromSupabase,
  };
}
