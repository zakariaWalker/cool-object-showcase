// Dynamic grade loader — every country has its own grade structure.
// Algeria: AP/AM/AS (12 grades). Oman: G1-G12 (no secondary cycle distinction in our model).
// Always read from DB instead of hardcoding country-specific labels.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CountryGrade {
  grade_code: string;
  grade_label_ar: string;
  grade_label_en: string | null;
  cycle: string | null;     // 'primary' | 'middle' | 'secondary' | null
  order_index: number;
}

const cache = new Map<string, CountryGrade[]>();

export function useCountryGrades(countryCode: string) {
  const [grades, setGrades] = useState<CountryGrade[]>(() => cache.get(countryCode) || []);
  const [loading, setLoading] = useState(!cache.has(countryCode));

  useEffect(() => {
    if (!countryCode) return;
    if (cache.has(countryCode)) {
      setGrades(cache.get(countryCode)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("country_grades")
        .select("grade_code, grade_label_ar, grade_label_en, cycle, order_index")
        .eq("country_code", countryCode)
        .order("order_index");
      if (cancelled) return;
      const list: CountryGrade[] = data || [];
      cache.set(countryCode, list);
      setGrades(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [countryCode]);

  // Helpers
  const labelOf = (code: string) => grades.find(g => g.grade_code === code)?.grade_label_ar || code;
  const cycleOf = (code: string) => grades.find(g => g.grade_code === code)?.cycle || null;
  const cycles = Array.from(new Set(grades.map(g => g.cycle).filter(Boolean))) as string[];

  // For backward compat: expose a "short label" (e.g. 1AM, G7)
  const shortLabel = (code: string) => {
    const g = grades.find(x => x.grade_code === code);
    if (!g) return code;
    return g.grade_label_en || g.grade_code;
  };

  return { grades, loading, labelOf, cycleOf, cycles, shortLabel };
}

export const CYCLE_LABELS_AR: Record<string, string> = {
  primary: "ابتدائي",
  middle: "متوسط/إعدادي",
  secondary: "ثانوي",
};
