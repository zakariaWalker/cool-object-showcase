// ═══ QED Logo — consistent brand mark across the app ═══
export function QEDLogo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const dims = { sm: { box: 28, font: 11, dot: 3 }, md: { box: 36, font: 14, dot: 4 }, lg: { box: 48, font: 19, dot: 5 }, xl: { box: 64, font: 26, dot: 7 } }[size];
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: dims.box, height: dims.box,
          background: "linear-gradient(135deg, hsl(var(--algebra)), hsl(var(--probability)))",
          boxShadow: "0 2px 12px hsl(var(--algebra) / 0.35)",
        }}
      >
        <span
          className="font-black text-white tracking-tight"
          style={{ fontSize: dims.font, fontFamily: "'Nunito', sans-serif", lineHeight: 1 }}
        >
          Q
        </span>
        <span
          className="absolute rounded-full"
          style={{
            width: dims.dot, height: dims.dot,
            bottom: dims.dot, right: dims.dot,
            background: "hsl(var(--accent))",
            boxShadow: "0 0 6px hsl(var(--accent) / 0.6)",
          }}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-black tracking-tight"
          style={{
            fontSize: dims.font,
            fontFamily: "'Nunito', sans-serif",
            background: "linear-gradient(to left, hsl(var(--algebra)), hsl(var(--probability)))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          QED
        </span>
        <span
          className="text-muted-foreground font-bold"
          style={{ fontSize: Math.max(8, dims.font * 0.55) }}
        >
          المحرّك الرياضي
        </span>
      </div>
    </div>
  );
}
