// ===== Learning Path Component — Phase 25 =====
// Shows the student's personalised exercise sequence built from KB gaps.
// Arabic RTL · Tajawal font · Domain-color system

import { useState, useEffect } from "react";

interface PathItem {
  position: number;
  question_id: string;
  concept: string;
  concept_ar: string;
  is_prereq: boolean;
  difficulty: number;
  difficulty_ar: string;
  topic: string;
  reason_ar: string;
}

interface LearningPathData {
  student_id: string;
  path: PathItem[];
  total: number;
  concepts: string[];
}

interface LearningPathProps {
  studentId: string;
  onStartExercise?: (questionId: string, item: PathItem) => void;
}

const DIFF_COLOR: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  2: { bg: "#fefce8", text: "#713f12", border: "#fde047" },
  3: { bg: "#fff1f2", text: "#881337", border: "#fda4af" },
};

export function LearningPath({ studentId, onStartExercise }: LearningPathProps) {
  const [data, setData] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!studentId) return;
    const apiBase = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
    fetch(`${apiBase}/api/learning-path/${studentId}?max_questions=10`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontFamily: "'Tajawal', sans-serif" }}>
      ⏳ جارٍ بناء مسار التعلم...
    </div>
  );

  if (!data || data.total === 0) return (
    <div style={{ padding: 24, fontFamily: "'Tajawal', sans-serif", direction: "rtl" }}>
      <div style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
        🗺️ لا يوجد مسار متاح بعد — أجب على المزيد من التمارين أولاً
      </div>
    </div>
  );

  const prereqs  = data.path.filter(p => p.is_prereq);
  const mainPath = data.path.filter(p => !p.is_prereq);

  return (
    <div style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl", padding: "0 4px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
          🗺️ مسار التعلم الشخصي
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {data.total} تمرين مرتب لعلاج ثغراتك · المفاهيم: {data.concepts.map(c => c.replace(/_/g, " ")).join(" · ")}
        </div>
      </div>

      {/* Prerequisites section */}
      {prereqs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 10 }}>↩️ متطلبات أساسية</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prereqs.map(item => (
              <PathCard
                key={item.question_id}
                item={item}
                isActive={activeIdx === item.position - 1}
                onToggle={() => setActiveIdx(activeIdx === item.position - 1 ? null : item.position - 1)}
                onStart={onStartExercise}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main gap path */}
      {mainPath.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 10 }}>🎯 تمارين الثغرة</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mainPath.map(item => (
              <PathCard
                key={item.question_id}
                item={item}
                isActive={activeIdx === item.position - 1}
                onToggle={() => setActiveIdx(activeIdx === item.position - 1 ? null : item.position - 1)}
                onStart={onStartExercise}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: 10, fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center" }}>
        💡 أكمل المسار بالترتيب للحصول على أفضل النتائج
      </div>
    </div>
  );
}

function PathCard({ item, isActive, onToggle, onStart }: {
  item: PathItem;
  isActive: boolean;
  onToggle: () => void;
  onStart?: (qId: string, item: PathItem) => void;
}) {
  const diff = DIFF_COLOR[item.difficulty] || DIFF_COLOR[1];

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: `1px solid ${isActive ? "#7c3aed" : "var(--color-border-tertiary)"}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "border-color .15s",
      }}
    >
      {/* Row */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }}
      >
        {/* Position badge */}
        <div style={{
          minWidth: 28, height: 28, borderRadius: "50%",
          background: isActive ? "#7c3aed" : "var(--color-background-secondary)",
          color: isActive ? "#fff" : "var(--color-text-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {item.position}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>
            {item.concept_ar}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.reason_ar}
          </div>
        </div>

        {/* Difficulty chip */}
        <span style={{
          fontSize: 10, fontWeight: 600,
          background: diff.bg, color: diff.text, border: `1px solid ${diff.border}`,
          padding: "2px 8px", borderRadius: 10, flexShrink: 0,
        }}>
          {item.difficulty_ar}
        </span>

        <span style={{ fontSize: 11, color: "#9ca3af" }}>{isActive ? "▲" : "▼"}</span>
      </div>

      {/* Expanded */}
      {isActive && (
        <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--color-border-tertiary)" }}>
          {item.topic && (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 8 }}>
              الموضوع: {item.topic}
            </div>
          )}
          {onStart && (
            <button
              onClick={() => onStart(item.question_id, item)}
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", width: "100%",
              }}
            >
              ▶️ ابدأ هذا التمرين
            </button>
          )}
        </div>
      )}
    </div>
  );
}
