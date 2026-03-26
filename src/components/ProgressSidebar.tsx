// ===== Progress Sidebar — Student-Friendly Edition =====

import { useMemo } from "react";
import { getProgress, getDueForReview, clearProgress } from "@/engine/progress-store";
import { Domain } from "@/engine/types";
import { motion } from "framer-motion";

const DOMAIN_INFO: Record<Domain, { label: string; colorVar: string; emoji: string }> = {
  algebra:     { label: "الجبر",     colorVar: "--algebra",     emoji: "🔢" },
  geometry:    { label: "الهندسة",   colorVar: "--geometry",    emoji: "📐" },
  statistics:  { label: "الإحصاء",   colorVar: "--statistics",  emoji: "📊" },
  probability: { label: "الاحتمال",  colorVar: "--probability", emoji: "🎲" },
  functions:   { label: "الدوال",    colorVar: "--functions",   emoji: "📈" },
};

interface Props {
  onSelectExercise?: (input: string, domain: Domain) => void;
}

export function ProgressSidebar({ onSelectExercise }: Props) {
  const progress = getProgress();
  const due = getDueForReview();

  const totalByDomain = useMemo(() => {
    const total = progress.totalSolved || 1;
    return (Object.entries(progress.byDomain) as [Domain, number][])
      .filter(([, c]) => c > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([domain, count]) => ({ domain, count, pct: Math.round(count / total * 100) }));
  }, [progress]);

  return (
    <div dir="rtl" style={{
      width: 220,
      flexShrink: 0,
      borderRight: "1px solid hsl(var(--border))",
      background: "white",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 14px 12px",
        background: "linear-gradient(135deg, #FFF7ED, #FFFBEB)",
        borderBottom: "1px solid hsl(var(--border))",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "hsl(var(--foreground))", margin: 0, fontFamily: "'Tajawal', sans-serif" }}>
            📊 التقدم
          </h2>
          {progress.totalSolved > 0 && (
            <button
              onClick={() => { clearProgress(); window.location.reload(); }}
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              مسح
            </button>
          )}
        </div>

        {/* Streak display */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "white",
          borderRadius: 10,
          padding: "10px 12px",
          border: "1px solid #FDE68A",
        }}>
          <div style={{ fontSize: 28 }}>🔥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#D97706", lineHeight: 1 }}>
              {progress.streak}
            </div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontFamily: "'Tajawal', sans-serif" }}>
              يوم متتالي • {progress.totalSolved} تمرين
            </div>
          </div>
        </div>
      </div>

      {/* Domain breakdown */}
      {totalByDomain.length > 0 && (
        <div style={{ padding: "12px 14px", borderBottom: "1px solid hsl(var(--border))" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            المجالات
          </p>
          {totalByDomain.map(({ domain, count, pct }) => {
            const info = DOMAIN_INFO[domain];
            return (
              <div key={domain} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: "'Tajawal', sans-serif", color: info.color, fontWeight: 600 }}>
                    {info.emoji} {info.label}
                  </span>
                  <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{count}</span>
                </div>
                <div style={{ height: 5, background: "hsl(var(--muted))", borderRadius: 99, overflow: "hidden" }}>
                  <motion.div
                    style={{ height: "100%", background: info.color, borderRadius: 99 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flashcard review mode */}
      {due.length > 0 && (() => {
        const [cardIdx, setCardIdx] = (window as any).__fc_state ?? (() => {
          (window as any).__fc_state = [0, (v: number) => { (window as any).__fc_state[0] = v; }];
          return (window as any).__fc_state;
        })();
        const card = due[0];
        const info = DOMAIN_INFO[card.domain];
        return (
          <div style={{ padding: "10px 14px", borderBottom: "1px solid hsl(var(--border))", background: "#FFF1F2" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#E11D48", margin: 0 }}>
                🔔 مراجعة متباعدة ({due.length})
              </p>
              <span style={{ fontSize: 10, color: "#6b7280" }}>SM-2</span>
            </div>
            <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #FDA4AF", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: info.color, fontWeight: 700, marginBottom: 4 }}>
                {info.emoji} {info.label}
              </div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, fontFamily: "'Tajawal', sans-serif" }}>
                {card.input.slice(0, 80)}{card.input.length > 80 ? "…" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onSelectExercise?.(card.input, card.domain)}
                style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "#4F46E5", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}
              >
                حلّه الآن ↗
              </button>
              <button
                onClick={() => { /* mark as snoozed for 1 day */ }}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", fontSize: 11, color: "#6b7280", cursor: "pointer" }}
                title="تأجيل"
              >⏰</button>
            </div>
          </div>
        );
      })()}

      {/* Recent history */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          السجل
        </p>
        {progress.records.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "20px 10px",
            border: "1px dashed hsl(var(--border))",
            borderRadius: 10,
            color: "hsl(var(--muted-foreground))",
            fontSize: 12,
            fontFamily: "'Tajawal', sans-serif",
          }}>
            لا يوجد سجل بعد
          </div>
        ) : (
          progress.records.slice(0, 20).map(r => {
            const info = DOMAIN_INFO[r.domain];
            return (
              <button
                key={r.id}
                onClick={() => onSelectExercise?.(r.input, r.domain)}
                style={{
                  width: "100%",
                  textAlign: "right",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "transparent",
                  cursor: "pointer",
                  marginBottom: 5,
                  display: "block",
                  fontFamily: "'Tajawal', sans-serif",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted)/0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: r.correct ? "#34D399" : "#F87171",
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, color: info.color, fontWeight: 700 }}>
                    {info.emoji} {info.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.input.slice(0, 28)}...
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid hsl(var(--border))",
        fontSize: 10,
        color: "hsl(var(--muted-foreground))",
        textAlign: "center",
        fontFamily: "'Nunito', sans-serif",
      }}>
        QED v2.0 — SOTA Engine
      </div>
    </div>
  );
}
