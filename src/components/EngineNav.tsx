import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { ApiKeyModal } from "./ApiKeyModal";
import { getApiKey } from "@/engine/ai-layer";

const NAV_ITEMS = [
  { path: "/",           label: "التمارين",  emoji: "📝", colorVar: "--algebra" },
  { path: "/algebra",    label: "الجبر",     emoji: "🔢", colorVar: "--algebra" },
  { path: "/geometry",   label: "الهندسة",   emoji: "📐", colorVar: "--geometry" },
  { path: "/statistics", label: "الإحصاء",   emoji: "📊", colorVar: "--statistics" },
  { path: "/probability",label: "الاحتمال",  emoji: "🎲", colorVar: "--probability" },
  { path: "/functions",  label: "الدوال",    emoji: "📈", colorVar: "--functions" },
];

export function EngineNav() {
  const location = useLocation();
  const [showApiModal, setShowApiModal] = useState(false);
  const hasKey = !!getApiKey();

  return (
    <>
      <nav
        dir="rtl"
        className="flex items-center gap-1 px-3 py-2 overflow-x-auto border-b border-border bg-card"
        style={{
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span className="text-lg font-black text-primary" style={{
            fontFamily: "'Tajawal', sans-serif",
            letterSpacing: "-0.5px",
          }}>
            QED
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold flex-shrink-0">
            SOTA v2
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1 flex-shrink-0" />

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
                color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                background: isActive
                  ? `hsl(var(${item.colorVar}))`
                  : "transparent",
                border: isActive ? `1px solid hsl(var(${item.colorVar}) / 0.5)` : "1px solid transparent",
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
            border: hasKey ? "1px solid hsl(var(--geometry) / 0.4)" : "1px dashed hsl(var(--border))",
            background: hasKey ? "hsl(var(--geometry) / 0.12)" : "transparent",
            color: hasKey ? "hsl(var(--geometry))" : "hsl(var(--muted-foreground))",
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
