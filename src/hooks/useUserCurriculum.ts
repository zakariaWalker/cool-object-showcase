// Single source of truth for: which country + which grade is the current user studying?
// Reads from `profiles.country_code` / `profiles.grade_code`. Falls back to legacy
// `profiles.grade` (Algerian short codes like 4AM) → DZ + that grade.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserCurriculum {
  countryCode: string; // "DZ" | "OM" | ...
  gradeCode: string; // "4AM" | "G7" | ...
  loading: boolean;
  isComplete: boolean; // true when both fields are present
  refresh: () => Promise<void>;
  setCurriculum: (countryCode: string, gradeCode: string) => Promise<void>;
}

const LEGACY_GRADE_MAP: Record<string, string> = {
  middle_1: "1AM",
  middle_2: "2AM",
  middle_3: "3AM",
  middle_4: "4AM",
  secondary_1: "1AS",
  secondary_2: "2AS",
  secondary_3: "3AS",
};

export function useUserCurriculum(): UserCurriculum {
  const [countryCode, setCountryCode] = useState<string>("");
  const [gradeCode, setGradeCode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCountryCode("");
      setGradeCode("");
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("profiles")
      .select("country_code, grade_code")
      .eq("id", user.id)
      .maybeSingle();

    let cc = data?.country_code || "";
    let gc = data?.grade_code || "";

    // Fallback to user_metadata
    if (!gc) {
      const meta = (user.user_metadata || {}) as any;
      if (meta.grade_code) {
        gc = meta.grade_code;
      } else if (meta.grade) {
        gc = LEGACY_GRADE_MAP[meta.grade] || meta.grade;
      }
    }

    if (!cc) {
      const meta = (user.user_metadata || {}) as any;
      if (meta.country_code) {
        cc = meta.country_code;
      }
    }

    if (!cc && gc) cc = "DZ"; // legacy users default to Algeria

    setCountryCode(cc);
    setGradeCode(gc);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => subscription.unsubscribe();
  }, []);

  const setCurriculum = async (cc: string, gc: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("profiles").update({ country_code: cc, grade_code: gc }).eq("id", user.id);
    setCountryCode(cc);
    setGradeCode(gc);
  };

  return {
    countryCode,
    gradeCode,
    loading,
    isComplete: !!countryCode && !!gradeCode,
    refresh: load,
    setCurriculum,
  };
}
