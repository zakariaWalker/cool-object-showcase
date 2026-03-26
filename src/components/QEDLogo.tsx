// ═══ QED Logo — consistent brand mark across the app ═══
export function QEDLogo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const dims = { sm: { box: 28, font: 11, dot: 3 }, md: { box: 36, font: 14, dot: 4 }, lg: { box: 48, font: 19, dot: 5 }, xl: { box: 64, font: 26, dot: 7 } }[size];
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: dims.box, height: dims.box,
          background: "linear-gradient(135deg, hsl(243 75% 58%), hsl(277 65% 52%))",
          boxShadow: "0 2px 12px rgba(99,67,196,.35)",
        }}
      >
        <span
          className="font-black text-white tracking-tight"
          style={{ fontSize: dims.font, fontFamily: "'Nunito', sans-serif", lineHeight: 1 }}
        >
          Q
        </span>
        <span
          className="absolute rounded-full bg-accent"
          style={{
            width: dims.dot, height: dims.dot,
            bottom: dims.dot, right: dims.dot,
            boxShadow: "0 0 6px hsl(38 92% 50% / .6)",
          }}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-black tracking-tight bg-gradient-to-l from-primary to-purple-500 bg-clip-text text-transparent"
          style={{ fontSize: dims.font, fontFamily: "'Nunito', sans-serif" }}
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
