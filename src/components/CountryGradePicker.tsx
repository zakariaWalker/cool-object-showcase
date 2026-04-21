// Reusable picker: country → dynamic grades (loaded from `country_grades`).
// Used in Auth signup and in the Onboarding gate.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCountryGrades, CYCLE_LABELS_AR } from "@/hooks/useCountryGrades";
import { Loader2 } from "lucide-react";

interface Country {
  code: string;
  name_ar: string;
  flag_emoji: string | null;
}

interface Props {
  countryCode: string;
  gradeCode: string;
  onChange: (countryCode: string, gradeCode: string) => void;
  compact?: boolean;
}

export function CountryGradePicker({ countryCode, gradeCode, onChange, compact }: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const { grades, loading: loadingGrades, cycles } = useCountryGrades(countryCode);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("countries")
        .select("code, name_ar, flag_emoji")
        .eq("is_active", true)
        .order("name_ar");
      setCountries(data || []);
      setLoadingCountries(false);
    })();
  }, []);

  // When cycles or grades change, pick a sensible default grade if none set
  useEffect(() => {
    if (!gradeCode && grades.length > 0) {
      // Prefer the first middle-cycle grade if any, otherwise first grade
      const middleFirst = grades.find(g => g.cycle === "middle") || grades[0];
      onChange(countryCode, middleFirst.grade_code);
    }
  }, [grades, countryCode, gradeCode, onChange]);

  // Group grades by cycle for nicer UX
  const byCycle: Record<string, typeof grades> = {};
  grades.forEach(g => {
    const k = g.cycle || "other";
    (byCycle[k] = byCycle[k] || []).push(g);
  });

  return (
    <div className="space-y-4">
      {/* Country */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-2 block">🌍 البلد</label>
        {loadingCountries ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل البلدان...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {countries.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => onChange(c.code, "")}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all flex items-center gap-2 ${
                  countryCode === c.code
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/30 text-muted-foreground"
                }`}
              >
                <span className="text-base">{c.flag_emoji || "🏳️"}</span>
                {c.name_ar}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grades grouped by cycle */}
      {countryCode && (
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-2 block">🎓 المستوى الدراسي</label>
          {loadingGrades ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل المستويات...
            </div>
          ) : grades.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد مستويات مسجلة لهذا البلد بعد.</p>
          ) : cycles.length > 1 ? (
            <div className="space-y-3">
              {cycles.map(cyc => (
                <div key={cyc}>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground/70 mb-1.5">
                    {CYCLE_LABELS_AR[cyc] || cyc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(byCycle[cyc] || []).map(g => (
                      <button
                        key={g.grade_code}
                        type="button"
                        onClick={() => onChange(countryCode, g.grade_code)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                          gradeCode === g.grade_code
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {compact ? (g.grade_label_en || g.grade_code) : g.grade_label_ar}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {grades.map(g => (
                <button
                  key={g.grade_code}
                  type="button"
                  onClick={() => onChange(countryCode, g.grade_code)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                    gradeCode === g.grade_code
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {compact ? (g.grade_label_en || g.grade_code) : g.grade_label_ar}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
