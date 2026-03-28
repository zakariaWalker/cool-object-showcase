// ═══ QED Logo — consistent brand mark across the app ═══
export function QEDLogo({ size = "md", className = "", white = false }: { size?: "sm" | "md" | "lg" | "xl"; className?: string; white?: boolean }) {
  const dims = { 
    sm: { box: 28, font: 11, dot: 3 }, 
    md: { box: 36, font: 14, dot: 4 }, 
    lg: { box: 48, font: 19, dot: 5 }, 
    xl: { box: 64, font: 26, dot: 7 } 
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-lg overflow-hidden"
        style={{
          width: dims.box, height: dims.box,
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--algebra)))",
          boxShadow: white ? "0 4px 20px rgba(255,255,255,0.1)" : "0 2px 12px hsl(var(--algebra) / 0.35)",
        }}
      >
        <span
          className="font-black text-white tracking-tight"
          style={{ fontSize: dims.font, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}
        >
          Q
        </span>
        <div
          className="absolute rounded-full"
          style={{
            width: dims.dot, height: dims.dot,
            bottom: dims.dot, right: dims.dot,
            background: "hsl(var(--accent))",
            boxShadow: "0 0 8px hsl(var(--accent))",
          }}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-black tracking-tighter"
          style={{
            fontSize: dims.font,
            fontFamily: "'Inter', sans-serif",
            color: white ? "white" : "transparent",
            background: white ? "none" : "linear-gradient(to left, hsl(var(--algebra)), hsl(var(--probability)))",
            WebkitBackgroundClip: white ? "none" : "text",
            WebkitTextFillColor: white ? "white" : "transparent",
          }}
        >
          QED
        </span>
        <span
          className={white ? "text-white/40 font-black" : "text-muted-foreground font-bold"}
          style={{ 
            fontSize: Math.max(7, dims.font * 0.5),
            letterSpacing: "0.05em"
          }}
        >
          المحرّك الرياضي
        </span>
      </div>
    </div>
  );
}
