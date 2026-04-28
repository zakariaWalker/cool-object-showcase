// ═══════════════════════════════════════════════════════════════
// QED Logo — Academic identity
// A serif wordmark with a small burgundy "Q.E.D." square mark,
// inspired by classical mathematics journal frontispieces.
// ═══════════════════════════════════════════════════════════════

interface QEDLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Hide the Arabic tagline below the wordmark */
  compact?: boolean;
  /** Force inverted colors (for dark surfaces) */
  inverted?: boolean;
  /** Render only the square mark (no wordmark/tagline) */
  markOnly?: boolean;
}

const SIZES = {
  sm: { mark: 22, wordmark: 18, tagline: 9, gap: 8 },
  md: { mark: 28, wordmark: 22, tagline: 10, gap: 10 },
  lg: { mark: 36, wordmark: 28, tagline: 11, gap: 12 },
  xl: { mark: 48, wordmark: 38, tagline: 13, gap: 14 },
} as const;

export function QEDLogo({ size = "md", className = "", compact = false, inverted = false, markOnly = false }: QEDLogoProps) {
  const dims = SIZES[size];
  const ink = inverted ? "hsl(var(--background))" : "hsl(var(--primary))";
  const accent = "hsl(var(--accent))";
  const muted = inverted ? "hsl(var(--background) / 0.65)" : "hsl(var(--muted-foreground))";

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ gap: dims.gap, direction: "ltr" }}
      aria-label="QED — منصة الرياضيات الأكاديمية"
    >
      {/* Mark — bordered square with serif Q and a small burgundy proof tick */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: dims.mark,
          height: dims.mark,
          border: `1.5px solid ${ink}`,
          borderRadius: 3,
        }}
      >
        <span
          style={{
            fontFamily: "'Fraunces', 'Amiri', Georgia, serif",
            fontWeight: 600,
            fontSize: dims.mark * 0.62,
            lineHeight: 1,
            color: ink,
            fontVariationSettings: '"opsz" 144',
            letterSpacing: "-0.04em",
          }}
        >
          Q
        </span>
        {/* Burgundy proof-tick — the "∎" end-of-proof symbol */}
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: Math.max(5, dims.mark * 0.18),
            height: Math.max(5, dims.mark * 0.18),
            background: accent,
            borderRadius: 1,
          }}
        />
      </div>

      {/* Wordmark */}
      {!markOnly && (
        <div className="flex flex-col" style={{ lineHeight: 1, direction: "ltr" }}>
          <span
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600,
              fontSize: dims.wordmark,
              color: ink,
              letterSpacing: "-0.025em",
              fontVariationSettings: '"opsz" 144',
            }}
          >
            QED
          </span>
          {!compact && (
            <span
              style={{
                fontFamily: "'Tajawal', sans-serif",
                fontWeight: 500,
                fontSize: dims.tagline,
                color: muted,
                marginTop: 2,
                direction: "rtl",
                letterSpacing: 0,
              }}
            >
              المحرّك الرياضي
            </span>
          )}
        </div>
      )}
    </div>
  );
}
