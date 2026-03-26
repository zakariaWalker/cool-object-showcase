// Admin KB state store — powered by Supabase
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

  // Load all data from Supabase on mount
  useEffect(() => {
    loadFromSupabase();
  }, []);

  async function loadFromSupabase() {
    setLoading(true);
    try {
      // Paginate exercises to bypass 1000-row limit
      const allExercises: any[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
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

      // Paginate deconstructions too
      const allDeconstructions: any[] = [];
      let deconFrom = 0;
      while (true) {
        const { data, error } = await supabase
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

      const [patRes] = await Promise.all([
        supabase.from("kb_patterns").select("*").order("created_at"),
      ]);

      if (allExercises.length > 0) {
        setExercises(allExercises.map((e: any) => ({
          id: e.id,
          text: e.text,
          type: e.type || "unclassified",
          chapter: e.chapter || "",
          grade: e.grade || "",
          stream: e.stream || "",
          label: e.label || "",
          source: e.source || "",
        })));
        setLoaded(true);
      }

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
          createdAt: d.created_at,
        })));
      }
    } catch (err) {
      console.error("Failed to load KB from Supabase:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: exercises.length,
    classified: exercises.filter(e => e.type !== "other" && e.type !== "unclassified").length,
    deconstructed: deconstructions.length,
    patternCount: patterns.length,
    middleCount: exercises.filter(e => ["middle_1", "middle_2", "middle_3", "middle_4"].includes(e.grade)).length,
    secondaryCount: exercises.filter(e => e.grade?.startsWith("secondary")).length,
    progress: exercises.length ? Math.round((deconstructions.length / exercises.length) * 100) : 0,
  };

  const filteredExercises = exercises.filter(e => {
    if (gradeFilter && e.grade !== gradeFilter) return false;
    if (searchQuery && !e.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const classifyExercise = useCallback(async (id: string, type: string) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, type } : e));
    await supabase.from("kb_exercises").update({ type }).eq("id", id);
  }, []);

  const addPattern = useCallback(async (pattern: Pattern) => {
    setPatterns(prev => [...prev, pattern]);
    await supabase.from("kb_patterns").insert({
      id: pattern.id,
      name: pattern.name,
      type: pattern.type,
      description: pattern.description || "",
      steps: pattern.steps,
      concepts: pattern.concepts || [],
    });
  }, []);

  const updatePattern = useCallback(async (id: string, updates: Partial<Pattern>) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.concepts !== undefined) dbUpdates.concepts = updates.concepts;
    await supabase.from("kb_patterns").update(dbUpdates).eq("id", id);
  }, []);

  const deletePattern = useCallback(async (id: string) => {
    setPatterns(prev => prev.filter(p => p.id !== id));
    await supabase.from("kb_patterns").delete().eq("id", id);
  }, []);

  const addDeconstruction = useCallback(async (decon: Deconstruction) => {
    setDeconstructions(prev => [...prev, decon]);
    await supabase.from("kb_deconstructions").insert({
      exercise_id: decon.exerciseId,
      pattern_id: decon.patternId,
      steps: decon.steps || [],
      needs: decon.needs,
      notes: decon.notes,
    });
  }, []);

  const updateDeconstruction = useCallback(async (id: string, updates: Partial<Deconstruction>) => {
    setDeconstructions(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    const dbUpdates: any = {};
    if (updates.patternId !== undefined) dbUpdates.pattern_id = updates.patternId;
    if (updates.steps !== undefined) dbUpdates.steps = updates.steps;
    if (updates.needs !== undefined) dbUpdates.needs = updates.needs;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    await supabase.from("kb_deconstructions").update(dbUpdates).eq("id", id);
  }, []);

  const deleteDeconstruction = useCallback(async (id: string) => {
    setDeconstructions(prev => prev.filter(d => d.id !== id));
    await supabase.from("kb_deconstructions").delete().eq("id", id);
  }, []);

  const importData = useCallback((data: { exercises?: Exercise[]; patterns?: Pattern[]; deconstructions?: Deconstruction[] }) => {
    if (data.exercises) { setExercises(data.exercises); setLoaded(true); }
    if (data.patterns) setPatterns(prev => [...prev, ...data.patterns!]);
    if (data.deconstructions) setDeconstructions(prev => [...prev, ...data.deconstructions!]);
  }, []);

  const exportData = useCallback(() => {
    return { exercises, patterns, deconstructions };
  }, [exercises, patterns, deconstructions]);

  const resetAll = useCallback(() => {
    setExercises([]);
    setPatterns([]);
    setDeconstructions([]);
    setLoaded(false);
  }, []);

  return {
    view, setView,
    exercises, setExercises, loaded, setLoaded, loading,
    patterns, deconstructions,
    stats, filteredExercises,
    gradeFilter, setGradeFilter,
    searchQuery, setSearchQuery,
    classifyExercise, addPattern, updatePattern, deletePattern,
    addDeconstruction, updateDeconstruction, deleteDeconstruction,
    importData, exportData, resetAll,
    reload: loadFromSupabase,
  };
}
