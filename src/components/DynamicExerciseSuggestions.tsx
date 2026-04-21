// ===== Dynamic Exercise Suggestions =====
// Fetches random exercises from the KB database to show as quick-start cards

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";

interface SuggestedExercise {
  id: string;
  text: string;
  grade: string;
  chapter: string;
  type: string;
  source: string;
}

interface Props {
  onSelectExercise: (exercise: any) => void;
}

const DOMAIN_ICONS: Record<string, { emoji: string; color: string; bg: string }> = {
  equations: { emoji: "🔢", color: "#4F46E5", bg: "#EEF2FF" },
  arithmetic: { emoji: "➕", color: "#2563EB", bg: "#EFF6FF" },
  functions: { emoji: "📈", color: "#E11D48", bg: "#FFF1F2" },
  statistics: { emoji: "📊", color: "#D97706", bg: "#FFFBEB" },
  triangle_circle: { emoji: "📐", color: "#059669", bg: "#ECFDF5" },
  calculus: { emoji: "∫", color: "#7C3AED", bg: "#F5F3FF" },
  number_sets: { emoji: "ℕ", color: "#0891B2", bg: "#ECFEFF" },
  transformations: { emoji: "🔄", color: "#9333EA", bg: "#FAF5FF" },
  unclassified: { emoji: "📝", color: "#6B7280", bg: "#F9FAFB" },
};

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM",
  middle_2: "2AM",
  middle_3: "3AM",
  middle_4: "4AM",
  secondary_1: "1AS",
  secondary_2: "2AS",
  secondary_3: "3AS",
};

const GRADE_CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(GRADE_LABELS).map(([k, v]) => [v, k]),
);

const resolveGrade = (code?: string) => {
  if (!code) return "";
  return GRADE_CODE_TO_KEY[code] || code;
};

export function DynamicExerciseSuggestions({ onSelectExercise }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const { gradeCode } = useUserCurriculum();

  const loadRandomExercises = async () => {
    setLoading(true);
    try {
      const targetGrade = resolveGrade(gradeCode);

      // Build query to get count
      let countQuery = (supabase as any).from("kb_exercises").select("*", { count: "exact", head: true });

      if (targetGrade) {
        countQuery = countQuery.eq("grade", targetGrade);
      }

      const { count } = await countQuery;

      if (!count || count === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Pick 6 random offsets
      const offsets = new Set<number>();
      while (offsets.size < Math.min(6, count)) {
        offsets.add(Math.floor(Math.random() * count));
      }

      const results: SuggestedExercise[] = [];
      for (const offset of offsets) {
        let fetchQuery = (supabase as any).from("kb_exercises").select("id, text, grade, chapter, type, source");

        if (targetGrade) {
          fetchQuery = fetchQuery.eq("grade", targetGrade);
        }

        const { data } = await fetchQuery.range(offset, offset).limit(1);

        if (data && data[0]) {
          results.push({
            id: data[0].id,
            text: data[0].text || "",
            grade: data[0].grade || "",
            chapter: data[0].chapter || "",
            type: data[0].type || "unclassified",
            source: data[0].source || "",
          });
        }
      }
      setSuggestions(results);
    } catch (err) {
      console.error("[DynamicSuggestions]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRandomExercises();
  }, [gradeCode]);

  const handleSelect = (ex: SuggestedExercise) => {
    onSelectExercise({
      url: "",
      title: `${ex.source} — ${ex.chapter}`,
      statement: ex.text,
      questions: [ex.text],
      answers: [],
      _kb: { id: ex.id, type: ex.type, chapter: ex.chapter, grade: ex.grade },
    });
  };

  const gradeLabel = (g: string) => {
    return GRADE_LABELS[g] || g;
  };

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 20, animation: "spin 1s linear infinite" }}>⏳</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div dir="rtl">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 800,
            margin: 0,
            color: "hsl(var(--foreground))",
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          ✨ تمارين مقترحة
        </h3>
        <button
          onClick={loadRandomExercises}
          style={{
            border: "none",
            background: "hsl(var(--primary) / 0.1)",
            color: "hsl(var(--primary))",
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          🔄 تمارين أخرى
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {suggestions.map((ex) => {
          const style = DOMAIN_ICONS[ex.type] || DOMAIN_ICONS.unclassified;
          return (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex)}
              style={{
                textAlign: "right",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${style.color}22`,
                background: style.bg,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${style.color}20`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>{style.emoji}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: style.color,
                    background: `${style.color}15`,
                    padding: "2px 8px",
                    borderRadius: 10,
                  }}
                >
                  {gradeLabel(ex.grade)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#374151",
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                {ex.text.slice(0, 80)}
                {ex.text.length > 80 ? "…" : ""}
              </div>
              <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600 }}>{ex.chapter}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
