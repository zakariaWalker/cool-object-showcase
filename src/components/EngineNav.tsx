import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ApiKeyModal } from "./ApiKeyModal";
import { getApiKey } from "@/engine/ai-layer";

const NAV_ITEMS = [
  { path: "/",           label: "التمارين",  emoji: "📝", color: "#7B75CC" },
  { path: "/algebra",    label: "الجبر",     emoji: "🔢", color: "#7B75CC" },
  { path: "/geometry",   label: "الهندسة",   emoji: "📐", color: "#4DA88D" },
  { path: "/statistics", label: "الإحصاء",   emoji: "📊", color: "#C49A4A" },
  { path: "/probability",label: "الاحتمال",  emoji: "🎲", color: "#9B7BC4" },
  { path: "/functions",  label: "الدوال",    emoji: "📈", color: "#C46B7E" },
];

export function EngineNav() {
  const location = useLocation();
  const [showApiModal, setShowApiModal] = useState(false);
  const hasKey = !!getApiKey();

  return (
    <>
      <nav
        dir="rtl"
        style={{
          background: "linear-gradient(135deg, #2D2A50 0%, #3D3A6A 100%)",
          boxShadow: "0 2px 16px rgba(79,70,229,0.12)",
          flexShrink: 0,
        }}
        className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
      >
        {/* Brand */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span style={{
            background: "linear-gradient(135deg, #9BA3E0, #C9A8E0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: 18,
            fontWeight: 900,
            fontFamily: "'Tajawal', sans-serif",
            letterSpacing: "-0.5px",
          }}>
            QED
          </span>
          <span style={{
            fontSize: 10,
            background: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.6)",
            padding: "2px 6px",
            borderRadius: 99,
            fontWeight: 600,
            flexShrink: 0,
          }}>
            SOTA v2
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)", margin: "0 4px", flexShrink: 0 }} />

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-shrink-0"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'Tajawal', sans-serif",
                color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                background: isActive
                  ? `linear-gradient(135deg, ${item.color}cc, ${item.color}99)`
                  : "transparent",
                border: isActive ? `1px solid ${item.color}88` : "1px solid transparent",
                transition: "all 0.2s ease",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 14 }}>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: 8 }} />

        {/* API key button */}
        <button
          onClick={() => setShowApiModal(true)}
          className="flex-shrink-0"
          style={{
            fontSize: 11,
            padding: "5px 10px",
            borderRadius: 8,
            border: hasKey ? "1px solid rgba(52,211,153,0.4)" : "1px dashed rgba(255,255,255,0.25)",
            background: hasKey ? "rgba(52,211,153,0.12)" : "transparent",
            color: hasKey ? "#34D399" : "rgba(255,255,255,0.4)",
            cursor: "pointer",
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {hasKey ? "✦ NIM AI ●" : "+ NIM AI"}
        </button>
      </nav>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </>
  );
}
